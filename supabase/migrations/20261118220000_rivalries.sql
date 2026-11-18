-- Head-to-head rivalries. This does not change season points.
--
-- Run this whole file in the Supabase SQL editor with nothing selected,
-- after 20261118210000_week_all_fixtures.sql.
-- A rival can be chosen until that player locks in, or until the deadline.
-- After a week is fully scored, the higher gameweek total is a win.

begin;

create table if not exists public.rivalries (
  user_id text not null references public.users(id) on delete cascade,
  week integer not null,
  rival_id text not null references public.users(id) on delete cascade,
  primary key (user_id, week),
  check (user_id <> rival_id)
);

revoke all on public.rivalries from public, anon, authenticated;

create or replace function private.week_scored(p_week integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.fixtures where week = p_week and hardest)
    and not exists (
      select 1 from public.fixtures
      where week = p_week and hardest and (actual_home is null or actual_away is null)
    );
$$;

create or replace function private.player_json(u public.users)
returns jsonb
language sql
stable
security definer
set search_path = public, private
as $$
  select jsonb_build_object(
    'id', u.id,
    'name', u.name,
    'colour', u.colour,
    'avatar', coalesce(u.avatar, ''),
    'points', coalesce(u.points, 0),
    'wildcard', coalesce(u.wildcard, false),
    'isAdmin', coalesce(u.is_admin, false),
    'sprite', coalesce(nullif(btrim(u.sprite), ''), 'striker'),
    'kitShirt', coalesce(nullif(btrim(u.kit_shirt), ''), nullif(btrim(u.colour), ''), '#94a3b8'),
    'kitShorts', coalesce(nullif(btrim(u.kit_shorts), ''), '#ffffff'),
    'kitSocks', coalesce(nullif(btrim(u.kit_socks), ''), nullif(btrim(u.kit_shirt), ''), nullif(btrim(u.colour), ''), '#94a3b8'),
    'h2h', (
      select jsonb_build_object(
        'wins', count(*) filter (where s.mine > s.theirs),
        'draws', count(*) filter (where s.mine = s.theirs),
        'losses', count(*) filter (where s.mine < s.theirs)
      )
      from (
        select
          coalesce((
            select sum(pp.points_awarded)
            from public.published_picks pp
            where pp.user_id = u.id and pp.week = r.week and pp.points_awarded is not null
          ), 0) as mine,
          coalesce((
            select sum(pp.points_awarded)
            from public.published_picks pp
            where pp.user_id = r.rival_id and pp.week = r.week and pp.points_awarded is not null
          ), 0) as theirs
        from public.rivalries r
        where r.user_id = u.id
          and private.week_scored(r.week)
      ) s
    )
  );
$$;

create or replace function public.set_rival(p_token text, p_rival_id text, p_week integer default null)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor public.users%rowtype;
  week_number integer;
  cutoff timestamptz;
begin
  actor := private.require_user(p_token);
  select coalesce(p_week, current_week) into week_number from public.settings where id = 1;
  if week_number is null then
    raise exception 'No week is open';
  end if;
  if p_rival_id is not null and btrim(p_rival_id) <> '' and p_rival_id = actor.id then
    raise exception 'Pick someone else';
  end if;
  if p_rival_id is not null and btrim(p_rival_id) <> '' and not exists (
    select 1 from public.users where id = p_rival_id
  ) then
    raise exception 'Player not found';
  end if;
  cutoff := private.deadline(week_number);
  if cutoff is not null and cutoff <= now() then
    raise exception 'The deadline has passed';
  end if;
  if exists (
    select 1 from public.week_entries where user_id = actor.id and week = week_number
  ) then
    raise exception 'Rival is locked for this week';
  end if;
  if p_rival_id is null or btrim(p_rival_id) = '' then
    delete from public.rivalries where user_id = actor.id and week = week_number;
  else
    insert into public.rivalries (user_id, week, rival_id)
    values (actor.id, week_number, p_rival_id)
    on conflict (user_id, week) do update set rival_id = excluded.rival_id;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.load_game(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor public.users%rowtype;
  settings_row public.settings%rowtype;
begin
  perform private.auto_lock_due();
  actor := private.require_user(p_token);
  select * into settings_row from public.settings where id = 1;
  return jsonb_build_object(
    'me', private.player_json(actor),
    'players', coalesce((
      select jsonb_agg(private.player_json(u) order by u.name)
      from public.users u
    ), '[]'::jsonb),
    'fixtures', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'week', f.week,
        'home', f.home,
        'away', f.away,
        'kickoffLabel', coalesce(f.kickoff_label, ''),
        'kickoffAt', f.kickoff_at,
        'hardest', f.hardest,
        'actualHome', f.actual_home,
        'actualAway', f.actual_away
      ) order by f.week, f.id)
      from public.fixtures f
    ), '[]'::jsonb),
    'currentWeek', settings_row.current_week,
    'season', settings_row.season,
    'leagueId', settings_row.league_id,
    'picksRevealed', private.picks_visible(actor, settings_row.current_week),
    'revealedWeeks', coalesce((
      select jsonb_agg(w.week order by w.week)
      from (
        select distinct f.week
        from public.fixtures f
        where private.picks_visible(actor, f.week)
      ) w
    ), '[]'::jsonb),
    'weekAllFixtures', coalesce((
      select jsonb_agg(jsonb_build_object('userId', w.user_id, 'week', w.week) order by w.week, w.user_id)
      from public.week_all_fixtures w
    ), '[]'::jsonb),
    'myRival', (
      select r.rival_id from public.rivalries r
      where r.user_id = actor.id and r.week = settings_row.current_week
    ),
    'myPredictions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'fixtureId', p.fixture_id,
        'week', p.week,
        'score', p.score,
        'locked', p.locked,
        'pointsAwarded', p.points_awarded,
        'enteredByAdmin', coalesce(p.entered_by_admin, false)
      ))
      from public.predictions p
      where p.user_id = actor.id
    ), '[]'::jsonb),
    'publishedPicks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'userId', pp.user_id,
        'fixtureId', pp.fixture_id,
        'week', pp.week,
        'score', pp.score,
        'pointsAwarded', pp.points_awarded,
        'lockedAt', pp.locked_at,
        'enteredByAdmin', coalesce(pp.entered_by_admin, false)
      ))
      from public.published_picks pp
      where pp.user_id = actor.id or private.picks_visible(actor, pp.week)
    ), '[]'::jsonb),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'userId', e.user_id,
        'week', e.week,
        'lockedAt', e.locked_at
      ))
      from public.week_entries e
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.set_rival(text, text, integer) from public, anon, authenticated;
grant execute on function public.set_rival(text, text, integer) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
