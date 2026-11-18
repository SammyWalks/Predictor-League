-- Kit colours, and hide other players' picks until you lock in.
--
-- Run this whole file in the Supabase SQL editor with nothing selected.
-- Safe to run more than once. It does not change season points.
-- The avatar column is left as it is. update_profile still accepts p_avatar,
-- and leaves the stored avatar alone when that argument is omitted.

begin;

alter table public.users add column if not exists kit_shirt text;
alter table public.users add column if not exists kit_shorts text;
alter table public.users add column if not exists kit_socks text;
alter table public.users alter column kit_shorts set default '#ffffff';

update public.users
set
  kit_shirt = coalesce(nullif(btrim(kit_shirt), ''), nullif(btrim(colour), ''), '#94a3b8'),
  kit_shorts = coalesce(nullif(btrim(kit_shorts), ''), '#ffffff'),
  kit_socks = coalesce(nullif(btrim(kit_socks), ''), nullif(btrim(kit_shirt), ''), nullif(btrim(colour), ''), '#94a3b8')
where kit_shirt is null or btrim(kit_shirt) = ''
   or kit_shorts is null or btrim(kit_shorts) = ''
   or kit_socks is null or btrim(kit_socks) = '';

create or replace function private.player_json(u public.users)
returns jsonb
language sql
stable
security definer
set search_path = public
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
    'kitSocks', coalesce(nullif(btrim(u.kit_socks), ''), nullif(btrim(u.kit_shirt), ''), nullif(btrim(u.colour), ''), '#94a3b8')
  );
$$;

create or replace function private.picks_visible(actor public.users, week_number integer)
returns boolean
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  selected_count integer;
  scored_count integer;
  deadline timestamptz;
begin
  if week_number is null then
    return false;
  end if;
  if coalesce(actor.is_admin, false) then
    return true;
  end if;
  if exists (
    select 1 from public.week_entries e
    where e.user_id = actor.id and e.week = week_number
  ) then
    return true;
  end if;
  select count(*) into selected_count
  from public.fixtures f
  where f.week = week_number and f.hardest;
  select count(*) into scored_count
  from public.fixtures f
  where f.week = week_number
    and f.hardest
    and f.actual_home is not null
    and f.actual_away is not null;
  if selected_count > 0 and scored_count = selected_count then
    return true;
  end if;
  select min(f.kickoff_at) into deadline
  from public.fixtures f
  where f.week = week_number and f.hardest and f.kickoff_at is not null;
  if deadline is not null and now() >= deadline then
    return true;
  end if;
  return false;
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

drop function if exists public.update_profile(text, text, text, text);
drop function if exists public.update_profile(text, text, text, text, text);

create or replace function public.update_profile(
  p_token text,
  p_name text,
  p_colour text,
  p_avatar text default null,
  p_sprite text default 'striker',
  p_shirt text default null,
  p_shorts text default null,
  p_socks text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor public.users%rowtype;
  next_name text := btrim(coalesce(p_name, ''));
  kit text := btrim(coalesce(p_sprite, 'striker'));
  shirt text := nullif(btrim(coalesce(p_shirt, '')), '');
  shorts text := nullif(btrim(coalesce(p_shorts, '')), '');
  socks text := nullif(btrim(coalesce(p_socks, '')), '');
begin
  actor := private.require_user(p_token);
  if length(next_name) < 2 or length(next_name) > 80 then
    raise exception 'Name is too short';
  end if;
  if p_colour !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'Pick a colour';
  end if;
  if kit not in ('striker', 'keeper', 'winger', 'captain', 'wall') then
    raise exception 'Pick a kit';
  end if;
  if shirt is not null and shirt !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'Pick a shirt colour';
  end if;
  if shorts is not null and shorts !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'Pick a shorts colour';
  end if;
  if socks is not null and socks !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'Pick a socks colour';
  end if;
  update public.users
  set name = next_name,
      colour = p_colour,
      avatar = case when p_avatar is null then avatar else left(btrim(p_avatar), 500) end,
      sprite = kit,
      kit_shirt = coalesce(shirt, kit_shirt),
      kit_shorts = coalesce(shorts, kit_shorts),
      kit_socks = coalesce(socks, kit_socks)
  where id = actor.id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.arcade_top_scores()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(row_to_json(t) order by t.points desc, t.name), '[]'::jsonb)
  from (
    select
      name,
      coalesce(colour, '#94a3b8') as colour,
      coalesce(points, 0) as points,
      coalesce(nullif(btrim(sprite), ''), 'striker') as sprite,
      coalesce(nullif(btrim(kit_shirt), ''), colour, '#94a3b8') as "kitShirt",
      coalesce(nullif(btrim(kit_shorts), ''), '#ffffff') as "kitShorts",
      coalesce(nullif(btrim(kit_socks), ''), nullif(btrim(kit_shirt), ''), colour, '#94a3b8') as "kitSocks"
    from public.users
    order by points desc, name
    limit 5
  ) t;
$$;

revoke all on function public.update_profile(text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.update_profile(text, text, text, text, text, text, text, text) to anon, authenticated;
revoke all on function public.arcade_top_scores() from public, anon, authenticated;
grant execute on function public.arcade_top_scores() to anon, authenticated;

-- Direct reads of published_picks would skip the lock-in rule. The app loads
-- picks through load_game, which is security definer and applies the filter.
drop policy if exists "locked picks are public" on public.published_picks;
revoke select on public.published_picks from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;
