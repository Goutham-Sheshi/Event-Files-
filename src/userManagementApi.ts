import { supabase } from './lib/supabase'
import { getMyProfile, type VaultProfile, type UserStatus, getRegisteredAccounts, saveRegisteredAccount } from './authApi'

/**
 * Fetch all registered user profiles dynamically from PostgreSQL Database (`public.profiles`)
 * Includes automatic fail-safe fallback to active session profile if table is empty or loading
 */
export async function getAllProfiles(): Promise<VaultProfile[]> {
  const localAccounts = getRegisteredAccounts()
  const localProfiles: VaultProfile[] = Object.values(localAccounts).map(acc => ({
    id: acc.id,
    email: acc.email,
    full_name: acc.full_name,
    role: acc.role || 'standard',
    status: acc.status || 'approved'
  }))

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data && data.length > 0) {
      const dbProfiles = data as VaultProfile[]
      const mergedMap = new Map<string, VaultProfile>()
      
      // Load local profiles first
      localProfiles.forEach(p => mergedMap.set(p.email.toLowerCase(), p))
      
      // Overwrite with DB profiles
      dbProfiles.forEach(p => mergedMap.set(p.email.toLowerCase(), p))
      
      return Array.from(mergedMap.values())
    }
  } catch (err) {
    console.warn('Profiles DB query note:', err)
  }

  // Fallback to all local profiles if database is empty or queries fail
  if (localProfiles.length > 0) {
    return localProfiles
  }

  // Fallback to active logged-in user profile
  const activeProfile = await getMyProfile()
  if (activeProfile) {
    return [activeProfile]
  }

  return []
}

/**
 * Update user access status dynamically in Database (`public.profiles`)
 */
export async function updateUserStatus(userId: string, status: UserStatus, email?: string): Promise<void> {
  // Update local registry fallback first
  try {
    const accounts = getRegisteredAccounts()
    const cleanEmail = email?.trim().toLowerCase()
    const target = cleanEmail ? accounts[cleanEmail] : Object.values(accounts).find(acc => acc.id === userId)
    if (target) {
      target.status = status
      saveRegisteredAccount(target)
    }
  } catch (e) {
    console.warn('Failed to sync updated status to local registry:', e)
  }

  // If userId is not a valid UUID, it's a local-only mockup user; skip database operations
  const LOOSE_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!LOOSE_UUID_REGEX.test(userId)) {
    return
  }

  const { error } = await supabase
    .from('profiles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    throw new Error(`Database Update Error: ${error.message}`)
  }
}

/**
 * Delete user profile dynamically from Database (`public.profiles`)
 */
export async function deleteUserProfile(userId: string, email?: string): Promise<void> {
  // Delete from local registry fallback first
  try {
    const accounts = getRegisteredAccounts()
    const cleanEmail = email?.trim().toLowerCase()
    const target = cleanEmail ? accounts[cleanEmail] : Object.values(accounts).find(acc => acc.id === userId)
    if (target) {
      delete accounts[target.email.toLowerCase()]
      localStorage.setItem('sheshi_registered_accounts', JSON.stringify(accounts))
    }
  } catch (e) {
    console.warn('Failed to delete account from local registry:', e)
  }

  // If userId is not a valid UUID, it's a local-only mockup user; skip database operations
  const LOOSE_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!LOOSE_UUID_REGEX.test(userId)) {
    return
  }

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId)

  if (error) {
    throw new Error(`Database Delete Error: ${error.message}`)
  }
}

/**
 * Reset password for target user dynamically in Supabase Auth service
 */
export async function adminResetUserPassword(userId: string, email: string, newPassword: string): Promise<void> {
  // Sync the new password to the local registry fallback
  try {
    const cleanEmail = email.trim().toLowerCase()
    const accounts = getRegisteredAccounts()
    const existing = accounts[cleanEmail]
    
    const updatedAccount = {
      id: userId,
      email: cleanEmail,
      full_name: existing?.full_name || cleanEmail.split('@')[0],
      password: newPassword,
      role: existing?.role || (cleanEmail === 'goutham.ra@sheshi.ai' ? 'admin' : 'standard'),
      status: existing?.status || 'approved',
      created_at: existing?.created_at || new Date().toISOString(),
    }
    saveRegisteredAccount(updatedAccount)
  } catch (e) {
    console.warn('Failed to sync updated password to local registry:', e)
  }

  // If userId is not a valid UUID, it's a local-only mockup user; skip database operations
  const LOOSE_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!LOOSE_UUID_REGEX.test(userId)) {
    return
  }

  try {
    const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword })
    if (!error) return
  } catch { /* ignore */ }

  try {
    await supabase.auth.resetPasswordForEmail(email)
  } catch { /* ignore */ }
}
