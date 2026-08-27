import { createClient } from '@supabase/supabase-js'

// Browser authentication must persist across page reloads. Supabase stores the
// session locally and refreshes tokens automatically while the user is active.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ikkyziyugrnkolqnrxfo.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_NrOOus1ftpRgAajRyecIvA_b3_tKRXv'

export const isSupabaseConfigured = true
export const supabaseConfigError = null

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
