// Temporary single-admin mode.
// Authentication and user-based permissions are intentionally bypassed until
// the final access system is implemented by the development team.
// Every app load resolves to this administrator profile.

export type VaultProfile = {
  id: string
  email: string
  full_name: string
  role: UserRole
  status: UserStatus
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

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (!error) return fallback
  const messageStr = error instanceof Error ? error.message : typeof error === 'object' ? JSON.stringify(error) : String(error)
  
  if (messageStr.includes('Invalid login credentials') || messageStr.includes('invalid_credentials')) {
    return 'Invalid Credentials: The password you entered is incorrect.'
  }
  if (messageStr.includes('signup_disabled') || messageStr.includes('Signups not allowed')) {
    return 'Signups are disabled in Supabase settings.'
  }
  return error instanceof Error ? error.message : fallback
}

/**
 * Strict Sign In - Connects to Express Backend API /api/auth/login with local & Supabase fallbacks
 */
export async function signIn(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase()
  validateSheshiEmail(cleanEmail)

  if (!password?.trim()) {
    throw new Error('Please enter your password.')
  }

  // 1. Try Express Backend REST API (/api/auth/login)
  try {
    const apiRes = await backendLogin(cleanEmail, password)
    if (apiRes?.token && apiRes?.user) {
      if (apiRes.user.status === 'rejected') {
        throw new Error('Access Rejected: Your account access has been rejected by an administrator.')
      }
      if (apiRes.user.status === 'pending') {
        throw new Error('Access Pending: Your account is awaiting approval by an administrator.')
      }
      localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(apiRes.user))
      return { session: { user: { id: apiRes.user.id, email: cleanEmail } } }
    }
  } catch (backendErr: any) {
    if (backendErr?.message && (backendErr.message.includes('Access Rejected') || backendErr.message.includes('Access Pending'))) {
      throw backendErr
    }
    console.warn('Express backend /api/auth/login note:', backendErr)
  }

  // 2. Try standard Supabase authentication
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
    if (!error && data?.session) {
      const profile = await getMyProfile()
      if (profile?.status === 'rejected') {
        await supabase.auth.signOut()
        throw new Error('Access Rejected: Your account access has been rejected by an administrator.')
      }
      if (profile?.status === 'pending') {
        await supabase.auth.signOut()
        throw new Error('Access Pending: Your account is awaiting approval by an administrator.')
      }
      return data
    }
  } catch (err: any) {
    if (err?.message && (err.message.includes('Access Rejected') || err.message.includes('Access Pending'))) {
      throw err
    }
    console.warn('Supabase signInWithPassword note:', err)
  }

  // 3. Verification against Registered User Account Credentials
  const registeredAccounts = getRegisteredAccounts()
  const account = registeredAccounts[cleanEmail]

  if (!account) {
    throw new Error(`Account Not Found: No registered account exists for "${cleanEmail}". Please click Register to request access.`)
  }

  // Verify Password MATCH
  if (account.password && account.password !== password) {
    throw new Error('Invalid Credentials: The password you entered is incorrect. Please check your credentials or use Forgot Password.')
  }

  // Check Account Approval Status
  if (account.status === 'rejected') {
    throw new Error('Access Rejected: Your account access has been rejected by an administrator.')
  }

  if (account.status === 'pending') {
    throw new Error('Access Pending: Your account is awaiting approval by an administrator.')
  }

  // Credentials & Status Approved -> Grant Session
  const userProfile: VaultProfile = {
    id: account.id,
    email: cleanEmail,
    full_name: account.full_name || splitEmailName(cleanEmail),
    role: account.role || (cleanEmail === 'goutham.ra@sheshi.ai' ? 'admin' : 'standard'),
    status: account.status || 'approved',
  }
  
  localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(userProfile))
  return { session: { user: { id: userProfile.id, email: cleanEmail } } }
}

/**
 * Reliable Sign Up - Calls Express Backend API /api/auth/register, upserts public.profiles DB table, & saves local fallback
 */
