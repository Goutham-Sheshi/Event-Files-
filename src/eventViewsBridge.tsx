import { createRoot, type Root } from 'react-dom/client'
import { useEffect, useState } from 'react'
import { getEvents, type ManagedEvent } from './eventsApi'
import { products } from './data'

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=85',
]

const imageFor = (event: ManagedEvent) => event.banner || FALLBACK_IMAGES[Math.abs([...event.id].reduce((n, c) => n * 31 + c.charCodeAt(0), 7)) % FALLBACK_IMAGES.length]

// Parse YYYY-MM-DD as a local calendar date. new Date('YYYY-MM-DD') is UTC and can
// shift the displayed/comparison date depending on the user's timezone.
const localEventDate = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return new Date(value)
  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

const startOfToday = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

const eventDay = (event: ManagedEvent) => {
  const date = localEventDate(event.event_date)
  date.setHours(0, 0, 0, 0)
  return date
}

const isUpcoming = (event: ManagedEvent) => eventDay(event).getTime() >= startOfToday().getTime()
const productFor = (event: ManagedEvent) => products.find(p => p.id === event.product_id)
const dateText = (event: ManagedEvent) => localEventDate(event.event_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
const metaText = (event: ManagedEvent) => [event.location, event.event_type].filter(Boolean).join(' · ')
const daysLeft = (event: ManagedEvent) => Math.max(0, Math.round((eventDay(event).getTime() - startOfToday().getTime()) / 86400000))
const eventSort = (a: ManagedEvent, b: ManagedEvent) => eventDay(a).getTime() - eventDay(b).getTime()

function useLiveEvents() {
  const [events, setEvents] = useState<ManagedEvent[]>([])
  const load = () => getEvents().then(data => setEvents(data)).catch(() => {})
  useEffect(() => {
    load()
    const timer = window.setInterval(load, 15000)
    const refresh = () => { if (!document.hidden) load() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  return events
}

function ProductPill({ event }: { event: ManagedEvent }) {
  const product = productFor(event)
  if (!product) return null
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/85 text-[11px] font-semibold" style={{ color: product.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: product.color }} />{product.name}</span>
}

function SmallEventCard({ event }: { event: ManagedEvent }) {
  return <div className="rounded-xl border border-[var(--line-soft)] bg-white p-4 flex gap-3 min-h-[92px] overflow-hidden">
    <img src={imageFor(event)} className="w-20 h-16 rounded-lg object-cover flex-shrink-0" alt="" />
    <div className="min-w-0 flex-1"><div className="mb-1"><ProductPill event={event} /></div><div className="text-[13px] font-semibold text-[var(--ink)] truncate">{event.title}</div><div className="text-[11px] text-[var(--ink-45)] mt-1">{dateText(event)}{metaText(event) ? ` · ${metaText(event)}` : ''}</div></div>
  </div>
}

function HomeUpcoming() {
  const events = useLiveEvents().filter(isUpcoming).sort(eventSort)
  if (!events.length) return <div className="w-full text-[13px] text-[var(--ink-45)] py-6">No upcoming events.</div>
  const [first, ...rest] = events
  return <div className="w-full mt-3 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 items-stretch">
    <div className="relative overflow-hidden rounded-2xl min-h-[196px] bg-[var(--canvas-deep)]"><img src={imageFor(first)} className="absolute inset-0 w-full h-full object-cover" alt="" /><div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" /><div className="absolute top-4 left-4"><ProductPill event={first} /></div><div className="absolute top-4 right-4 px-2.5 py-1 rounded-md bg-white/85 text-[11px] font-semibold text-[var(--ink)]">{daysLeft(first) === 0 ? 'TODAY' : `${daysLeft(first)} DAYS LEFT`}</div><div className="absolute left-5 right-5 bottom-5 text-white"><div className="font-display text-[20px] font-bold">{first.title}</div><div className="text-[11px] text-white/80 mt-1">{dateText(first)}{metaText(first) ? ` · ${metaText(first)}` : ''}</div></div></div>
    <div className="flex flex-col gap-3">{rest.slice(0, 2).map(event => <SmallEventCard key={event.id} event={event} />)}{rest.length === 0 && <div className="rounded-xl border border-dashed border-[var(--line-soft)] flex-1 min-h-[92px] flex items-center justify-center text-[12px] text-[var(--ink-45)]">More events will appear here</div>}</div>
  </div>
}

function EventsListing() {
  const all = useLiveEvents().sort(eventSort)
  const upcoming = all.filter(isUpcoming)
  const past = all.filter(event => !isUpcoming(event)).reverse()
  const render = (event: ManagedEvent) => <div key={event.id} className="rounded-xl border border-[var(--line-soft)] bg-white overflow-hidden"><img src={imageFor(event)} className="w-full h-36 object-cover" alt="" /><div className="p-4"><div className="flex items-center justify-between gap-3 mb-2"><ProductPill event={event} /><span className="text-[11px] text-[var(--ink-45)]">{isUpcoming(event) ? (daysLeft(event) === 0 ? 'Today' : `${daysLeft(event)}d`) : 'Past'}</span></div><div className="font-display text-[14px] font-bold text-[var(--ink)]">{event.title}</div><div className="text-[11px] text-[var(--ink-45)] mt-1.5">{dateText(event)}{metaText(event) ? ` · ${metaText(event)}` : ''}</div></div></div>
  return <div className="flex-1 overflow-y-auto"><div className="px-8 py-6 max-w-[1400px] flex flex-col gap-8 pb-8"><h1 className="font-display text-[22px] font-bold text-[var(--ink)] tracking-tight">Events</h1><section><h2 className="font-display text-[15px] font-bold text-[var(--ink)] mb-3">Upcoming</h2>{upcoming.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{upcoming.map(render)}</div> : <div className="text-[13px] text-[var(--ink-45)] py-8">No upcoming events.</div>}</section>{past.length > 0 && <section><h2 className="font-display text-[15px] font-bold text-[var(--ink)] mb-3">Past</h2><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">{past.map(render)}</div></section>}</div></div>
}

let homeHost: HTMLElement | null = null
let homeRoot: Root | null = null
let eventsHost: HTMLElement | null = null
let eventsRoot: Root | null = null

function mountHome(host: HTMLElement) {
  if (homeHost === host) return
  homeRoot?.unmount(); homeHost = host; host.innerHTML = ''
  homeRoot = createRoot(host); homeRoot.render(<HomeUpcoming />)
}

function mountEvents(host: HTMLElement) {
  if (eventsHost === host) return
  eventsRoot?.unmount(); eventsHost = host; host.innerHTML = ''
  eventsRoot = createRoot(host); eventsRoot.render(<EventsListing />)
}

export function startEventViewsBridge() {
  const scan = () => {
    const eventsTitle = Array.from(document.querySelectorAll('h1')).find(el => el.textContent?.trim() === 'Events') as HTMLElement | undefined
    if (eventsTitle) {
      const page = eventsTitle.parentElement
      if (page) mountEvents(page)
      return
    }
    const upcomingTitle = Array.from(document.querySelectorAll('h2')).find(el => el.textContent?.trim() === 'Upcoming Events') as HTMLElement | undefined
    if (upcomingTitle) {
      const section = upcomingTitle.parentElement
      if (section) {
        // The original generated layout can be a flex/grid container. Force the live
        // events section into a normal vertical flow so the heading stays above the cards.
        section.style.display = 'block'
        section.style.width = '100%'
        section.style.alignItems = 'stretch'
        let host = section.querySelector(':scope > [data-live-events]') as HTMLElement | null
        if (!host) { host = document.createElement('div'); host.dataset.liveEvents = 'true'; section.appendChild(host) }
        host.style.display = 'block'
        host.style.width = '100%'
        host.style.maxWidth = 'none'
        Array.from(section.children).forEach(child => { if (child !== upcomingTitle && child !== host) child.remove() })
        mountHome(host)
      }
    }
  }
  const observer = new MutationObserver(scan)
  observer.observe(document.body, { childList: true, subtree: true })
  scan()
}
