import React, { useEffect, useRef, useState } from 'react'
import {
  getNotifications,
  getSeenNotificationIds,
  markAllNotificationsAsSeen,
  markNotificationAsSeen,
  requestBrowserPermission,
  getNotificationPermission,
  isNotificationSupported,
  type EventNotification,
} from '../notificationsApi'

interface NotificationCenterProps {
  userKey: string
  onSelectEvent: (eventId: string) => void
}

export default function NotificationCenter({ userKey, onSelectEvent }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<EventNotification[]>([])
  const [seenIds, setSeenIds] = useState<string[]>([])
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const popoverRef = useRef<HTMLDivElement>(null)

  const reload = async () => {
    const list = await getNotifications()
    setNotifications(list)
    setSeenIds(getSeenNotificationIds(userKey))
    if (isNotificationSupported()) {
      setPermission(getNotificationPermission())
    }
  }

  useEffect(() => {
    reload()

    const handleUpdate = () => {
      reload()
    }

    window.addEventListener('vault-notifications-updated', handleUpdate)
    window.addEventListener('vault-event-notification', handleUpdate)

    return () => {
      window.removeEventListener('vault-notifications-updated', handleUpdate)
      window.removeEventListener('vault-event-notification', handleUpdate)
    }
  }, [userKey])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const unreadCount = notifications.filter((n) => !seenIds.includes(n.id)).length

  const handleMarkAllRead = () => {
    markAllNotificationsAsSeen(
      userKey,
      notifications.map((n) => n.id)
    )
    setSeenIds(notifications.map((n) => n.id))
  }

  const handleNotificationClick = (notification: EventNotification) => {
    markNotificationAsSeen(userKey, notification.id)
    setSeenIds((prev) => [...prev, notification.id])
    if (notification.event_id) {
      onSelectEvent(notification.event_id)
      setIsOpen(false)
    }
  }

  const handleEnableBrowserNotifications = async () => {
    const perm = await requestBrowserPermission()
    setPermission(perm)
  }

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) reload()
        }}
        className={`relative p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-[var(--surface-2)] border-[var(--primary)] text-[var(--primary)] shadow-sm'
            : 'bg-[var(--surface)] hover:bg-[var(--surface-2)] border-[var(--border)] hover:border-[var(--border-2)] text-[var(--ink-70)] hover:text-[var(--ink)]'
        }`}
        title="Event Notifications"
        aria-label="Event Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold shadow-md shadow-orange-500/30 animate-in zoom-in font-mono">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-[var(--paper)] text-[var(--ink)] border border-[var(--border-2)] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] rounded-3xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-card)]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[14px] text-[var(--ink)] font-display">Notifications</span>
              {unreadCount > 0 && (
                <span className="badge-pill bg-[var(--primary-soft)] text-[var(--primary)] border-[rgba(255,85,0,0.3)] text-[10px]">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11.5px] font-semibold text-[var(--primary)] hover:underline cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Browser Permission Banner */}
          {permission !== 'granted' && isNotificationSupported() && (
            <div className="px-4 py-3 bg-[var(--primary-soft)] border-b border-[var(--border)] flex items-center justify-between gap-3 text-[11.5px]">
              <div className="flex items-center gap-2 text-[var(--ink-70)]">
                <span>🔔</span>
                <span>Get browser alerts on other tabs</span>
              </div>
              <button
                type="button"
                onClick={handleEnableBrowserNotifications}
                className="px-2.5 py-1 rounded-lg bg-[var(--primary)] text-white font-semibold text-[11px] hover:opacity-90 transition-opacity cursor-pointer flex-shrink-0 shadow-xs"
              >
                Enable
              </button>
            </div>
          )}

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[var(--border)]">
            {notifications.length === 0 ? (
              <div className="px-6 py-12 text-center text-[var(--ink-45)]">
                <div className="text-2xl mb-2">🎉</div>
                <div className="text-[13px] font-bold text-[var(--ink)]">All caught up!</div>
                <div className="text-[11px] text-[var(--ink-45)] mt-1 font-mono">
                  You'll be notified here when a new corporate summit or event is published.
                </div>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !seenIds.includes(notif.id)
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 hover:bg-[var(--surface-2)] transition-colors cursor-pointer flex items-start gap-3 relative group ${
                      isUnread ? 'bg-[var(--primary-soft)]/50' : ''
                    }`}
                  >
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-[var(--primary)] mt-1.5 flex-shrink-0 shadow-sm" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--primary)]">
                          {notif.title}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--ink-45)] whitespace-nowrap">
                          {new Date(notif.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="text-[13px] font-semibold text-[var(--ink)] mt-0.5 line-clamp-1 group-hover:text-[var(--primary)] transition-colors">
                        {notif.event_title}
                      </div>

                      <p className="text-[11.5px] text-[var(--ink-70)] mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="flex items-center gap-2 mt-2 pt-1 border-t border-[var(--border)]">
                        {notif.event_date && (
                          <span className="badge-pill text-[9.5px]">
                            📅 {new Date(notif.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        {notif.event_id && (
                          <span className="text-[11px] font-semibold text-[var(--primary)] ml-auto group-hover:underline flex items-center gap-0.5 font-mono">
                            View Event →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
