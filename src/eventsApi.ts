import { supabase } from './lib/supabase'
import { getMyProfile } from './authApi'
import type { EventResourceItem, EventResourceCategory, EventGalleryMediaItem, EventLinkItem } from './types'

export type EventStatus = 'upcoming' | 'ongoing' | 'completed'

export type ManagedEvent = {
  id: string
  title: string
  description: string | null
  event_date: string // Start Date
  end_date?: string | null // End Date
  location: string | null
  product_id: string | null
  event_type: 'In-person' | 'Virtual'
  banner: string | null
  banner_path?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export type EventInput = Pick<ManagedEvent, 'title' | 'description' | 'event_date' | 'end_date' | 'location' | 'product_id' | 'event_type' | 'banner'>

const STORAGE_BUCKET = 'event-assets'
const SIGNED_URL_TTL = 60 * 30

const LOCAL_EVENT_RESOURCES_KEY = 'sheshi_event_resources_v1'
const LOCAL_EVENT_GALLERY_KEY = 'sheshi_event_gallery_v1'
const LOCAL_EVENT_LINKS_KEY = 'sheshi_event_links_v1'

export function calculateEventStatus(event: ManagedEvent): EventStatus {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  
  const start = new Date(event.event_date)
  start.setHours(0, 0, 0, 0)

  let end: Date
  if (event.end_date) {
    end = new Date(event.end_date)
    end.setHours(23, 59, 59, 999)
  } else {
    end = new Date(event.event_date)
    end.setHours(23, 59, 59, 999)
  }

  if (now < start) return 'upcoming'
  if (now >= start && now <= end) return 'ongoing'
  return 'completed'
}

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
  const profile = await getMyProfile()
  const createdBy = profile?.email || 'admin'
  const { data, error } = await supabase.from('events').insert({ ...input, created_by: createdBy, banner_path: input.banner, banner: null }).select().single()
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
  const profile = await getMyProfile()
  return profile?.role === 'admin' && profile.status === 'approved'
}

// ─── EVENT RESOURCES ────────────────────────────────────────────────────────

function getLocalEventResources(eventId: string): EventResourceItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_EVENT_RESOURCES_KEY)
    const items: EventResourceItem[] = raw ? JSON.parse(raw) : []
    return items.filter(x => x.eventId === eventId)
  } catch { return [] }
}

function saveLocalEventResource(item: EventResourceItem) {
  try {
    const raw = localStorage.getItem(LOCAL_EVENT_RESOURCES_KEY)
    const items: EventResourceItem[] = raw ? JSON.parse(raw) : []
    items.unshift(item)
    localStorage.setItem(LOCAL_EVENT_RESOURCES_KEY, JSON.stringify(items))
  } catch { /* ignore */ }
}

function removeLocalEventResource(id: string) {
  try {
    const raw = localStorage.getItem(LOCAL_EVENT_RESOURCES_KEY)
    const items: EventResourceItem[] = raw ? JSON.parse(raw) : []
    const filtered = items.filter(x => x.id !== id)
    localStorage.setItem(LOCAL_EVENT_RESOURCES_KEY, JSON.stringify(filtered))
  } catch { /* ignore */ }
}

export async function getEventResources(eventId: string): Promise<EventResourceItem[]> {
  try {
    const { data, error } = await supabase
      .from('event_resources')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      return data.map(r => ({
        id: r.id,
        eventId: r.event_id,
        title: r.title,
        fileUrl: r.file_url,
        fileFormat: r.file_format || undefined,
        fileSize: r.file_size || undefined,
        category: r.category as EventResourceCategory,
        uploadedBy: r.uploaded_by,
        createdAt: r.created_at
      }))
    }
  } catch { /* ignore */ }
  return getLocalEventResources(eventId)
}

