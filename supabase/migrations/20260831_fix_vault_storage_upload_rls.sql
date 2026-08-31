-- Fix Storage RLS for approved Vault uploaders.
-- Keep authorization tied to the authenticated user's profile/role, but make
-- the storage policy independent of the helper function so Supabase Storage
-- evaluates it reliably for browser uploads.
drop policy if exists "approved advanced users insert vault storage" on storage.objects;
create policy "approved vault users insert event assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'approved'
      and p.role in ('admin', 'advanced', 'teammate')
  )
);

-- Keep the database insert aligned with the same authorization rule.
drop policy if exists "approved advanced users insert vault resources" on public.vault_resources;
create policy "approved vault users insert vault resources"
on public.vault_resources
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'approved'
      and p.role in ('admin', 'advanced', 'teammate')
  )
);
