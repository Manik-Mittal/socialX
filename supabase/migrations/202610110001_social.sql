-- Run ONCE after 202610050001_profiles.sql in Supabase SQL Editor.
begin;
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 70),
  description text not null default '' check (char_length(description) <= 240),
  city text not null check (char_length(btrim(city)) between 1 and 40),
  category text not null check (category in ('Food','Places','Fashion','Beauty','Tech','Events','Skills')),
  media_path text not null unique,
  media_type text not null check (media_type in ('image','video')),
  created_at timestamptz not null default now(),
  check (media_path like author_id::text || '/%')
);
create index posts_recent on public.posts(created_at desc, id);
create index posts_author on public.posts(author_id, created_at desc);
create table public.saved_posts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index saved_posts_post on public.saved_posts(post_id);
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_target on public.follows(following_id);
alter table public.posts enable row level security;
alter table public.saved_posts enable row level security;
alter table public.follows enable row level security;
revoke all on public.posts, public.saved_posts, public.follows from anon, authenticated;
grant select, insert, delete on public.posts, public.saved_posts, public.follows to authenticated;
create policy "Read published posts" on public.posts for select to authenticated using (true);
create policy "Publish own posts" on public.posts for insert to authenticated with check (
  author_id = (select auth.uid()) and exists (
    select 1 from storage.objects o where o.bucket_id = 'socialx-media' and o.name = media_path
  )
);
create policy "Delete own posts" on public.posts for delete to authenticated using (author_id = (select auth.uid()));
create policy "Read own saves" on public.saved_posts for select to authenticated using (user_id = (select auth.uid()));
create policy "Save for yourself" on public.saved_posts for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Remove own saves" on public.saved_posts for delete to authenticated using (user_id = (select auth.uid()));
create policy "Read follows" on public.follows for select to authenticated using (true);
create policy "Follow as yourself" on public.follows for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "Unfollow as yourself" on public.follows for delete to authenticated using (follower_id = (select auth.uid()));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('socialx-media', 'socialx-media', false, 26214400,
  array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime']);
create policy "Upload media to own folder" on storage.objects for insert to authenticated
with check (bucket_id = 'socialx-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Read social media" on storage.objects for select to authenticated
using (bucket_id = 'socialx-media' and (
  (storage.foldername(name))[1] = (select auth.uid())::text
  or exists (select 1 from public.posts p where p.media_path = name)
));
create policy "Remove own media" on storage.objects for delete to authenticated
using (bucket_id = 'socialx-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
commit;
