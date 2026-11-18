-- Admins can enter and lock another player's predictions.
--
-- Run this whole file in the Supabase SQL editor with nothing selected.
-- Safe to run more than once. It does not change season points by itself.
-- If an admin changes a pick that was already scored, the next points
-- calculation (or this function, which calls it) adjusts the difference.

begin;

alter table public.predictions add column if not exists entered_by_admin boolean not null default false;
alter table public.published_picks add column if not exists entered_by_admin boolean not null default false;

create or replace function public.save_prediction(p_token text, p_fixture_id integer, p_score text)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor public.users%rowtype;
  fixture public.fixtures%rowtype;
  canonical text;
  wrote integer;
begin
  actor := private.require_user(p_token);
  select * into fixture from public.fixtures where id = p_fixture_id;
  if not found then
    raise exception 'Fixture not found';
  end if;
  if exists (
    select 1 from public.week_entries
    where user_id = actor.id and week = fixture.week
  ) then
    raise exception 'Predictions are locked for this week';
  end if;
  if coalesce(fixture.hardest, false) = false then
    raise exception 'That fixture is not in this week''s round';
  end if;
  canonical := private.canonical_score(p_score);
  if canonical is null then
    raise exception 'Enter a score like 2-1';
  end if;
  insert into public.predictions (user_id, fixture_id, week, score, locked, entered_by_admin)
  values (actor.id, fixture.id, fixture.week, canonical, false, false)
  on conflict (user_id, fixture_id) do update
    set score = excluded.score,
        week = excluded.week,
        locked = false,
        entered_by_admin = false
    where public.predictions.locked = false;
  get diagnostics wrote = row_count;
  if wrote = 0 then
    raise exception 'Predictions are locked for this week';
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
        'hardest', f.hardest,
        'actualHome', f.actual_home,
        'actualAway', f.actual_away
      ) order by f.week, f.id)
      from public.fixtures f
    ), '[]'::jsonb),
    'currentWeek', settings_row.current_week,
    'season', settings_row.season,
    'leagueId', settings_row.league_id,
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

create or replace function public.admin_load_player_predictions(p_token text, p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  week_number integer;
begin
  perform private.require_admin(p_token);
  if not exists (select 1 from public.users where id = p_user_id) then
    raise exception 'Player not found';
  end if;
  select current_week into week_number from public.settings where id = 1;
  return jsonb_build_object(
    'userId', p_user_id,
    'week', week_number,
    'locked', exists (
      select 1 from public.week_entries where user_id = p_user_id and week = week_number
    ),
    'predictions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'fixtureId', p.fixture_id,
        'score', p.score,
        'locked', p.locked,
        'enteredByAdmin', coalesce(p.entered_by_admin, false)
      ))
      from public.predictions p
      join public.fixtures f on f.id = p.fixture_id
      where p.user_id = p_user_id
        and f.week = week_number
        and f.hardest
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_save_player_predictions(
  p_token text,
  p_user_id text,
  p_scores jsonb,
  p_lock boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  week_number integer;
  already boolean;
  item jsonb;
  fixture public.fixtures%rowtype;
  canonical text;
  missing text;
begin
  perform private.require_admin(p_token);
  if not exists (select 1 from public.users where id = p_user_id) then
    raise exception 'Player not found';
  end if;
  if p_scores is null or jsonb_typeof(p_scores) <> 'array' then
    raise exception 'Scores must be a list';
  end if;
  select current_week into week_number from public.settings where id = 1;
  already := exists (
    select 1 from public.week_entries where user_id = p_user_id and week = week_number
  );

  for item in select value from jsonb_array_elements(p_scores)
  loop
    select * into fixture from public.fixtures where id = (item->>'fixtureId')::integer;
    if not found or fixture.week is distinct from week_number or coalesce(fixture.hardest, false) = false then
      raise exception 'That fixture is not in this week''s round';
    end if;
    canonical := private.canonical_score(item->>'score');
    if canonical is null then
      raise exception 'Enter a score like 2-1';
    end if;
    insert into public.predictions (user_id, fixture_id, week, score, locked, entered_by_admin)
    values (p_user_id, fixture.id, week_number, canonical, false, true)
    on conflict (user_id, fixture_id) do update
      set score = excluded.score,
          week = excluded.week,
          entered_by_admin = true;
  end loop;

  if coalesce(p_lock, false) and not already then
    select string_agg(f.home || ' vs ' || f.away, ', ' order by f.id)
      into missing
    from public.fixtures f
    where f.week = week_number
      and f.hardest
      and not exists (
        select 1 from public.predictions p
        where p.user_id = p_user_id
          and p.fixture_id = f.id
          and private.canonical_score(p.score) is not null
      );
    if missing is not null then
      raise exception 'Add a score for %', missing;
    end if;
    if not exists (select 1 from public.fixtures f where f.week = week_number and f.hardest) then
      raise exception 'There are no fixtures to lock';
    end if;
    insert into public.week_entries (user_id, week, locked_at)
    values (p_user_id, week_number, now());
  end if;

  if coalesce(p_lock, false) or already then
    update public.predictions p
    set locked = true
    from public.fixtures f
    where p.user_id = p_user_id
      and p.fixture_id = f.id
      and f.week = week_number
      and f.hardest
      and (
        (coalesce(p_lock, false) and not already)
        or p.fixture_id in (
          select (value->>'fixtureId')::integer from jsonb_array_elements(p_scores)
        )
      );

    insert into public.published_picks (user_id, fixture_id, week, score, locked_at, entered_by_admin)
    select p.user_id, p.fixture_id, week_number, p.score, now(), coalesce(p.entered_by_admin, false)
    from public.predictions p
    join public.fixtures f on f.id = p.fixture_id
    where p.user_id = p_user_id
      and f.week = week_number
      and f.hardest
      and p.locked = true
      and (
        (coalesce(p_lock, false) and not already)
        or p.fixture_id in (
          select (value->>'fixtureId')::integer from jsonb_array_elements(p_scores)
        )
      )
    on conflict (user_id, fixture_id) do update
      set score = excluded.score,
          entered_by_admin = excluded.entered_by_admin;

    perform private.apply_scoring(week_number);
  end if;

  return jsonb_build_object('ok', true, 'locked', coalesce(p_lock, false) or already);
end;
$$;

revoke all on function public.admin_load_player_predictions(text, text) from public, anon, authenticated;
grant execute on function public.admin_load_player_predictions(text, text) to anon, authenticated;
revoke all on function public.admin_save_player_predictions(text, text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.admin_save_player_predictions(text, text, jsonb, boolean) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
