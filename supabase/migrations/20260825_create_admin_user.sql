-- Create Default Admin User directly in Supabase DB
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ikkyziyugrnkolqnrxfo/sql/new

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert user into auth.users table
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'goutham.ra@sheshi.ai',
  crypt('YOUR_ADMIN_PASSWORD', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Goutham"}',
  now(),
  now()
)
ON CONFLICT (email) DO UPDATE SET
  encrypted_password = crypt('YOUR_ADMIN_PASSWORD', gen_salt('bf')),
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
  updated_at = now();

-- Ensure matching profile row in public.profiles table exists and is marked as approved admin
INSERT INTO public.profiles (id, email, full_name, role, status)
SELECT id, email, 'Goutham', 'admin', 'approved'
FROM auth.users
WHERE lower(email) = 'goutham.ra@sheshi.ai'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  status = 'approved';
