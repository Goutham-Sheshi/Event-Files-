import { createClient } from '@supabase/supabase-js'

// These are public Supabase client credentials. Keeping them here makes the
// GitHub Pages build independent of missing Actions environment variables.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ikkyziyugrnkolqnrxfo.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_NrOOus1ftpRgAajRyecIvA_b3_tKRXv'

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
export const supabaseConfigError = null

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})
