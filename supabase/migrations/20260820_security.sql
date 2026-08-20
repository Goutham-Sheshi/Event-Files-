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

-- Bootstrap the existing authenticated owner as the first admin.
insert into public.user_roles (user_id, role)
values ('626b644d-97cc-47e9-b5b297958dc', 'admin')
on conflict (user_id) do update set role = excluded.role;

-- Helper used by RLS policies and server-side authorization.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
