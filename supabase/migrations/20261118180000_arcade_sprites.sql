-- Arcade sprites and a public top-five board.
--
-- Run this whole file in the Supabase SQL editor with nothing selected.
-- Safe to run more than once. It does not change season points.

begin;

alter table public.users add column if not exists sprite text;
alter table public.users alter column sprite set default 'striker';
update public.users set sprite = 'striker' where sprite is null or btrim(sprite) = '';

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
    'sprite', coalesce(u.sprite, 'striker')
  );
$$;

drop function if exists public.update_profile(text, text, text, text);

create or replace function public.update_profile(
  p_token text,
  p_name text,
  p_colour text,
  p_avatar text,
  p_sprite text default 'striker'
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
  update public.users
  set name = next_name,
      colour = p_colour,
      avatar = left(btrim(coalesce(p_avatar, '')), 500),
      sprite = kit
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
    select name, coalesce(colour, '#94a3b8') as colour, coalesce(points, 0) as points, coalesce(sprite, 'striker') as sprite
    from public.users
    order by points desc, name
    limit 5
  ) t;
$$;

revoke all on function public.update_profile(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.update_profile(text, text, text, text, text) to anon, authenticated;
revoke all on function public.arcade_top_scores() from public, anon, authenticated;
grant execute on function public.arcade_top_scores() to anon, authenticated;

notify pgrst, 'reload schema';

commit;
