begin;
create table public.message_reactions (
  message_id bigint not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('❤️','😂','😮','😢','😡','👍','🔥','🎉')),
  primary key (message_id, user_id)
);
alter table public.message_reactions enable row level security;
revoke all on public.message_reactions from anon, authenticated;
grant select, insert, delete on public.message_reactions to authenticated;
grant update (emoji) on public.message_reactions to authenticated;
create policy "Participants read reactions" on public.message_reactions
for select to authenticated using (exists (
  select 1 from public.messages m where m.id = message_id
  and (select auth.uid()) in (m.sender_id, m.recipient_id)
));
create policy "Participants add own reactions" on public.message_reactions
for insert to authenticated with check (user_id = (select auth.uid()) and exists (
  select 1 from public.messages m where m.id = message_id
  and (select auth.uid()) in (m.sender_id, m.recipient_id)
));
create policy "Participants change own reactions" on public.message_reactions
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.messages m where m.id = message_id
  and (select auth.uid()) in (m.sender_id, m.recipient_id)
));
create policy "Remove own reactions" on public.message_reactions
for delete to authenticated using (user_id = (select auth.uid()));
create function public.set_message_reaction(target_message bigint, chosen_emoji text)
returns void language sql security invoker set search_path = '' as $$
  insert into public.message_reactions(message_id, user_id, emoji)
  values (target_message, auth.uid(), chosen_emoji)
  on conflict (message_id, user_id) do update set emoji = excluded.emoji;
$$;
revoke all on function public.set_message_reaction(bigint, text) from public, anon;
grant execute on function public.set_message_reaction(bigint, text) to authenticated;
commit;
