-- Names, colours, and selected fixtures only.
--
-- Run this whole file in the Supabase SQL editor with nothing selected.
-- Safe to run more than once. It does not change season points.
--
-- Colour already exists on users. This gives it a default for any blank row.
-- Annabel and Sophie get their full names when the stored name is still just
-- the first name, and they stop being wildcards. Everyone predicts only the
-- fixtures an admin has marked as selected.

begin;

alter table public.users add column if not exists colour text;
alter table public.users alter column colour set default '#94a3b8';
update public.users
set colour = '#94a3b8'
where colour is null or btrim(colour) = '';

update public.users
set name = 'Annabel Mackereth'
where id = 'annabel' and lower(btrim(name)) = 'annabel';

update public.users
set name = 'Sophie Brookes'
where id = 'sophie' and lower(btrim(name)) = 'sophie';

update public.users
set wildcard = false
where id in ('annabel', 'sophie');

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
  insert into public.predictions (user_id, fixture_id, week, score, locked)
  values (actor.id, fixture.id, fixture.week, canonical, false)
  on conflict (user_id, fixture_id) do update
    set score = excluded.score,
        week = excluded.week,
        locked = false
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
begin
  actor := private.require_user(p_token);
  select current_week into week_number from public.settings where id = 1;
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

  insert into public.published_picks (user_id, fixture_id, week, score, locked_at)
  select p.user_id, p.fixture_id, week_number, p.score, locked_at
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

notify pgrst, 'reload schema';

commit;
