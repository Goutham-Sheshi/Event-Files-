-- Canonical application roles: admin, advanced, standard/user.
-- Keep teammate only as a legacy value so existing records remain readable.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'advanced', 'standard', 'user', 'teammate'));

-- Existing teammate records are promoted to the canonical advanced role.
UPDATE public.profiles
SET role = 'advanced'
WHERE role = 'teammate';