export async function uploadEventResource(
  eventId: string,
  file: File,
  title: string,
  category: EventResourceCategory
): Promise<EventResourceItem> {
  const profile = await getMyProfile()
  const uploadedBy = profile?.email || 'anonymous'
  
  let fileUrl = ''
  let fileFormat = file.name.split('.').pop()?.toUpperCase() || 'FILE'
  let fileSize = `${(file.size / (1024 * 1024)).toFixed(1)} MB`
  if (file.size < 1024 * 1024) fileSize = `${Math.round(file.size / 1024)} KB`

  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const path = `event-resources/${eventId}/${crypto.randomUUID()}-${safeName}`
    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type || undefined })

    if (!uploadErr) {
      const { data: signed } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, SIGNED_URL_TTL)
      fileUrl = signed?.signedUrl || path
    }
  } catch {
    fileUrl = URL.createObjectURL(file)
  }

  if (!fileUrl) fileUrl = URL.createObjectURL(file)

  const newItem: EventResourceItem = {
    id: crypto.randomUUID(),
    eventId,
    title: title.trim() || file.name,
    fileUrl,
    fileFormat,
    fileSize,
    category,
    uploadedBy,
    createdAt: new Date().toISOString()
  }

  try {
    const { data, error } = await supabase.from('event_resources').insert({
      id: newItem.id,
      event_id: eventId,
      title: newItem.title,
      file_url: newItem.fileUrl,
      file_format: newItem.fileFormat,
      file_size: newItem.fileSize,
      category: newItem.category,
      uploaded_by: newItem.uploadedBy,
      created_at: newItem.createdAt
    }).select().single()

    if (!error && data) {
      saveLocalEventResource(newItem)
      return newItem
    }
  } catch { /* ignore */ }

  saveLocalEventResource(newItem)
  return newItem
}

export async function deleteEventResource(id: string, userEmail?: string, isAdmin: boolean = false): Promise<void> {
  try {
    const { error } = await supabase.from('event_resources').delete().eq('id', id)
    if (error) console.warn('Supabase event resource delete note:', error)
  } catch { /* ignore */ }
  removeLocalEventResource(id)
}

// ─── EVENT GALLERY ──────────────────────────────────────────────────────────

function getLocalEventGallery(eventId: string): EventGalleryMediaItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_EVENT_GALLERY_KEY)
    const items: EventGalleryMediaItem[] = raw ? JSON.parse(raw) : []
    return items.filter(x => x.eventId === eventId)
  } catch { return [] }
}

function saveLocalEventGalleryMedia(item: EventGalleryMediaItem) {
  try {
    const raw = localStorage.getItem(LOCAL_EVENT_GALLERY_KEY)
    const items: EventGalleryMediaItem[] = raw ? JSON.parse(raw) : []
    items.unshift(item)
    localStorage.setItem(LOCAL_EVENT_GALLERY_KEY, JSON.stringify(items))
  } catch { /* ignore */ }
}

function removeLocalEventGalleryMedia(id: string) {
  try {
    const raw = localStorage.getItem(LOCAL_EVENT_GALLERY_KEY)
    const items: EventGalleryMediaItem[] = raw ? JSON.parse(raw) : []
    const filtered = items.filter(x => x.id !== id)
    localStorage.setItem(LOCAL_EVENT_GALLERY_KEY, JSON.stringify(filtered))
  } catch { /* ignore */ }
}

export async function getEventGallery(eventId: string): Promise<EventGalleryMediaItem[]> {
  try {
    const { data, error } = await supabase
      .from('event_gallery')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      return data.map(m => ({
        id: m.id,
        eventId: m.event_id,
        mediaType: m.media_type as 'image' | 'video',
        title: m.title,
        fileUrl: m.file_url,
        thumbnailUrl: m.thumbnail_url || undefined,
        uploadedBy: m.uploaded_by,
        createdAt: m.created_at
      }))
    }
  } catch { /* ignore */ }
  return getLocalEventGallery(eventId)
}

