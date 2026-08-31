-- Update the admin user's database password to match the one used locally.
-- This ensures that Supabase Auth successfully authenticates the login request on the server.
update auth.users
set encrypted_password = crypt('12345@123', gen_salt('bf'))
where email = 'goutham.ra@sheshi.ai';
