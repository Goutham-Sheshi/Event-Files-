-- Fix NULL values and missing identities for manually inserted users in auth.users.
-- This resolves the "Database error querying schema" scan error in Supabase GoTrue Auth
-- which causes logins to fail and fall back to local mode without correct RLS credentials.

-- 1. Set default values for columns that GoTrue expects to be non-NULL strings
update auth.users
set 
  confirmation_token = coalesce(confirmation_token, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change_token = coalesce(phone_change_token, '');

-- 2. Ensure the admin user has a record in auth.identities so login is fully validated
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select 
  id,
  id,
  jsonb_build_object('sub', id, 'email', email),
  'email',
  now(),
  now(),
  now()
from auth.users
where email = 'goutham.ra@sheshi.ai'
on conflict do nothing;
