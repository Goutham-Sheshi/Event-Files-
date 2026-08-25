// Authentication is temporarily disabled.
// Keep the app in owner/admin mode until the final access system is implemented.
export type VaultProfile = {
  id: string
  email: string
  role: 'admin'
  status: 'approved'
  full_name: string
}

export async function getMyProfile(): Promise<VaultProfile> {
  return {
    id: 'local-admin',
    email: 'goutham.ra@sheshi.ai',
    role: 'admin',
    status: 'approved',
    full_name: 'Goutham',
  }
}
