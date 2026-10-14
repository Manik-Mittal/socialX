begin;
create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (post_id, user_id)
);
create table public.post_comments (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  client_nonce text not null check (char_length(client_nonce) between 10 and 100),
  created_at timestamptz not null default now(),
  unique (user_id, client_nonce)
);
create index post_comments_page on public.post_comments(post_id, id desc);
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
revoke all on public.post_likes, public.post_comments from anon, authenticated;
grant select, insert, delete on public.post_likes to authenticated;
grant select on public.post_comments to authenticated;
grant insert (post_id,user_id,body,client_nonce) on public.post_comments to authenticated;
grant usage on sequence public.post_comments_id_seq to authenticated;
create policy "Read likes" on public.post_likes for select to authenticated using (true);
create policy "Like as yourself" on public.post_likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Unlike as yourself" on public.post_likes for delete to authenticated using (user_id = (select auth.uid()));
create policy "Read comments" on public.post_comments for select to authenticated using (true);
create policy "Comment as yourself" on public.post_comments for insert to authenticated with check (user_id = (select auth.uid()));
create function public.post_engagement(target uuid)
returns table (likes bigint, comments bigint, liked boolean)
language sql stable security invoker set search_path = '' as $$
  select
    (select count(*) from public.post_likes l where l.post_id = p.id),
    (select count(*) from public.post_comments c where c.post_id = p.id),
    exists(select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid())
  from public.posts p where p.id = target;
$$;
revoke all on function public.post_engagement(uuid) from public, anon;
grant execute on function public.post_engagement(uuid) to authenticated;
commit;
