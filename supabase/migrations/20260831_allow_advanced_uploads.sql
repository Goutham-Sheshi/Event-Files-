create or replace function private.is_vault_uploader()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and status = 'approved'
      and role in ('admin', 'advanced', 'teammate')
  )
  or exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.is_vault_uploader() from public;
grant execute on function private.is_vault_uploader() to authenticated;

drop policy if exists "vault admins insert storage" on storage.objects;
create policy "approved advanced users insert vault storage"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-assets'
  and (select private.is_vault_uploader())
);

drop policy if exists "vault resources write" on public.vault_resources;
create policy "approved advanced users insert vault resources"
on public.vault_resources
for insert
to authenticated
with check ((select private.is_vault_uploader()));
