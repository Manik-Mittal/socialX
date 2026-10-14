begin;
-- One qualifying view per signed-in viewer per reel, excluding the creator.
create table public.reel_views (
  post_id uuid not null references public.posts(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, viewer_id)
);
alter table public.reel_views enable row level security;
revoke all on public.reel_views from anon, authenticated;

create function public.record_reel_view(target uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  insert into public.reel_views(post_id, viewer_id)
  select p.id, auth.uid() from public.posts p
  where p.id = target and p.media_type = 'video' and p.author_id <> auth.uid()
  on conflict (post_id, viewer_id) do nothing;
end;
$$;
create function public.creator_reel_views(target uuid)
returns bigint language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.posts p where p.id = target and p.author_id = auth.uid() and p.media_type = 'video') then
    raise exception 'Only the reel creator can see view counts' using errcode = '42501';
  end if;
  return (select count(*) from public.reel_views v where v.post_id = target);
end;
$$;
revoke all on function public.record_reel_view(uuid), public.creator_reel_views(uuid) from public, anon;
grant execute on function public.record_reel_view(uuid), public.creator_reel_views(uuid) to authenticated;
commit;
