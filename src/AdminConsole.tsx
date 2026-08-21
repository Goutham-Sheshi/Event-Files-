import { useState } from 'react'
import AdminEvents from './AdminEvents'
import AdminResources from './AdminResources'

export default function AdminConsole() {
  const [tab, setTab] = useState<'events' | 'resources'>('events')
  return <div data-admin-console="true" className="flex-1 self-stretch w-full overflow-y-auto">
    <div className="px-8 pt-5 border-b border-[var(--line-soft)] bg-white sticky top-0 z-10">
      <div className="flex items-center gap-1">
        <button onClick={()=>setTab('events')} className={`px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-colors ${tab==='events' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--ink-45)] hover:text-[var(--ink)]'}`}>Events</button>
        <button onClick={()=>setTab('resources')} className={`px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-colors ${tab==='resources' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--ink-45)] hover:text-[var(--ink)]'}`}>Related Products & Files</button>
      </div>
    </div>
    {tab === 'events' ? <AdminEvents /> : <AdminResources />}
  </div>
}
