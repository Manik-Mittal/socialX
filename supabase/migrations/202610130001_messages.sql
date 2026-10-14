-- Run once after the profiles and social migrations.
begin;
create table public.messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  client_nonce text not null check (char_length(client_nonce) between 10 and 100),
  body text not null default '' check (char_length(body) <= 2000),
  kind text not null check (kind in ('text', 'reel')),
  post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (sender_id, client_nonce),
  check (sender_id <> recipient_id),
  check (kind = 'reel' or (char_length(btrim(body)) > 0 and post_id is null))
);
create index messages_sender on public.messages(sender_id, id desc);
create index messages_recipient on public.messages(recipient_id, id desc);
create index messages_pair on public.messages(least(sender_id,recipient_id), greatest(sender_id,recipient_id), id desc);
alter table public.messages enable row level security;
revoke all on public.messages from anon, authenticated;
grant select on public.messages to authenticated;
grant insert (sender_id,recipient_id,client_nonce,body,kind,post_id) on public.messages to authenticated;
grant usage on sequence public.messages_id_seq to authenticated;
create policy "Participants read messages" on public.messages for select to authenticated
using ((select auth.uid()) in (sender_id, recipient_id));
create policy "Send as yourself" on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid()) and
  (kind = 'text' or exists (select 1 from public.posts p where p.id = post_id and p.media_type = 'video'))
);

-- Security invoker keeps participant RLS active for inbox queries.
create function public.chat_inbox(page_offset integer default 0)
returns table (peer_id uuid, display_name text, body text, kind text, created_at timestamptz, message_id bigint)
language sql stable security invoker set search_path = '' as $$
  with latest as (
    select distinct on (case when m.sender_id = auth.uid() then m.recipient_id else m.sender_id end)
      case when m.sender_id = auth.uid() then m.recipient_id else m.sender_id end as peer,
      m.body, m.kind, m.created_at, m.id
    from public.messages m
    where auth.uid() in (m.sender_id, m.recipient_id)
    order by case when m.sender_id = auth.uid() then m.recipient_id else m.sender_id end, m.id desc
  )
  select l.peer, p.display_name, l.body, l.kind, l.created_at, l.id
  from latest l join public.profiles p on p.id = l.peer
  order by l.id desc limit 30 offset greatest(page_offset, 0);
$$;
revoke all on function public.chat_inbox(integer) from public, anon;
grant execute on function public.chat_inbox(integer) to authenticated;
commit;
