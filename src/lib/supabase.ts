import { createClient } from '@supabase/supabase-js'

// Temporary direct client configuration while access management is being rebuilt.
// Supabase publishable keys are designed for browser clients; database access is
// still controlled by RLS policies.
const supabaseUrl = 'https://ikkyziyugrnkolqnrxfo.supabase.co'
const supabaseAnonKey = 'sb_publishable_NrOOus1ftpRgAajRyecIvA_b3_tKRXv'

export const isSupabaseConfigured = true
export const supabaseConfigError = null

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})
