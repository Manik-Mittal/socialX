begin;
-- Existing accounts choose their username in Edit profile; IDs remain unchanged.
alter table public.profiles add column username text;
alter table public.profiles add constraint profiles_username_format check (username is null or username ~ '^[a-z0-9_]{3,24}$');
alter table public.profiles add constraint profiles_username_unique unique (username);
grant update (username) on public.profiles to authenticated;
create or replace function public.socialx_create_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare chosen text := lower(btrim(new.raw_user_meta_data ->> 'username'));
begin
  if chosen is null or chosen !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Choose a username of 3-24 letters, numbers or underscores.';
  end if;
  insert into public.profiles (id, display_name, username)
  values (new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 'Creator'), 40), chosen);
  return new;
end;
$$;
revoke all on function public.socialx_create_profile() from public, anon, authenticated;
-- Only a boolean is exposed before login; no email or profile records.
create function public.username_available(candidate text)
returns boolean language sql stable security definer set search_path = '' as $$
  select lower(btrim(candidate)) ~ '^[a-z0-9_]{3,24}$' and not exists (
    select 1 from public.profiles p where p.username = lower(btrim(candidate))
    and p.id is distinct from auth.uid()
  );
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;
create function public.search_people(query_text text, page_offset integer default 0, exclude_id uuid default null)
returns table (id uuid, display_name text, bio text, username text)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.display_name, p.bio, p.username from public.profiles p
  where char_length(btrim(query_text)) >= 2 and (exclude_id is null or p.id <> exclude_id)
    and (position(lower(btrim(query_text)) in lower(p.display_name)) > 0
      or (char_length(ltrim(btrim(query_text), '@')) > 0 and position(lower(ltrim(btrim(query_text), '@')) in p.username) > 0))
  order by p.display_name, p.id limit 30 offset greatest(page_offset, 0);
$$;
revoke all on function public.search_people(text, integer, uuid) from public, anon;
grant execute on function public.search_people(text, integer, uuid) to authenticated;
commit;
