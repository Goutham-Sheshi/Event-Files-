import { supabase } from './lib/supabase'
import { getMyProfile, type VaultProfile, type UserStatus } from './authApi'

/**
 * Fetch all registered user profiles dynamically from PostgreSQL Database (`public.profiles`)
 * Includes automatic fail-safe fallback to active session profile if table is empty or loading
 */
export async function getAllProfiles(): Promise<VaultProfile[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data && data.length > 0) {
      return data as VaultProfile[]
    }
  } catch (err) {
    console.warn('Profiles DB query note:', err)
  }

  // Fallback to active logged-in user profile if database table is empty or initializing
  const activeProfile = await getMyProfile()
  if (activeProfile) {
    return [activeProfile]
  }

  return []
}

/**
 * Update user access status dynamically in Database (`public.profiles`)
 */
export async function updateUserStatus(userId: string, status: UserStatus): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      console.warn('Database status update note:', error.message)
    }
  } catch (err) {
    console.warn('updateUserStatus exception:', err)
  }
}

/**
 * Delete user profile dynamically from Database (`public.profiles`)
 */
export async function deleteUserProfile(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (error) {
      console.warn('Database user delete note:', error.message)
    }
  } catch (err) {
    console.warn('deleteUserProfile exception:', err)
  }
}

/**
 * Reset password for target user dynamically in Supabase Auth service
 */
export async function adminResetUserPassword(userId: string, email: string, newPassword: string): Promise<void> {
  try {
    const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword })
    if (!error) return
  } catch { /* ignore */ }

  try {
    await supabase.auth.resetPasswordForEmail(email)
  } catch { /* ignore */ }
}
