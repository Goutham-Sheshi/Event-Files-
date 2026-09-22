import React, { useEffect, useState, type ReactNode } from 'react'
import AdminEvents from './AdminEvents'
import AdminResources from './AdminResources'
import AdminUsers from './AdminUsers'
import InviteUsersModal from './components/InviteUsersModal'
import { getMyProfile, type VaultProfile } from './authApi'

type IconName = 'user' | 'calendar' | 'folder'

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    user: (
      <>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    folder: (
      <>
        <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </>
    ),
  }
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4 shrink-0"
    >
      {paths[name]}
    </svg>
  )
}

export default function AdminConsole() {
  const [profile, setProfile] = useState<VaultProfile | null>(null)
  const [tab, setTab] = useState<'users' | 'events' | 'resources'>('resources')
  const [showInvite, setShowInvite] = useState(false)

  useEffect(() => {
    getMyProfile().then((p) => {
      setProfile(p)
      if (p?.role === 'admin') setTab('users')
    })
  }, [])

  if (!profile) {
    return (
      <div className="p-12 text-center text-sm font-mono text-[var(--ink-45)]">
        Verifying administrative authorization…
      </div>
    )
  }

  const isAdmin = profile.role === 'admin'
  const isAdvanced = profile.role === 'teammate' || profile.role === 'advanced'

  if (!isAdmin && !isAdvanced) {
    return (
      <div className="p-12 text-center text-sm text-[var(--ink-45)]">
        You do not have administrative upload access.
      </div>
    )
  }

  if (isAdvanced) {
    return (
      <div data-admin-console="true" className="flex-1 self-stretch w-full min-w-0 min-h-0 overflow-y-auto">
        <AdminResources canDelete={true} />
      </div>
    )
  }

  const tabs = [
    { id: 'users' as const, label: 'User Directory & Access', icon: 'user' as IconName },
    { id: 'events' as const, label: 'Event Operations', icon: 'calendar' as IconName },
    { id: 'resources' as const, label: 'Resource Repository', icon: 'folder' as IconName },
  ]

  return (
    <div data-admin-console="true" className="flex-1 self-stretch w-full min-w-0 min-h-0 flex flex-col bg-[var(--canvas)]">
      {/* 21st.dev Segmented Pill Control Bar */}
      <div className="px-8 py-4 border-b border-[var(--border)] bg-[var(--surface-card)] backdrop-blur-xl sticky top-0 z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="badge-pill mb-1">
              <span className="pulse-dot bg-amber-400" />
              SYSTEM GOVERNANCE
            </div>
            <div className="font-display text-[18px] font-bold text-[var(--ink)]">
              Administrative Console
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[var(--surface-2)] p-1 rounded-2xl border border-[var(--border)]">
              {tabs.map((i) => (
                <button
                  key={i.id}
                  onClick={() => setTab(i.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    tab === i.id
                      ? 'bg-[var(--primary)] text-white shadow-md shadow-orange-500/20'
                      : 'text-[var(--ink-45)] hover:text-[var(--ink)]'
                  }`}
                >
                  <NavIcon name={i.icon} />
                  <span>{i.label}</span>
                </button>
              ))}
            </div>

            {isAdmin && tab === 'users' && (
              <button
                onClick={() => setShowInvite(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-2)] border border-[var(--border)] text-[12px] font-semibold text-[var(--ink)] whitespace-nowrap cursor-pointer transition-colors shadow-xs"
              >
                <span>+</span>
                <span>Invite Members</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {tab === 'users' ? (
        <AdminUsers />
      ) : tab === 'events' ? (
        <AdminEvents onChanged={() => window.dispatchEvent(new Event('vault-events-changed'))} />
      ) : (
        <AdminResources canDelete />
      )}

      {showInvite && isAdmin && <InviteUsersModal onClose={() => setShowInvite(false)} />}
    </div>
  )
}
