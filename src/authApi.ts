import { supabase } from './lib/supabase'

export type VaultProfile = {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'user'
  status: 'pending' | 'approved' | 'rejected'
  must_change_password: boolean
  created_at: string
}

export async function getMyProfile(): Promise<VaultProfile | null> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,status,must_change_password,created_at')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (error) throw error
  return data as VaultProfile | null
}

export async function vaultUserAdmin(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('vault-user-admin', {
    body: { action, ...payload },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}
