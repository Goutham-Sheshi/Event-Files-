-- Add soft-delete support to public.vault_resources table and update policies

-- 1. Add deleted_at column
alter table public.vault_resources add column if not exists deleted_at timestamptz default null;

-- 2. Update SELECT policy: Admins see all; non-admins only see active (deleted_at IS NULL)
drop policy if exists "vault resources are readable" on public.vault_resources;
create policy "vault resources are readable"
on public.vault_resources for select
to authenticated
using (
  (select public.is_admin())
  or (deleted_at is null)
);

-- 3. Add UPDATE policy: Allow approved advanced users to update (soft-delete, edit tags/types)
drop policy if exists "approved advanced users update vault resources" on public.vault_resources;
create policy "approved advanced users update vault resources"
on public.vault_resources for update
to authenticated
using ((select private.is_vault_uploader()))
with check ((select private.is_vault_uploader()));
