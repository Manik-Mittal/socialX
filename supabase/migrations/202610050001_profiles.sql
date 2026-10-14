-- Run once in the SQL Editor of your new SocialX Supabase project.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 160),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, bio) on public.profiles to authenticated;

-- Profiles contain public-facing fields only; email stays in auth.users.
create policy "Signed in users can read profiles"
  on public.profiles for select to authenticated using (true);
create policy "Users can edit their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create function public.socialx_create_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 'Creator'), 40));
  return new;
end;
$$;
revoke all on function public.socialx_create_profile() from public, anon, authenticated;

create trigger socialx_profile_on_signup
after insert on auth.users
for each row execute procedure public.socialx_create_profile();

-- Include accounts created before this migration.
insert into public.profiles (id, display_name)
select id, left(coalesce(nullif(btrim(raw_user_meta_data ->> 'display_name'), ''), 'Creator'), 40)
from auth.users on conflict (id) do nothing;

commit;
