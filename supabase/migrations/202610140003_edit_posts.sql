begin;
-- Allow metadata edits only: ownership and media paths cannot be reassigned.
grant update (title, description, city, category) on public.posts to authenticated;
create policy "Edit own posts" on public.posts for update to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));
commit;
