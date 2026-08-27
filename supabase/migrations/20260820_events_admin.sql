create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date timestamptz not null,
  location text,
  product_id text,
  event_type text not null default 'In-person' check (event_type in ('In-person','Virtual')),
  banner text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;
grant select, insert, update, delete on public.events to authenticated;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.is_admin(); $$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;

drop policy if exists "Authenticated users can read events" on public.events;
create policy "Authenticated users can read events"
on public.events for select to authenticated using (true);

drop policy if exists "Admins can insert events" on public.events;
create policy "Admins can insert events"
on public.events for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins can update events" on public.events;
create policy "Admins can update events"
on public.events for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete events" on public.events;
create policy "Admins can delete events"
on public.events for delete to authenticated using (public.is_admin());
