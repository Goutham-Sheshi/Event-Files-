-- Sheshi Vault security baseline
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','user')) default 'user',
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

create policy "Users can read their own role"
on public.user_roles for select to authenticated
using (auth.uid() = user_id);

-- After running this migration, assign the existing owner as admin from the
-- Supabase SQL editor using that user's exact UUID from Authentication > Users:
-- insert into public.user_roles (user_id, role)
-- values ('PASTE-EXACT-USER-UUID-HERE', 'admin')
-- on conflict (user_id) do update set role = excluded.role;

create or replace function public.is_admin()
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
      and role = 'admin'
  )
  or exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
