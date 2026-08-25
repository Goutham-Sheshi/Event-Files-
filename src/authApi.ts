// Temporary single-admin mode.
// Authentication and user-based permissions are intentionally bypassed until
// the final access system is implemented by the development team.
// Every app load resolves to this administrator profile.

export type VaultProfile = {
  id: string
  email: string
  role: 'admin'
  status: 'approved'
  full_name: string
}

export const DEFAULT_ADMIN: VaultProfile = {
  id: 'local-admin',
  email: 'goutham.ra@sheshi.ai',
  role: 'admin',
  status: 'approved',
  full_name: 'Goutham',
}

export async function getMyProfile(): Promise<VaultProfile> {
  return DEFAULT_ADMIN
}

// Explicit capability helpers so screens do not fall back to a non-admin user.
export function isAdmin(): true {
  return true
}

export function hasAccess(): true {
  return true
}
