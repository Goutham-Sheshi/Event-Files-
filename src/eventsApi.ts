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
  created_at: string
  updated_at: string
}

export type EventInput = Pick<ManagedEvent, 'title' | 'description' | 'event_date' | 'location' | 'product_id' | 'event_type' | 'banner'>

export async function uploadEventBanner(file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = `events/${crypto.randomUUID()}-${safeName}`
  const { error } = await supabase.storage
    .from('event-assets')
    .upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type || undefined })
  if (error) throw error

  const { data } = supabase.storage.from('event-assets').getPublicUrl(path)
  if (!data.publicUrl) throw new Error('Event image uploaded, but no public URL was returned.')
  return data.publicUrl
}

export async function getEvents(): Promise<ManagedEvent[]> {
  const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: true })
  if (error) throw error
  return data as ManagedEvent[]
}

export async function createEvent(input: EventInput): Promise<ManagedEvent> {
  const { data, error } = await supabase.from('events').insert(input).select().single()
  if (error) throw error
  return data as ManagedEvent
}

export async function updateEvent(id: string, input: EventInput): Promise<ManagedEvent> {
  const { data, error } = await supabase.from('events').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return data as ManagedEvent
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('current_user_is_admin')
  if (error) return false
  return data === true
}
