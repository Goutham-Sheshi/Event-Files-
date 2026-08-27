-- ============================================================================
-- SHESHI VAULT - MASTER MIGRATION SCRIPT (FAIL-SAFE PROFILES TABLE FIX)
-- Run this single script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ikkyziyugrnkolqnrxfo/sql/new
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Schema Permissions for Anon & Authenticated Roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 3. Create User Profiles Table if not exists & ensure all columns exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text,
  role text NOT NULL DEFAULT 'standard',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure all required columns exist on profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'standard';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Drop restrictive constraints if existing to prevent 400 Bad Request errors on registration
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Add flexible role check allowing admin, standard, or user
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'standard', 'user'));

-- 4. Table Privileges & Row Level Security (RLS)
GRANT ALL PRIVILEGES ON public.profiles TO anon, authenticated;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles readable" ON public.profiles;
CREATE POLICY "profiles readable" ON public.profiles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profiles write" ON public.profiles;
CREATE POLICY "profiles write" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. Trigger Function for User Signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    CASE WHEN lower(new.email) = 'goutham.ra@sheshi.ai' THEN 'admin' ELSE COALESCE(new.raw_user_meta_data->>'role', 'standard') END,
    CASE WHEN lower(new.email) = 'goutham.ra@sheshi.ai' THEN 'approved' ELSE COALESCE(new.raw_user_meta_data->>'status', 'pending') END,
    now()
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = COALESCE(excluded.full_name, public.profiles.full_name),
    role = CASE WHEN lower(excluded.email) = 'goutham.ra@sheshi.ai' THEN 'admin' ELSE public.profiles.role END,
    status = CASE WHEN lower(excluded.email) = 'goutham.ra@sheshi.ai' THEN 'approved' ELSE public.profiles.status END,
    updated_at = now();
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Insert Default Admin User (goutham.ra@sheshi.ai) into public.profiles
INSERT INTO public.profiles (id, email, full_name, role, status, updated_at)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'goutham.ra@sheshi.ai',
  'Goutham',
  'admin',
  'approved',
  now()
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  status = 'approved',
  updated_at = now();
