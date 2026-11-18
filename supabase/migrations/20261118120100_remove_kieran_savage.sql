-- Remove Kieran Savage from the Predictor League
--
-- HOW TO RUN
-- Run this in the Supabase SQL editor AFTER 20261118120000_lock_in_and_scoring.sql.
-- It is safe to run more than once. If he is not in the database, nothing is deleted.
--
-- WHO IT MATCHES
-- A user whose id is exactly "kieran", or whose name is exactly "Kieran Savage"
-- ignoring capital letters and surrounding spaces. Nobody else matches.
--
-- WHAT IT DELETES
-- 1. His predictions: every draft and locked scoreline stored for him, including
--    any points_awarded saved on those rows. This does not change anyone else's picks.
-- 2. His published picks: the locked scorelines other players could see, and any
--    points stored on those rows.
-- 3. His week entries: the record that he had locked a week.
-- 4. His sessions: any login tokens, if that private table exists.
-- 5. His user row: name, colour, avatar, password, wildcard flag, admin flag,
--    and his season points. He disappears from the league table.
--    Other players keep the points they already have. Nothing is added or
--    subtracted from their totals.
--
-- This script does not delete fixtures, final scores, or any other player.

begin;

do $$
declare
  ids text[];
  removed_predictions integer := 0;
  removed_published integer := 0;
  removed_entries integer := 0;
  removed_sessions integer := 0;
  removed_users integer := 0;
begin
  select array_agg(id) into ids
  from public.users
  where id = 'kieran'
     or lower(btrim(name)) = 'kieran savage';

  if ids is null then
    raise notice 'No Kieran Savage user found. Nothing deleted.';
    return;
  end if;

  delete from public.predictions where user_id = any(ids);
  get diagnostics removed_predictions = row_count;

  if to_regclass('public.published_picks') is not null then
    delete from public.published_picks where user_id = any(ids);
    get diagnostics removed_published = row_count;
  end if;

  if to_regclass('public.week_entries') is not null then
    delete from public.week_entries where user_id = any(ids);
    get diagnostics removed_entries = row_count;
  end if;

  if to_regclass('private.sessions') is not null then
    delete from private.sessions where user_id = any(ids);
    get diagnostics removed_sessions = row_count;
  end if;

  delete from public.users where id = any(ids);
  get diagnostics removed_users = row_count;

  raise notice 'Removed Kieran Savage. users=% predictions=% published_picks=% week_entries=% sessions=%',
    removed_users, removed_predictions, removed_published, removed_entries, removed_sessions;
end $$;

commit;
