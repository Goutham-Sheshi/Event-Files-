import { supabase } from './lib/supabase'
import { getEvents, createEvent, type ManagedEvent } from './eventsApi'

export interface EventNotification {
  id: string
  event_id?: string
  title: string
  message: string
  event_title: string
  event_date?: string
  location?: string | null
  created_by?: string
  created_at: string
}

const NOTIFICATIONS_STORAGE_KEY = 'sheshi_vault_event_notifications'
const SEEN_NOTIFICATIONS_PREFIX = 'sheshi_vault_seen_notifications_'
const REALTIME_CHANNEL_NAME = 'sheshi_vault_notifications'

// Cross-tab broadcast channel for instant multi-tab communication
let broadcastChannel: BroadcastChannel | null = null
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('sheshi-vault-notifications-channel')
  }
} catch {
  // Ignore BroadcastChannel errors in unsupported runtimes
}

/**
 * Get all cached or persisted notifications from localStorage
 */
export function getLocalNotifications(): EventNotification[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

/**
 * Save notification locally
 */
export function saveLocalNotification(notification: EventNotification) {
  if (typeof window === 'undefined') return
  try {
    const existing = getLocalNotifications()
    const updated = [notification, ...existing.filter(n => n.id !== notification.id)].slice(0, 50)
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.warn('Could not save notification to localStorage:', err)
  }
}

/**
 * Fetch all event notifications from Supabase with localStorage fallback
 */
export async function getNotifications(): Promise<EventNotification[]> {
  let dbNotifications: EventNotification[] = []
  try {
    const { data, error } = await supabase
      .from('event_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)

    if (!error && data) {
      dbNotifications = data.map(item => ({
        id: item.id,
        event_id: item.event_id,
        title: item.title,
        message: item.message,
        event_title: item.event_title,
        event_date: item.event_date,
        location: item.location,
        created_by: item.created_by,
        created_at: item.created_at,
      }))
    }
  } catch {
    // Supabase table may not exist yet; gracefully fallback
  }

  const localList = getLocalNotifications()
  const map = new Map<string, EventNotification>()
  dbNotifications.forEach(n => map.set(n.id, n))
  localList.forEach(n => map.set(n.id, n))

  const combined = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  // Sync back to local storage
  if (combined.length > 0 && typeof window !== 'undefined') {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(combined.slice(0, 50)))
    } catch { /* ignore */ }
  }

  return combined
}

/**
 * Check if the browser supports native push notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied'
  return Notification.permission
}

/**
 * Request browser notification permission from user
 */
export async function requestBrowserPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied'
  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch {
    return 'denied'
  }
}

/**
 * Send a native browser push notification
 * (Displays even if user is on another tab or desktop)
 */
export function sendBrowserPushNotification(notification: EventNotification) {
  if (!isNotificationSupported()) return

  if (Notification.permission === 'granted') {
    try {
      const dateStr = notification.event_date
        ? ` (${new Date(notification.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`
        : ''

      const nativeNotification = new Notification(notification.title, {
        body: `${notification.message}${dateStr}`,
        icon: '/favicon.ico',
        tag: `sheshi-event-${notification.id}`,
      })

      nativeNotification.onclick = (e) => {
        e.preventDefault()
        window.focus()
        const targetId = notification.event_id || 'events'
        try {
          localStorage.setItem('sheshi_vault_pending_navigation', targetId)
        } catch { /* ignore */ }
        window.dispatchEvent(
          new CustomEvent('vault-navigate-event', {
            detail: { eventId: targetId },
          })
        )
        nativeNotification.close()
      }
    } catch (err) {
      console.warn('Native notification trigger failed:', err)
    }
  }
}

/**
 * Dispatch in-app and browser notifications for an event
 */
export async function dispatchEventNotification(notification: EventNotification, options?: { skipPush?: boolean }) {
  // 1. Save to local storage
  saveLocalNotification(notification)

  // 2. Fire native browser notification
  if (!options?.skipPush) {
    sendBrowserPushNotification(notification)
  }

  // 3. Dispatch in-app toast event to current window
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('vault-event-notification', { detail: notification })
    )
    window.dispatchEvent(new CustomEvent('vault-notifications-updated'))
  }

  // 4. Broadcast across other tabs in the same browser
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(notification)
    } catch { /* ignore */ }
  }
}

/**
 * Create a new event notification in Supabase + local cache, and notify users
 */
export async function createEventNotification(
  event: ManagedEvent,
  createdBy = 'Admin'
): Promise<EventNotification> {
  const dateFormatted = new Date(event.event_date).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const notification: EventNotification = {
    id: crypto.randomUUID(),
    event_id: event.id,
    title: '🎉 New Event Created!',
    message: `"${event.title}" has been scheduled for ${dateFormatted}${event.location ? ` in ${event.location}` : ''}.`,
    event_title: event.title,
    event_date: event.event_date,
    location: event.location,
    created_by: createdBy,
    created_at: new Date().toISOString(),
  }

  // Attempt to save to Supabase
  try {
    await supabase.from('event_notifications').insert({
      id: notification.id,
      event_id: notification.event_id,
      title: notification.title,
      message: notification.message,
      event_title: notification.event_title,
      event_date: notification.event_date,
      location: notification.location,
      created_by: notification.created_by,
      created_at: notification.created_at,
    })
  } catch {
    // If Supabase table isn't migrated yet, local fallback takes over
  }

  // Dispatch both in-app and browser notifications
  await dispatchEventNotification(notification)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('vault-events-changed'))
  }

  return notification
}

/**
 * Get IDs of notifications marked as seen by a specific user
 */
