import React, { useEffect, useState } from 'react'
import type { EventNotification } from '../notificationsApi'

interface NotificationToastProps {
  onSelectEvent: (eventId: string) => void
}

interface ActiveToast {
  notification: EventNotification
  id: string
}

export default function NotificationToast({ onSelectEvent }: NotificationToastProps) {
  const [toasts, setToasts] = useState<ActiveToast[]>([])

  useEffect(() => {
    const handleNotification = (e: Event) => {
      const customEvent = e as CustomEvent<EventNotification>
      if (customEvent.detail) {
        const item: ActiveToast = {
          notification: customEvent.detail,
          id: `${customEvent.detail.id}-${Date.now()}`,
        }
        setToasts((prev) => [item, ...prev.slice(0, 2)]) // Keep max 3 toasts visible

        // Auto-dismiss after 8 seconds
        setTimeout(() => {
          setToasts((current) => current.filter((t) => t.id !== item.id))
        }, 8000)
      }
    }

    window.addEventListener('vault-event-notification', handleNotification)
    return () => window.removeEventListener('vault-event-notification', handleNotification)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
      {toasts.map(({ notification, id }) => (
        <div
          key={id}
          className="pointer-events-auto bg-[var(--paper)] text-[var(--ink)] border border-[var(--border-2)] shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl p-4.5 backdrop-blur-2xl animate-in slide-in-from-top-4 duration-300 transition-all hover:border-[var(--primary)]/50 relative overflow-hidden group"
        >
          {/* Subtle top accent gradient */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500 via-indigo-500 to-teal-400" />

          <div className="flex items-start gap-3.5 mt-1">
            {/* Radar status icon */}
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center flex-shrink-0 text-orange-400 relative">
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-orange-400 animate-ping" />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-semibold tracking-wider uppercase text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                    EVENT TELEMETRY
                  </span>
                  <span className="text-[11px] font-semibold text-[var(--ink)] truncate max-w-[170px]">
                    {notification.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== id))}
                  className="text-[var(--ink-45)] hover:text-[var(--ink)] transition-colors p-1 -mr-1 -mt-1 rounded-lg hover:bg-[var(--canvas)]"
                  aria-label="Dismiss notification"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <p className="text-[13px] font-medium text-[var(--ink)] leading-snug line-clamp-2 mt-1">
                {notification.message}
              </p>

              {/* Monospace Metadata Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                {notification.event_date && (
                  <span className="inline-flex items-center gap-1 font-mono text-[10.5px] font-medium text-[var(--ink-70)] bg-[var(--surface-1)] px-2 py-0.5 rounded-md border border-[var(--border-1)]">
                    <span className="text-orange-400">📅</span> {new Date(notification.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
                {notification.location && (
                  <span className="inline-flex items-center gap-1 font-mono text-[10.5px] font-medium text-[var(--ink-70)] bg-[var(--surface-1)] px-2 py-0.5 rounded-md border border-[var(--border-1)]">
                    <span className="text-indigo-400">📍</span> {notification.location}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3.5 pt-2.5 border-t border-[var(--border-1)]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectEvent(notification.event_id || 'events')
                    setToasts((prev) => prev.filter((t) => t.id !== id))
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-white text-[11.5px] font-bold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_4px_12px_rgba(249,115,22,0.3)]"
                >
                  <span>View Event</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setToasts((prev) => prev.filter((t) => t.id !== id))
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-1)] hover:bg-[var(--canvas)] text-[var(--ink-45)] hover:text-[var(--ink)] text-[11.5px] font-medium transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