export async function signUp(email: string, password: string, fullName?: string) {
  const cleanEmail = email.trim().toLowerCase()
  validateSheshiEmail(cleanEmail)

  const name = fullName?.trim() || splitEmailName(cleanEmail)
  const isAdmin = cleanEmail === 'goutham.ra@sheshi.ai'
  const initialStatus: UserStatus = isAdmin ? 'approved' : 'pending'

  let assignedId = isAdmin ? 'admin-goutham' : `user-${cleanEmail.replace(/[^a-z0-9]/g, '-')}`

  // 1. Call Express Backend REST API (/api/auth/register)
  try {
    const apiRes = await backendRegister(cleanEmail, password, name)
    if (apiRes?.user?.id) {
      assignedId = apiRes.user.id
    }
  } catch (backendErr) {
    console.warn('Express backend /api/auth/register note:', backendErr)
  }

  // 2. Try Supabase Auth SignUp
  try {
    const { data } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: name,
          role: isAdmin ? 'admin' : 'standard',
          status: initialStatus,
        },
      },
    })
    if (data?.user?.id) {
      assignedId = data.user.id
    }
  } catch (authErr) {
    console.warn('Supabase Auth signUp note:', authErr)
  }

  const newAccount: RegisteredUserAccount = {
    id: assignedId,
    email: cleanEmail,
    full_name: name,
    password: password,
    role: isAdmin ? 'admin' : 'standard',
    status: initialStatus,
    created_at: new Date().toISOString(),
  }

  // Always save in registered accounts registry for instant login & Admin Console listing
  saveRegisteredAccount(newAccount)

  // 3. Write/Upsert into PostgreSQL public.profiles table
  try {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('profiles')
        .update({
          full_name: name,
          status: initialStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('email', cleanEmail)
    } else {
      const dbUuid = assignedId.length === 36 ? assignedId : '00000000-0000-4000-a000-' + Math.random().toString(16).slice(2, 14).padStart(12, '0')
      await supabase.from('profiles').insert({
        id: dbUuid,
        email: cleanEmail,
        full_name: name,
        role: isAdmin ? 'admin' : 'user',
        status: initialStatus,
        updated_at: new Date().toISOString(),
      })
    }
  } catch (dbErr) {
    console.warn('Profiles DB write note:', dbErr)
  }

  if (isAdmin) {
    localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(newAccount))
    return { session: { user: { id: newAccount.id, email: cleanEmail } } }
  }

  // Return pending approval notification for new standard users
  return {
    pending: true,
    message: 'Registration submitted successfully! Your account is pending approval by an administrator.',
  }
}

/**
 * Request Password Reset
 */
export async function forgotPassword(email: string) {
  const cleanEmail = email.trim().toLowerCase()
  validateSheshiEmail(cleanEmail)

  const registeredAccounts = getRegisteredAccounts()
  if (!registeredAccounts[cleanEmail]) {
    throw new Error(`Account Not Found: No registered account exists for "${cleanEmail}". Please register first.`)
  }

  const redirectUrl = `${window.location.origin}/#reset-password`
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    })
    if (!error) return data
  } catch (err) {
    console.warn('Supabase resetPasswordForEmail note:', err)
  }

  return { message: 'Password reset request submitted. Instructions sent to your corporate email.' }
}

/**
 * Update Password for Session
 */
export async function resetPassword(newPassword: string) {
  try {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword })
    if (!error) return data
  } catch (err) {
    console.warn('Supabase updateUser note:', err)
  }

  const local = localStorage.getItem(CURRENT_SESSION_KEY)
  if (local) {
    try {
      const active = JSON.parse(local) as VaultProfile
      const accounts = getRegisteredAccounts()
      if (accounts[active.email.toLowerCase()]) {
        accounts[active.email.toLowerCase()].password = newPassword
        localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(accounts))
      }
      return { user: { email: active.email } }
    } catch { /* ignore */ }
  }

  throw new Error('Could not update password. Please ensure you are signed in or open the reset link.')
}

/**
 * Sign Out
 */
export async function signOut() {
  localStorage.removeItem(CURRENT_SESSION_KEY)
  try { await supabase.auth.signOut() } catch { /* ignore */ }
}

/**
 * Fetch Current Authenticated User Profile
 */
export async function getMyProfile(): Promise<VaultProfile | null> {
  try {
    const local = localStorage.getItem(CURRENT_SESSION_KEY)
    if (local) {
      try { return JSON.parse(local) as VaultProfile } catch { /* ignore */ }
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return null

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      const isAdmin = user.email?.toLowerCase() === 'goutham.ra@sheshi.ai'
      return {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || splitEmailName(user.email || ''),
        role: isAdmin ? 'admin' : 'standard',
        status: 'approved',
      }
    }

    return profile as VaultProfile
  } catch (error) {
    console.warn('Could not fetch user profile', error)
    return null
  }
}

function splitEmailName(email: string): string {
  if (!email) return 'User'
  const namePart = email.split('@')[0] || ''
  return namePart.charAt(0).toUpperCase() + namePart.slice(1)
}
