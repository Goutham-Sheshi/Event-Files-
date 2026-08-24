import { createClient } from '@supabase/supabase-js'

const configuredUrl = import.meta.env.VITE_SUPABASE_URL
const configuredAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Never crash the whole application when GitHub Pages is deployed without
// the public Supabase build variables. The UI can still render and surface
// a controlled configuration error instead of a blank page.
export const isSupabaseConfigured = Boolean(configuredUrl && configuredAnonKey)

const supabaseUrl = configuredUrl || 'https://vault-config-missing.invalid'
const supabaseAnonKey = configuredAnonKey || 'public-config-missing'

export const supabaseConfigError = isSupabaseConfigured
  ? null
  : 'Vault authentication is not configured. Ask an administrator to add the required public Supabase build variables.'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
