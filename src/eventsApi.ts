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
