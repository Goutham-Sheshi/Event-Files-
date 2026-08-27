-- Persistent storage for event cover images.
insert into storage.buckets (id, name, public)
values ('event-assets', 'event-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "event assets are public" on storage.objects;
create policy "event assets are public"
on storage.objects for select
using (bucket_id = 'event-assets');

drop policy if exists "admins upload event assets" on storage.objects;
create policy "admins upload event assets"
on storage.objects for insert to authenticated
with check (bucket_id = 'event-assets' and public.current_user_is_admin());

drop policy if exists "admins update event assets" on storage.objects;
create policy "admins update event assets"
on storage.objects for update to authenticated
using (bucket_id = 'event-assets' and public.current_user_is_admin())
with check (bucket_id = 'event-assets' and public.current_user_is_admin());

drop policy if exists "admins delete event assets" on storage.objects;
create policy "admins delete event assets"
on storage.objects for delete to authenticated
using (bucket_id = 'event-assets' and public.current_user_is_admin());
