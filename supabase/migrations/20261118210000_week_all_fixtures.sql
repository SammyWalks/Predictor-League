-- Week 11 joiners may predict every fixture that week.
--
-- Run this whole file in the Supabase SQL editor with nothing selected.
-- Safe to run more than once. It does not change season points.
-- Annabel, Karolina and Sophie are listed for week 11 only. From week 12
-- the table has no rows, so everyone predicts the selected games again.
-- Karolina must already exist (20261118190000_add_karolina.sql). If she
-- does not, re-run this file after she is added.

begin;

create table if not exists public.week_all_fixtures (
  user_id text not null references public.users(id) on delete cascade,
  week integer not null,
  primary key (user_id, week)
);

insert into public.week_all_fixtures (user_id, week)
select u.id, 11
from public.users u
where u.id in ('annabel', 'karolina', 'sophie')
on conflict (user_id, week) do nothing;

revoke all on public.week_all_fixtures from public, anon, authenticated;

create or replace function private.plays_all(p_user_id text, p_week integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.week_all_fixtures
    where user_id = p_user_id and week = p_week
  );
$$;

create or replace function private.auto_lock_due()
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  rec record;
begin
  for rec in
    select distinct p.user_id, f.week
    from public.predictions p
    join public.fixtures f on f.id = p.fixture_id
    where p.locked = false
      and f.kickoff_at is not null
      and f.kickoff_at <= now()
      and (f.hardest or private.plays_all(p.user_id, f.week))
  loop
    update public.predictions p
    set locked = true
    from public.fixtures f
    where p.user_id = rec.user_id
      and p.fixture_id = f.id
      and f.week = rec.week
      and p.locked = false
      and (f.hardest or private.plays_all(p.user_id, f.week));

    insert into public.week_entries (user_id, week, locked_at)
    values (rec.user_id, rec.week, now())
    on conflict (user_id, week) do nothing;

    insert into public.published_picks (user_id, fixture_id, week, score, locked_at, entered_by_admin)
    select p.user_id, p.fixture_id, rec.week, p.score, now(), coalesce(p.entered_by_admin, false)
    from public.predictions p
    join public.fixtures f on f.id = p.fixture_id
    where p.user_id = rec.user_id
      and f.week = rec.week
      and p.locked = true
      and (f.hardest or private.plays_all(p.user_id, f.week))
    on conflict (user_id, fixture_id) do nothing;
  end loop;
end;
$$;

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
  cutoff timestamptz;
begin
  perform private.auto_lock_due();
  actor := private.require_user(p_token);
  select * into fixture from public.fixtures where id = p_fixture_id;
  if not found then
    raise exception 'Fixture not found';
  end if;
  cutoff := private.deadline(fixture.week);
  if cutoff is not null and cutoff <= now() then
    raise exception 'The deadline has passed';
  end if;
  if exists (
    select 1 from public.week_entries
    where user_id = actor.id and week = fixture.week
  ) then
    raise exception 'Predictions are locked for this week';
  end if;
  if coalesce(fixture.hardest, false) = false and not private.plays_all(actor.id, fixture.week) then
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