export async function uploadEventGalleryMedia(
  eventId: string,
  file: File,
  title?: string
): Promise<EventGalleryMediaItem> {
  const profile = await getMyProfile()
  const uploadedBy = profile?.email || 'anonymous'
  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(file.name)
  const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image'

  let fileUrl = ''
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const path = `event-gallery/${eventId}/${crypto.randomUUID()}-${safeName}`
    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type || undefined })

    if (!uploadErr) {
      const { data: signed } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, SIGNED_URL_TTL)
      fileUrl = signed?.signedUrl || path
    }
  } catch {
    fileUrl = URL.createObjectURL(file)
  }

  if (!fileUrl) fileUrl = URL.createObjectURL(file)

  const newItem: EventGalleryMediaItem = {
    id: crypto.randomUUID(),
    eventId,
    mediaType,
    title: (title || file.name).trim(),
    fileUrl,
    uploadedBy,
    createdAt: new Date().toISOString()
  }

  try {
    const { data, error } = await supabase.from('event_gallery').insert({
      id: newItem.id,
      event_id: eventId,
      media_type: newItem.mediaType,
      title: newItem.title,
      file_url: newItem.fileUrl,
      uploaded_by: newItem.uploadedBy,
      created_at: newItem.createdAt
    }).select().single()

    if (!error && data) {
      saveLocalEventGalleryMedia(newItem)
      return newItem
    }
  } catch { /* ignore */ }

  saveLocalEventGalleryMedia(newItem)
  return newItem
}

export async function deleteEventGalleryMedia(id: string, userEmail?: string, isAdmin: boolean = false): Promise<void> {
  try {
    const { error } = await supabase.from('event_gallery').delete().eq('id', id)
    if (error) console.warn('Supabase event gallery delete note:', error)
  } catch { /* ignore */ }
  removeLocalEventGalleryMedia(id)
}

// ─── EVENT LINKS ────────────────────────────────────────────────────────────

function getLocalEventLinks(eventId: string): EventLinkItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_EVENT_LINKS_KEY)
    const items: EventLinkItem[] = raw ? JSON.parse(raw) : []
    return items.filter(x => x.eventId === eventId)
  } catch { return [] }
}

function saveLocalEventLink(item: EventLinkItem) {
  try {
    const raw = localStorage.getItem(LOCAL_EVENT_LINKS_KEY)
    const items: EventLinkItem[] = raw ? JSON.parse(raw) : []
    items.unshift(item)
    localStorage.setItem(LOCAL_EVENT_LINKS_KEY, JSON.stringify(items))
  } catch { /* ignore */ }
}

function removeLocalEventLink(id: string) {
  try {
    const raw = localStorage.getItem(LOCAL_EVENT_LINKS_KEY)
    const items: EventLinkItem[] = raw ? JSON.parse(raw) : []
    const filtered = items.filter(x => x.id !== id)
    localStorage.setItem(LOCAL_EVENT_LINKS_KEY, JSON.stringify(filtered))
  } catch { /* ignore */ }
}

export async function getEventLinks(eventId: string): Promise<EventLinkItem[]> {
  try {
    const { data, error } = await supabase
      .from('event_links')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      return data.map(l => ({
        id: l.id,
        eventId: l.event_id,
        title: l.title,
        url: l.url,
        description: l.description || undefined,
        addedBy: l.added_by,
        createdAt: l.created_at
      }))
    }
  } catch { /* ignore */ }
  return getLocalEventLinks(eventId)
}

export async function addEventLink(
  eventId: string,
  title: string,
  url: string,
  description?: string
): Promise<EventLinkItem> {
  const profile = await getMyProfile()
  const addedBy = profile?.email || 'anonymous'

  let formattedUrl = url.trim()
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = `https://${formattedUrl}`
  }

  const newItem: EventLinkItem = {
    id: crypto.randomUUID(),
    eventId,
    title: title.trim(),
    url: formattedUrl,
    description: description?.trim() || undefined,
    addedBy,
    createdAt: new Date().toISOString()
  }

  try {
    const { data, error } = await supabase.from('event_links').insert({
      id: newItem.id,
      event_id: eventId,
      title: newItem.title,
      url: newItem.url,
      description: newItem.description,
      added_by: newItem.addedBy,
      created_at: newItem.createdAt
    }).select().single()

    if (!error && data) {
      saveLocalEventLink(newItem)
      return newItem
    }
  } catch { /* ignore */ }

  saveLocalEventLink(newItem)
  return newItem
}

export async function deleteEventLink(id: string, userEmail?: string, isAdmin: boolean = false): Promise<void> {
  try {
    const { error } = await supabase.from('event_links').delete().eq('id', id)
    if (error) console.warn('Supabase event link delete note:', error)
  } catch { /* ignore */ }
  removeLocalEventLink(id)
}
