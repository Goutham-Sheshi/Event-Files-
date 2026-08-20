import { FormEvent, useEffect, useState } from 'react'
import { createEvent, deleteEvent, getEvents, updateEvent, type EventInput, type ManagedEvent } from './eventsApi'
import { products } from './data'

const emptyForm = (): EventInput => ({ title: '', description: '', event_date: '', location: '', product_id: null, event_type: 'In-person', banner: '' })

function toLocalInput(value: string) {
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AdminEvents({ onChanged }: { onChanged?: () => void }) {
  const [events, setEvents] = useState<ManagedEvent[]>([])
  const [form, setForm] = useState<EventInput>(emptyForm())
  const [editing, setEditing] = useState<ManagedEvent | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = async () => { try { setEvents(await getEvents()) } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load events') } }
  useEffect(() => { load() }, [])

  const startAdd = () => { setEditing(null); setForm(emptyForm()); setError(''); setOpen(true) }
  const startEdit = (event: ManagedEvent) => {
    setEditing(event)
    setForm({ title: event.title, description: event.description || '', event_date: toLocalInput(event.event_date), location: event.location || '', product_id: event.product_id, event_type: event.event_type, banner: event.banner || '' })
    setError(''); setOpen(true)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const payload: EventInput = { ...form, event_date: new Date(form.event_date).toISOString(), description: form.description || null, location: form.location || null, banner: form.banner || null }
      if (editing) await updateEvent(editing.id, payload); else await createEvent(payload)
      setOpen(false); await load(); onChanged?.()
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save event') }
    finally { setBusy(false) }
  }

  const remove = async (event: ManagedEvent) => {
    if (!window.confirm(`Delete “${event.title}”? This cannot be undone.`)) return
    try { setBusy(true); await deleteEvent(event.id); await load(); onChanged?.() }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete event') }
    finally { setBusy(false) }
  }

  return <div className="flex-1 overflow-y-auto"><div className="px-8 py-6 max-w-[1400px]">
    <div className="flex items-start justify-between gap-4 mb-6">
      <div><h1 className="font-display text-[22px] font-bold text-[var(--ink)] tracking-tight">Events</h1><p className="text-[13px] text-[var(--ink-45)] mt-1">Manage upcoming and past events.</p></div>
      <button onClick={startAdd} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-[12px] font-semibold hover:bg-[var(--primary-hover)]">+ Add Event</button>
    </div>
    {error && <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-[12px]">{error}</div>}
    <div className="bg-white border border-[var(--line-soft)] rounded-xl overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-[var(--canvas)] border-b border-[var(--line-soft)] text-[11px] text-[var(--ink-45)] uppercase tracking-wide"><tr><th className="px-4 py-3">Event</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
      <tbody>{events.map(event => { const product = products.find(p => p.id === event.product_id); const upcoming = new Date(event.event_date).getTime() >= Date.now(); return <tr key={event.id} className="border-b border-[var(--line-soft)] last:border-0 text-[12.5px]"><td className="px-4 py-3 font-semibold text-[var(--ink)]">{event.title}</td><td className="px-4 py-3 text-[var(--ink-70)]">{product?.name || 'General'}</td><td className="px-4 py-3 text-[var(--ink-70)]">{new Date(event.event_date).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}</td><td className="px-4 py-3 text-[var(--ink-70)]">{event.location || '—'}</td><td className="px-4 py-3 text-[var(--ink-70)]">{event.event_type}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${upcoming ? 'bg-blue-50 text-blue-700' : 'bg-[var(--canvas-deep)] text-[var(--ink-45)]'}`}>{upcoming ? 'Upcoming' : 'Past'}</span></td><td className="px-4 py-3 text-right whitespace-nowrap"><button onClick={()=>startEdit(event)} className="text-[var(--primary)] font-semibold mr-3">Edit</button><button disabled={busy} onClick={()=>remove(event)} className="text-red-600 font-semibold disabled:opacity-40">Delete</button></td></tr> })}</tbody></table></div>
      {events.length===0 && <div className="py-12 text-center text-[13px] text-[var(--ink-45)]">No events yet.</div>}
    </div>
    {open && <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4"><form onSubmit={save} className="w-full max-w-xl bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center mb-5"><div><h2 className="font-display text-[18px] font-bold">{editing ? 'Edit Event' : 'Add Event'}</h2><p className="text-[12px] text-[var(--ink-45)] mt-1">Changes update the events across the app.</p></div><button type="button" onClick={()=>setOpen(false)} className="text-[var(--ink-45)] text-xl">×</button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="sm:col-span-2 text-[12px] font-medium">Event Name<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[var(--line-soft)] outline-none"/></label><label className="text-[12px] font-medium">Product<select value={form.product_id || ''} onChange={e=>setForm({...form,product_id:e.target.value||null})} className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[var(--line-soft)] bg-white"><option value="">General</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label className="text-[12px] font-medium">Date & Time<input required type="datetime-local" value={form.event_date} onChange={e=>setForm({...form,event_date:e.target.value})} className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[var(--line-soft)]"/></label><label className="text-[12px] font-medium">Location<input value={form.location || ''} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Bengaluru" className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[var(--line-soft)]"/></label><label className="text-[12px] font-medium">Event Type<select value={form.event_type} onChange={e=>setForm({...form,event_type:e.target.value as 'In-person'|'Virtual'})} className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[var(--line-soft)] bg-white"><option>In-person</option><option>Virtual</option></select></label><label className="sm:col-span-2 text-[12px] font-medium">Cover Image URL<input value={form.banner || ''} onChange={e=>setForm({...form,banner:e.target.value})} placeholder="https://..." className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[var(--line-soft)]"/></label><label className="sm:col-span-2 text-[12px] font-medium">Description<textarea value={form.description || ''} onChange={e=>setForm({...form,description:e.target.value})} rows={3} className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[var(--line-soft)]"/></label></div><div className="flex justify-end gap-2 mt-6"><button type="button" onClick={()=>setOpen(false)} className="px-4 py-2 text-[12px] font-semibold">Cancel</button><button disabled={busy} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-[12px] font-semibold disabled:opacity-50">{busy ? 'Saving…' : 'Save Event'}</button></div></form></div>}
  </div></div>
}