export function getSeenNotificationIds(userKey: string): string[] {
  if (typeof window === 'undefined' || !userKey) return []
  try {
    const raw = localStorage.getItem(`${SEEN_NOTIFICATIONS_PREFIX}${userKey}`)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

/**
 * Mark a notification as seen for a specific user
 */
export function markNotificationAsSeen(userKey: string, notificationId: string) {
  if (typeof window === 'undefined' || !userKey || !notificationId) return
  try {
    const seen = getSeenNotificationIds(userKey)
    if (!seen.includes(notificationId)) {
      const updated = [...seen, notificationId]
      localStorage.setItem(`${SEEN_NOTIFICATIONS_PREFIX}${userKey}`, JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent('vault-notifications-updated'))
    }
  } catch { /* ignore */ }
}

/**
 * Mark all notifications as seen for a specific user
 */
export function markAllNotificationsAsSeen(userKey: string, notificationIds: string[]) {
  if (typeof window === 'undefined' || !userKey) return
  try {
    const existing = getSeenNotificationIds(userKey)
    const combined = Array.from(new Set([...existing, ...notificationIds]))
    localStorage.setItem(`${SEEN_NOTIFICATIONS_PREFIX}${userKey}`, JSON.stringify(combined))
    window.dispatchEvent(new CustomEvent('vault-notifications-updated'))
  } catch { /* ignore */ }
}

/**
 * Check for unread event notifications when a user logs in.
 * Triggers the browser push notification and in-app toast for any new events.
 */
export async function checkUnreadNotificationsOnLogin(userKey: string): Promise<EventNotification[]> {
  if (!userKey) return []

  const allNotifications = await getNotifications()
  const seenIds = getSeenNotificationIds(userKey)

  // Filter notifications not yet seen by this user
  const unread = allNotifications.filter(n => !seenIds.includes(n.id))

  if (unread.length > 0) {
    // Trigger in-app toast for the most recent unread event
    const newest = unread[0]
    dispatchEventNotification(newest)
  }

  return unread
}

/**
 * Trigger a test event notification for admin testing.
 * Emulates both browser notification and in-app toast.
 */
export async function triggerTestNotification(adminName = 'Admin'): Promise<EventNotification> {
  let targetEventId: string | undefined
  let eventTitle = 'Sheshi Global AI Summit 2026'
  let eventDate = new Date(Date.now() + 86400000 * 5).toISOString()
  let location = 'San Francisco, CA & Virtual'

  try {
    const existingEvents = await getEvents()
    if (existingEvents.length > 0) {
      const topEvent = existingEvents[0]
      targetEventId = topEvent.id
      eventTitle = topEvent.title
      eventDate = topEvent.event_date
      location = topEvent.location || location
    } else {
      const sample = await createEvent({
        title: eventTitle,
        description: 'Annual corporate innovation summit with live product reveals, hands-on workshops, and partner keynotes.',
        event_date: eventDate,
        end_date: null,
        location: location,
        product_id: null,
        event_type: 'In-person',
        banner: null,
      })
      targetEventId = sample.id
    }
  } catch { /* fallback */ }

  const testId = crypto.randomUUID()
  const notification: EventNotification = {
    id: testId,
    event_id: targetEventId,
    title: '🔔 Test: New Event Created!',
    message: `"${eventTitle}" has been scheduled with live agendas and resources. Click to view event details.`,
    event_title: eventTitle,
    event_date: eventDate,
    location: location,
    created_by: adminName,
    created_at: new Date().toISOString(),
  }

  // Request browser permission if not yet decided, then trigger
  if (isNotificationSupported() && Notification.permission === 'default') {
    try {
      await Notification.requestPermission()
    } catch { /* ignore */ }
  }

  await dispatchEventNotification(notification)
  return notification
}

/**
 * Subscribe to realtime notifications via Supabase Realtime channel and BroadcastChannel
 */
export function subscribeToRealtimeNotifications(onReceive: (notification: EventNotification) => void): () => void {
  // Listen on local window custom event
  const handleLocal = (e: Event) => {
    const custom = e as CustomEvent<EventNotification>
    if (custom.detail) {
      onReceive(custom.detail)
    }
  }
  window.addEventListener('vault-event-notification', handleLocal)

  // Listen on cross-tab BroadcastChannel
  const handleBroadcast = (e: MessageEvent) => {
    if (e.data && e.data.title) {
      sendBrowserPushNotification(e.data)
      onReceive(e.data)
    }
  }
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast)
  }

  // Listen on Supabase Realtime channel
  let supabaseChannel: ReturnType<typeof supabase.channel> | null = null
  try {
    supabaseChannel = supabase
      .channel(REALTIME_CHANNEL_NAME)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'event_notifications' },
        (payload) => {
          if (payload.new) {
            const notif: EventNotification = {
              id: payload.new.id,
              event_id: payload.new.event_id,
              title: payload.new.title,
              message: payload.new.message,
              event_title: payload.new.event_title,
              event_date: payload.new.event_date,
              location: payload.new.location,
              created_by: payload.new.created_by,
              created_at: payload.new.created_at,
            }
            saveLocalNotification(notif)
            sendBrowserPushNotification(notif)
            onReceive(notif)
            window.dispatchEvent(new CustomEvent('vault-notifications-updated'))
          }
        }
      )
      .subscribe()
  } catch {
    // Realtime channel fallback
  }

  return () => {
    window.removeEventListener('vault-event-notification', handleLocal)
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast)
    }
    if (supabaseChannel) {
      supabase.removeChannel(supabaseChannel)
    }
  }
}