create or replace function public.lock_predictions(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor public.users%rowtype;
  week_number integer;
  missing text;
  locked_at timestamptz := now();
  cutoff timestamptz;
begin
  perform private.auto_lock_due();
  actor := private.require_user(p_token);
  select current_week into week_number from public.settings where id = 1;
  cutoff := private.deadline(week_number);
  if cutoff is not null and cutoff <= now() then
    raise exception 'The deadline has passed';
  end if;
  perform pg_advisory_xact_lock(hashtext(actor.id), week_number);
  if exists (
    select 1 from public.week_entries where user_id = actor.id and week = week_number
  ) then
    raise exception 'Predictions are already locked';
  end if;

  select string_agg(f.home || ' vs ' || f.away, ', ' order by f.id)
    into missing
  from public.fixtures f
  where f.week = week_number
    and (f.hardest or private.plays_all(actor.id, week_number))
    and not exists (
      select 1 from public.predictions p
      where p.user_id = actor.id
        and p.fixture_id = f.id
        and private.canonical_score(p.score) is not null
    );
  if missing is not null then
    raise exception 'Add a score for %', missing;
  end if;
  if not exists (
    select 1 from public.fixtures f
    where f.week = week_number
      and (f.hardest or private.plays_all(actor.id, week_number))
  ) then
    raise exception 'There are no fixtures to lock';
  end if;

  insert into public.week_entries (user_id, week, locked_at)
  values (actor.id, week_number, locked_at);

  update public.predictions p
  set locked = true, week = week_number
  from public.fixtures f
  where p.user_id = actor.id
    and p.fixture_id = f.id
    and f.week = week_number
    and (f.hardest or private.plays_all(actor.id, week_number));

  insert into public.published_picks (user_id, fixture_id, week, score, locked_at, entered_by_admin)
  select p.user_id, p.fixture_id, week_number, p.score, locked_at, coalesce(p.entered_by_admin, false)
  from public.predictions p
  join public.fixtures f on f.id = p.fixture_id
  where p.user_id = actor.id
    and f.week = week_number
    and p.locked = true
    and (f.hardest or private.plays_all(actor.id, week_number))
  on conflict (user_id, fixture_id) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function private.apply_scoring(p_week integer)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  rec record;
  pts integer;
  delta integer;
  updated_count integer := 0;
  unchanged_count integer := 0;
  skipped_count integer := 0;
  points_added integer := 0;
begin
  if p_week is null then
    raise exception 'Week is required';
  end if;
  perform pg_advisory_xact_lock(842110, p_week);

  for rec in
    select
      pp.id,
      pp.user_id,
      pp.fixture_id,
      pp.score,
      pp.points_awarded,
      f.actual_home,
      f.actual_away
    from public.published_picks pp
    join public.fixtures f on f.id = pp.fixture_id
    where pp.week = p_week
      and (f.hardest or private.plays_all(pp.user_id, pp.week))
    for update of pp
  loop
    if rec.actual_home is null or rec.actual_away is null then
      if rec.points_awarded is not null then
        update public.users
          set points = coalesce(points, 0) - rec.points_awarded
          where id = rec.user_id;
        update public.published_picks
          set points_awarded = null, scored_at = null
          where id = rec.id;
        update public.predictions
          set points_awarded = null, scored_at = null
          where user_id = rec.user_id and fixture_id = rec.fixture_id;
        points_added := points_added - rec.points_awarded;
        updated_count := updated_count + 1;
      else
        skipped_count := skipped_count + 1;
      end if;
      continue;
    end if;

    pts := private.points_for(rec.score, rec.actual_home, rec.actual_away);
    if pts is null then
      skipped_count := skipped_count + 1;
      continue;
    end if;
    if rec.points_awarded is not distinct from pts then
      unchanged_count := unchanged_count + 1;
      continue;
    end if;

    delta := pts - coalesce(rec.points_awarded, 0);
    update public.users
      set points = coalesce(points, 0) + delta
      where id = rec.user_id;
    update public.published_picks
      set points_awarded = pts, scored_at = now()
      where id = rec.id;
    update public.predictions
      set points_awarded = pts, scored_at = now(), locked = true
      where user_id = rec.user_id and fixture_id = rec.fixture_id;
    points_added := points_added + delta;
    updated_count := updated_count + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'week', p_week,
    'updated', updated_count,
    'unchanged', unchanged_count,
    'skipped', skipped_count,
    'pointsAdded', points_added
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
        and (f.hardest or private.plays_all(p_user_id, week_number))
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
    if not found or fixture.week is distinct from week_number
       or (coalesce(fixture.hardest, false) = false and not private.plays_all(p_user_id, week_number)) then
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
      and (f.hardest or private.plays_all(p_user_id, week_number))
      and not exists (
        select 1 from public.predictions p
        where p.user_id = p_user_id
          and p.fixture_id = f.id
          and private.canonical_score(p.score) is not null
      );
    if missing is not null then
      raise exception 'Add a score for %', missing;
    end if;
    if not exists (
      select 1 from public.fixtures f
      where f.week = week_number and (f.hardest or private.plays_all(p_user_id, week_number))
    ) then
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
      and (f.hardest or private.plays_all(p_user_id, week_number))
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
      and p.locked = true
      and (f.hardest or private.plays_all(p_user_id, week_number))
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

notify pgrst, 'reload schema';

commit;
