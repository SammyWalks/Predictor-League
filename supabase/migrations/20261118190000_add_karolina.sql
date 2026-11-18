-- Add Karolina Bersadska if that id is not already in the league.
--
-- Run this whole file in the Supabase SQL editor with nothing selected.
-- Safe to run more than once. If id "karolina" already exists, this does
-- nothing: her points, password, colour, and name stay as they are.

begin;

insert into public.users (id, name, colour, password, points, wildcard, is_admin)
values ('karolina', 'Karolina Bersadska', '#f97316', 'office', 0, false, false)
on conflict (id) do nothing;

commit;
