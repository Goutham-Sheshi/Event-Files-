-- Supabase Storage requires INSERT and SELECT access for browser uploads.
-- The Storage API inserts an object and returns its metadata, so the SELECT
-- policy must cover the same uploader role as the INSERT policy.
drop policy if exists "approved vault users insert event assets" on storage.objects;
create policy "approved vault users insert event assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-assets'
  and (select private.is_vault_uploader())
);

drop policy if exists "approved vault users select event assets" on storage.objects;
create policy "approved vault users select event assets"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'event-assets'
  and (select private.is_vault_uploader())
);
