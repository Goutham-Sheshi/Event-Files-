import { supabase } from './lib/supabase'

export type ManagedEvent = {
  id: string
  title: string
  description: string | null
  event_date: string
  location: string | null
  product_id: string | null
  event_type: 'In-person' | 'Virtual'
  banner: string | null
  banner_path?: string | null
  created_at: string
  updated_at: string
}

export type EventInput = Pick<ManagedEvent, 'title' | 'description' | 'event_date' | 'location' | 'product_id' | 'event_type' | 'banner'>

const STORAGE_BUCKET = 'event-assets'
const SIGNED_URL_TTL = 60 * 30

export async function uploadEventBanner(file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = `events/${crypto.randomUUID()}-${safeName}`
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type || undefined })
  if (error) throw error
  return path
}

async function hydrateEvent(row: any): Promise<ManagedEvent> {
  const path = row.banner_path || row.banner
  if (!path || /^https?:\/\//i.test(path)) return row as ManagedEvent
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, SIGNED_URL_TTL)
  return { ...row, banner: error ? null : data.signedUrl, banner_path: path } as ManagedEvent
}

export async function getEvents(): Promise<ManagedEvent[]> {
  const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: true })
  if (error) throw error
  return Promise.all((data || []).map(hydrateEvent))
}

export async function createEvent(input: EventInput): Promise<ManagedEvent> {
  const { data, error } = await supabase.from('events').insert({ ...input, banner_path: input.banner, banner: null }).select().single()
  if (error) throw error
  return hydrateEvent(data)
}

export async function updateEvent(id: string, input: EventInput): Promise<ManagedEvent> {
  const { data, error } = await supabase.from('events').update({ ...input, banner_path: input.banner, banner: null, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return hydrateEvent(data)
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data, error } = await supabase.from('profiles').select('role,status').maybeSingle()
  if (error || !data) return false
  return data.role === 'admin' && data.status === 'approved'
}