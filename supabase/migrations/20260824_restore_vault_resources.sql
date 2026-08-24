-- Restore the managed product resources table used by the application.
-- The live application stores uploads in the event-assets bucket.
create table if not exists public.vault_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null check (type in ('figma','logo','brochure','video','document','other')),
  product_id text not null,
  source_url text not null,
  storage_path text,
  thumbnail text,
  file_format text,
  file_size text,
  tags text[] not null default '{}',
  featured boolean not null default false,
  view_count integer not null default 0,
  download_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vault_resources enable row level security;

drop policy if exists "vault resources are readable" on public.vault_resources;
create policy "vault resources are readable"
on public.vault_resources for select
using (true);

drop policy if exists "admins manage vault resources" on public.vault_resources;
create policy "admins manage vault resources"
on public.vault_resources for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

insert into storage.buckets (id, name, public)
values ('event-assets', 'event-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "event assets are public" on storage.objects;
create policy "event assets are public"
on storage.objects for select
using (bucket_id = 'event-assets');

drop policy if exists "admins upload event assets" on storage.objects;
create policy "admins upload event assets"
on storage.objects for insert
with check (bucket_id = 'event-assets' and public.current_user_is_admin());

drop policy if exists "admins update event assets" on storage.objects;
create policy "admins update event assets"
on storage.objects for update
using (bucket_id = 'event-assets' and public.current_user_is_admin())
with check (bucket_id = 'event-assets' and public.current_user_is_admin());

drop policy if exists "admins delete event assets" on storage.objects;
create policy "admins delete event assets"
on storage.objects for delete
using (bucket_id = 'event-assets' and public.current_user_is_admin());
