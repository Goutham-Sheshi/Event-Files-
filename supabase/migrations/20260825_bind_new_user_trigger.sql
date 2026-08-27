-- handle_new_user() existed but was never bound to auth.users via a trigger,
-- so no profiles row was ever created for new signups -- neither self-service
-- "Request access" nor users created directly via the Supabase dashboard.
-- (Second occurrence of this exact bug class in this project's history.)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
