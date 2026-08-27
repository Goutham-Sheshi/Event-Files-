import { useEffect, useState, type ReactNode } from 'react'
import AdminEvents from './AdminEvents'
import AdminResources from './AdminResources'
import AdminUsers from './AdminUsers'
import { getMyProfile, type VaultProfile } from './authApi'

type IconName = 'user' | 'calendar' | 'folder'
function NavIcon({ name }: { name: IconName }) { const paths: Record<IconName, ReactNode> = { user: <><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></>, calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>, folder: <><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></> }; return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">{paths[name]}</svg> }

export default function AdminConsole() {
  const [profile, setProfile] = useState<VaultProfile | null>(null)
  const [tab, setTab] = useState<'users' | 'events' | 'resources'>('resources')
  useEffect(() => { getMyProfile().then(p => { setProfile(p); if (p?.role === 'admin') setTab('users') }) }, [])
  if (!profile) return <div className="p-8 text-sm text-[var(--ink-45)]">Loading access…</div>
  const isAdmin = profile.role === 'admin'
  const tabs = isAdmin ? [{ id: 'users' as const, label: 'User Info & Access', icon: 'user' as IconName }, { id: 'events' as const, label: 'Events', icon: 'calendar' as IconName }, { id: 'resources' as const, label: 'Related Products & Files', icon: 'folder' as IconName }] : [{ id: 'resources' as const, label: 'Upload & Files', icon: 'folder' as IconName }]
  return <div data-admin-console="true" className="flex-1 self-stretch w-full min-w-0 min-h-0 flex flex-col"><div className="px-8 pt-5 border-b border-[var(--line-soft)] bg-white sticky top-0 z-10"><div className="flex items-center gap-1">{tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold border-b-2 ${tab === item.id ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--ink-45)]'}`}><NavIcon name={item.icon} />{item.label}</button>)}</div></div>{isAdmin && tab === 'users' ? <AdminUsers /> : isAdmin && tab === 'events' ? <AdminEvents onChanged={() => window.dispatchEvent(new Event('vault-events-changed'))} /> : <AdminResources canDelete={isAdmin} />}</div>
}
