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
          className="pointer-events-auto bg-[var(--paper)] text-[var(--ink)] border border-[var(--primary)]/30 shadow-2xl rounded-2xl p-4.5 backdrop-blur-xl animate-in slide-in-from-top-4 duration-300 transition-all hover:border-[var(--primary)]/60 relative overflow-hidden"
          style={{
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(var(--primary-rgb, 99, 102, 241), 0.15)',
          }}
        >
          {/* Subtle top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--primary)] via-indigo-400 to-purple-500 animate-pulse" />

          <div className="flex items-start gap-3.5 mt-1">
            {/* Icon Bubble */}
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/15 border border-[var(--primary)]/30 flex items-center justify-center flex-shrink-0 text-[var(--primary)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-bold tracking-wider uppercase text-[var(--primary)]">
                  {notification.title}
                </span>
                <button
                  type="button"
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== id))}
                  className="text-[var(--ink-45)] hover:text-[var(--ink)] transition-colors p-1 -mr-1 -mt-1 rounded-md"
                  aria-label="Dismiss notification"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <p className="text-[13px] font-semibold text-[var(--ink)] leading-snug line-clamp-2">
                {notification.message}
              </p>

              {/* Metadata tags */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {notification.event_date && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--ink-70)] bg-[var(--canvas-deep)] px-2 py-0.5 rounded-md border border-[var(--line-soft)]">
                    📅 {new Date(notification.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
                {notification.location && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--ink-70)] bg-[var(--canvas-deep)] px-2 py-0.5 rounded-md border border-[var(--line-soft)]">
                    📍 {notification.location}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[var(--line-soft)]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEvent(notification.event_id || 'events');
                    setToasts((prev) => prev.filter((t) => t.id !== id));
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[var(--primary)] text-white text-[12px] font-semibold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <span>View Event</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setToasts((prev) => prev.filter((t) => t.id !== id));
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--line-soft)] hover:bg-[var(--canvas)] text-[var(--ink-70)] text-[12px] font-medium transition-colors cursor-pointer"
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
