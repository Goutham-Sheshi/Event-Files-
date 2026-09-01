-- Update the admin user's database password in Supabase Auth.
-- Replace 'YOUR_SECURE_PASSWORD' below with your desired admin password before running in Supabase SQL Editor.
update auth.users
set encrypted_password = crypt('YOUR_SECURE_PASSWORD', gen_salt('bf'))
where email = 'goutham.ra@sheshi.ai';
