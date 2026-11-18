-- Kick-off deadline, auto-lock, and the times the home countdown uses.
--
-- Run this whole file in the Supabase SQL editor with nothing selected.
-- Safe to run more than once. It does not change season points.
-- Week 11 kick-offs are the real 21–23 November 2026 times, stored in UTC.
-- November in London is GMT, so 15:00 London is 15:00 UTC.
--
-- After the first selected kick-off, picks already typed are locked and
-- published. A player with nothing saved is left alone. Players cannot edit
-- after that. Admins still can, through the admin entry function.

begin;

alter table public.fixtures add column if not exists kickoff_at timestamptz;

update public.fixtures set kickoff_at = timestamptz '2026-11-21 12:30:00+00' where id = 1 and kickoff_at is null;
update public.fixtures set kickoff_at = timestamptz '2026-11-21 15:00:00+00' where id = 2 and kickoff_at is null;
update public.fixtures set kickoff_at = timestamptz '2026-11-21 15:00:00+00' where id = 3 and kickoff_at is null;
update public.fixtures set kickoff_at = timestamptz '2026-11-21 15:00:00+00' where id = 4 and kickoff_at is null;
update public.fixtures set kickoff_at = timestamptz '2026-11-21 15:00:00+00' where id = 5 and kickoff_at is null;
update public.fixtures set kickoff_at = timestamptz '2026-11-21 15:00:00+00' where id = 6 and kickoff_at is null;
update public.fixtures set kickoff_at = timestamptz '2026-11-21 17:30:00+00' where id = 7 and kickoff_at is null;
update public.fixtures set kickoff_at = timestamptz '2026-11-22 14:00:00+00' where id = 8 and kickoff_at is null;
update public.fixtures set kickoff_at = timestamptz '2026-11-22 16:30:00+00' where id = 9 and kickoff_at is null;
update public.fixtures set kickoff_at = timestamptz '2026-11-23 20:00:00+00' where id = 10 and kickoff_at is null;

create or replace function private.deadline(p_week integer)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select min(kickoff_at)
  from public.fixtures
  where week = p_week
    and hardest
    and kickoff_at is not null;
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
      and f.hardest
      and f.kickoff_at is not null
      and f.kickoff_at <= now()
  loop
    update public.predictions p
    set locked = true
    from public.fixtures f
    where p.user_id = rec.user_id
      and p.fixture_id = f.id
      and f.week = rec.week
      and f.hardest
      and p.locked = false
      and f.kickoff_at is not null
      and f.kickoff_at <= now();

    insert into public.week_entries (user_id, week, locked_at)
    values (rec.user_id, rec.week, now())
    on conflict (user_id, week) do nothing;

    insert into public.published_picks (user_id, fixture_id, week, score, locked_at, entered_by_admin)
    select p.user_id, p.fixture_id, rec.week, p.score, now(), coalesce(p.entered_by_admin, false)
    from public.predictions p
    join public.fixtures f on f.id = p.fixture_id
    where p.user_id = rec.user_id
      and f.week = rec.week
      and f.hardest
      and p.locked = true
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
    and f.hardest
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
    where f.week = week_number and f.hardest
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
    and f.hardest;

  insert into public.published_picks (user_id, fixture_id, week, score, locked_at, entered_by_admin)
  select p.user_id, p.fixture_id, week_number, p.score, locked_at, coalesce(p.entered_by_admin, false)
  from public.predictions p
  join public.fixtures f on f.id = p.fixture_id
  where p.user_id = actor.id
    and f.week = week_number
    and f.hardest
    and p.locked = true
  on conflict (user_id, fixture_id) do nothing;

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

drop function if exists public.admin_save_fixture(text, integer, integer, text, text, text, boolean);

create or replace function public.admin_save_fixture(
  p_token text,
  p_id integer,
  p_week integer,
  p_home text,
  p_away text,
  p_kickoff text,
  p_hardest boolean,
  p_kickoff_at text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  new_id integer;
  home_name text := btrim(coalesce(p_home, ''));
  away_name text := btrim(coalesce(p_away, ''));
  kickoff_at timestamptz;
begin
  perform private.require_admin(p_token);
  if home_name = '' or away_name = '' then
    raise exception 'Enter both teams';
  end if;
  if lower(home_name) = lower(away_name) then
    raise exception 'Teams must be different';
  end if;
  if p_week is null or p_week < 1 or p_week > 38 then
    raise exception 'Week must be from 1 to 38';
  end if;
  if p_kickoff_at is not null and btrim(p_kickoff_at) <> '' then
    kickoff_at := btrim(p_kickoff_at)::timestamp at time zone 'Europe/London';
  end if;
  if p_id is null then
    select coalesce(max(id), 0) + 1 into new_id from public.fixtures;
  else
    new_id := p_id;
  end if;
  insert into public.fixtures (id, week, home, away, kickoff_label, hardest, kickoff_at)
  values (new_id, p_week, home_name, away_name, btrim(coalesce(p_kickoff, '')), coalesce(p_hardest, false), kickoff_at)
  on conflict (id) do update
    set week = excluded.week,
        home = excluded.home,
        away = excluded.away,
        kickoff_label = excluded.kickoff_label,
        hardest = excluded.hardest,
        kickoff_at = coalesce(excluded.kickoff_at, public.fixtures.kickoff_at);
  return jsonb_build_object('ok', true, 'id', new_id);
end;
$$;

create or replace function public.scheduled_auto_lock(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
begin
  perform private.require_secret(p_secret);
  perform private.auto_lock_due();
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_save_fixture(text, integer, integer, text, text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.admin_save_fixture(text, integer, integer, text, text, text, boolean, text) to anon, authenticated;
revoke all on function public.scheduled_auto_lock(text) from public, anon, authenticated;
grant execute on function public.scheduled_auto_lock(text) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
