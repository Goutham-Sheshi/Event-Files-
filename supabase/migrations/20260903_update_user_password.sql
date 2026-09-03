-- Update password for goutham.ra@sheshi.ai in Supabase Auth.
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/ikkyziyugrnkolqnrxfo/sql/new

UPDATE auth.users
SET encrypted_password = crypt('Gtg@1492', gen_salt('bf'))
WHERE email = 'goutham.ra@sheshi.ai';
