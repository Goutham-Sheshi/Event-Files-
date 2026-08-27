import { supabase } from './lib/supabase'
import type { UserRole } from './types'
import { getMyProfile, type VaultProfile, type UserStatus, getRegisteredAccounts, saveRegisteredAccount } from './authApi'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getAllProfiles(): Promise<VaultProfile[]> {
  const accounts = getRegisteredAccounts()
  const localProfiles: VaultProfile[] = Object.values(accounts).map(acc => ({ id: acc.id, email: acc.email, full_name: acc.full_name, role: acc.role || 'user', status: acc.status || 'approved' }))
  try {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (!error && data?.length) {
      const merged = new Map<string, VaultProfile>()
      localProfiles.forEach(p => merged.set(p.email.toLowerCase(), p))
      ;(data as VaultProfile[]).forEach(p => merged.set(p.email.toLowerCase(), p))
      return Array.from(merged.values())
    }
  } catch (err) { console.warn('Profiles DB query note:', err) }
  if (localProfiles.length) return localProfiles
  const active = await getMyProfile()
  return active ? [active] : []
}

export async function updateUserStatus(userId: string, status: UserStatus, email?: string): Promise<void> {
  const accounts = getRegisteredAccounts(); const cleanEmail = email?.trim().toLowerCase(); const target = cleanEmail ? accounts[cleanEmail] : Object.values(accounts).find(acc => acc.id === userId)
  if (target) { target.status = status; saveRegisteredAccount(target) }
  if (!UUID.test(userId)) return
  const { error } = await supabase.from('profiles').update({ status, updated_at: new Date().toISOString() }).eq('id', userId)
  if (error) throw new Error(`Database Update Error: ${error.message}`)
}

// Admin-only role assignment. Teammate can upload, while User remains read/download only.
export async function updateUserRole(userId: string, role: UserRole, email?: string): Promise<void> {
  if (role === 'standard') role = 'user'
  const accounts = getRegisteredAccounts(); const cleanEmail = email?.trim().toLowerCase(); const target = cleanEmail ? accounts[cleanEmail] : Object.values(accounts).find(acc => acc.id === userId)
  if (target) { target.role = role; saveRegisteredAccount(target) }
  if (!UUID.test(userId)) return
  const { error } = await supabase.from('profiles').update({ role, updated_at: new Date().toISOString() }).eq('id', userId)
  if (error) throw new Error(`Database Role Update Error: ${error.message}`)
}

export async function deleteUserProfile(userId: string, email?: string): Promise<void> {
  const accounts = getRegisteredAccounts(); const cleanEmail = email?.trim().toLowerCase(); const target = cleanEmail ? accounts[cleanEmail] : Object.values(accounts).find(acc => acc.id === userId)
  if (target) { delete accounts[target.email.toLowerCase()]; localStorage.setItem('sheshi_registered_accounts', JSON.stringify(accounts)) }
  if (!UUID.test(userId)) return
  const { error } = await supabase.from('profiles').delete().eq('id', userId)
  if (error) throw new Error(`Database Delete Error: ${error.message}`)
}

export async function adminResetUserPassword(userId: string, email: string, newPassword: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase(); const accounts = getRegisteredAccounts(); const existing = accounts[cleanEmail]
  saveRegisteredAccount({ id: userId, email: cleanEmail, full_name: existing?.full_name || cleanEmail.split('@')[0], password: newPassword, role: existing?.role || 'user', status: existing?.status || 'approved', created_at: existing?.created_at || new Date().toISOString() })
  if (!UUID.test(userId)) return
  try { const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword }); if (!error) return } catch { /* ignore */ }
  try { await supabase.auth.resetPasswordForEmail(email) } catch { /* ignore */ }
}
