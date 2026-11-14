begin;
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles drop constraint if exists profiles_avatar_owner;
alter table public.profiles add constraint profiles_avatar_owner check (
  avatar_path is null or avatar_path like id::text || '/avatars/%'
);
grant update (avatar_path) on public.profiles to authenticated;
drop policy if exists "Read profile photos" on storage.objects;
create policy "Read profile photos" on storage.objects for select to authenticated
using (bucket_id = 'socialx-media' and exists (
  select 1 from public.profiles p where p.avatar_path = name
));
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='post_likes') then
    alter publication supabase_realtime add table public.post_likes;
  end if;
end $$;
commit;
