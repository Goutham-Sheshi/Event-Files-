-- Fix public.is_admin() to check the profiles table in addition to the user_roles table.
-- Since the application stores user roles and approval statuses in the public.profiles table,
-- the old check against user_roles (which is empty) caused all admin delete/update operations to fail.

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
