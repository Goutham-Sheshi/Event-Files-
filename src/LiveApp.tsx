import React, { useEffect, useMemo, useState } from 'react'
import { products } from './data'
import { getManagedResources } from './resourcesApi'
import { getEvents, calculateEventStatus, type ManagedEvent } from './eventsApi'
import type { Product, Resource, ResourceType } from './types'
import AdminConsole from './AdminConsole'
import { getMyProfile, signOut, type VaultProfile } from './authApi'
import AuthScreen, { type AuthMode } from './components/AuthScreen'
import { supabase } from './lib/supabase'
import { triggerDirectDownload } from './utils'
import { openViewer } from './fileViewerBridge'
import EventPage from './components/EventPage'
import VideosPage, { VideoCard } from './components/VideosPage'
import { getFavoriteIds, isFavoriteId, toggleFavoriteId } from './favoritesApi'

const Icon = ({ children }: { children: React.ReactNode }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
const HomeIcon = () => <Icon><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22v-8h6v8" /></Icon>
const GridIcon = () => <Icon><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></Icon>
const DownloadIcon = () => <Icon><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></Icon>
const CalIcon = () => <Icon><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Icon>
const ShieldIcon = () => <Icon><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></Icon>
const FileIcon = () => <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></Icon>
const CompanyIcon = () => <Icon><path d="M4 21V7l8-4 8 4v14" /><path d="M8 21v-5h8v5M8 10h.01M12 10h.01M16 10h.01" /></Icon>
const PanelIcon = ({ collapsed }: { collapsed: boolean }) => <Icon><rect x="3" y="4" width="18" height="16" rx="2" /><path d={collapsed ? 'M14 8l4 4-4 4' : 'M10 8l-4 4 4 4'} /><path d="M9 4v16" /></Icon>
const PlayIcon = () => <Icon><path d="m8 5 11 7-11 7z" /></Icon>
const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)
const Chevron = ({ open }: { open: boolean }) => <span style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s' }}>›</span>

type View = { kind: 'home' } | { kind: 'product'; slug: string } | { kind: 'sheshi' } | { kind: 'all' } | { kind: 'events' } | { kind: 'videos' } | { kind: 'favorites' } | { kind: 'admin' } | { kind: 'event-detail'; id: string }
const SHESHI_ID = 'sheshi'
const productOf = (id: string) => products.find(p => p.id === id || p.slug === id)
const localDate = (v: string) => { const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(v) }
const dateText = (v: string) => localDate(v).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

function ProductBadge({ product }: { product?: Product }) { if (!product) return null; return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: product.light, color: product.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: product.color }} />{product.name}</span> }

function ResourceCard({ resource }: { resource: Resource }) {
  const [fav, setFav] = useState(isFavoriteId(resource.id))

  useEffect(() => {
    const handleFavChange = () => setFav(isFavoriteId(resource.id))
    window.addEventListener('vault-favorites-changed', handleFavChange)
    return () => window.removeEventListener('vault-favorites-changed', handleFavChange)
  }, [resource.id])

  if (resource.type === 'video') return <VideoCard resource={resource} />
  const p = resource.productId === SHESHI_ID ? { id: SHESHI_ID, name: 'Sheshi', slug: 'sheshi', color: '#ff5500', light: '#3a2214', description: 'Shared Sheshi resources' } as Product : productOf(resource.productId);
  const isVideo = resource.type === 'video';
  const tags = (resource.tags || []).filter(Boolean).slice(0, 3);
  const isOfficial = resource.isOfficial || resource.contentStatus === 'Official';

  return (
    <div
      data-resource-id={resource.id}
      data-resource-tags={JSON.stringify(resource.tags || [])}
      data-resource-type={resource.type}
      data-resource-description={resource.description || ''}
      className="group bg-white border border-[var(--line-soft)] rounded-xl overflow-hidden flex flex-col hover:shadow-lg transition-shadow cursor-pointer relative"
      onClick={() => { if (resource.sourceUrl) { openViewer(resource.sourceUrl, resource.title, resource.id, (resource.tags || []), resource.type, resource.description || '', resource.contentStatus || 'Active', resource.version || 'v1.0') } }}
    >
      <div className="h-40 bg-[var(--canvas-deep)] flex items-center justify-center overflow-hidden relative">
        {resource.thumbnail ? (
          <img src={resource.thumbnail} alt={resource.title} className="w-full h-full object-cover" style={{ objectPosition: 'left top' }} loading="lazy" onError={e => { e.currentTarget.style.display = 'none' }} />
        ) : (
          <FileIcon />
        )}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <span className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center"><PlayIcon /></span>
          </div>
        )}
        {resource.fileFormat && (
          <span className="absolute top-2 right-2 bg-black/50 text-white rounded px-2 py-1 text-[9px] font-mono font-bold uppercase">{resource.fileFormat}</span>
        )}
        {isOfficial && (
          <span className="absolute top-2 left-2 bg-[var(--primary)] text-white rounded-full px-2 py-0.5 text-[9px] font-bold shadow-xs">Official ✓</span>
        )}

        {/* Favorite Star Toggle Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavoriteId(resource.id);
          }}
          className={`absolute bottom-2 right-2 p-1.5 rounded-full transition-all cursor-pointer ${fav ? 'bg-[var(--primary)] text-white shadow-md' : 'bg-black/40 text-white/80 hover:bg-black/70'}`}
          title={fav ? 'Remove from Favorites' : 'Add to Favorites'}
        >
          <StarIcon filled={fav} />
        </button>
      </div>

      <div className="p-3.5 flex flex-col gap-2 flex-1">
        <div className="line-clamp-2 text-[15px] leading-[1.2] font-semibold min-h-[38px]">{resource.title}</div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">{tags.map(tag => <span key={tag} className="resource-tag">{tag}</span>)}</div>
        )}
        <div className="flex items-center gap-2">
          <ProductBadge product={p} />
          {resource.version && <span className="bg-[var(--canvas-deep)] text-[var(--ink-45)] px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border border-[var(--line-soft)]">{resource.version}</span>}
          {resource.fileSize && <span className="text-[10px] text-[var(--ink-45)]">{resource.fileSize}</span>}
        </div>
        <div className="mt-auto flex justify-between items-center text-[11px]">
          <span className="text-[var(--ink-45)]">{resource.viewCount || 0} views</span>
          {resource.sourceUrl && (
            <button onClick={(e) => { e.stopPropagation(); if (isVideo) { window.open(resource.sourceUrl!, '_blank', 'noreferrer') } else { triggerDirectDownload(resource.sourceUrl!, resource.title) } }} className="font-semibold text-[var(--ink)] hover:underline border-0 bg-transparent p-0 cursor-pointer">
              {isVideo ? 'Open Video' : 'Download'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ResourceGrid({ items }: { items: Resource[] }) { return items.length ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">{items.map(x => <ResourceCard key={x.id} resource={x} />)}</div> : <div className="py-14 text-center text-[13px] text-[var(--ink-45)]">No files here yet.</div> }

function eventFallback(event: ManagedEvent, product?: Product) { const a = product?.color || '#ff5500'; const b = product?.light || '#222c3a'; const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="#0f1319"/></linearGradient><filter id="f"><feGaussianBlur stdDeviation="70"/></filter></defs><rect width="1200" height="700" fill="url(#g)"/><circle cx="920" cy="110" r="240" fill="${b}" opacity=".38" filter="url(#f)"/><circle cx="210" cy="650" r="210" fill="#fff" opacity=".09"/><path d="M700 0C970 120 900 470 1200 610V0Z" fill="#fff" opacity=".06"/><path d="M0 510C250 410 420 590 690 500S980 350 1200 460" fill="none" stroke="#fff" stroke-opacity=".24" stroke-width="2"/><text x="72" y="635" fill="#fff" fill-opacity=".68" font-family="Arial,sans-serif" font-size="20" letter-spacing="4">SHESHI EVENT</text></svg>`; return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg) }

function EventCard({ event, hero, onClick }: { event: ManagedEvent; hero?: boolean; onClick?: () => void }) {
  const p = productOf(event.product_id || '');
  const status = calculateEventStatus(event);
  const meta = [event.location, event.event_type].filter(Boolean).join(' · ');
  const [fallback, setFallback] = useState(!event.banner);
  const src = fallback ? eventFallback(event, p) : event.banner || eventFallback(event, p);

  const statusBadge = (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${status === 'ongoing' ? 'bg-emerald-500 text-white' :
        status === 'upcoming' ? 'bg-blue-500 text-white' :
          'bg-slate-600 text-white'
      }`}>
      {status}
    </span>
  );

  if (hero) return (
    <div
      onClick={onClick}
      className="relative min-h-[240px] rounded-2xl overflow-hidden text-white shadow-sm cursor-pointer group hover:shadow-lg transition-all"
    >
      <img src={src} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" onError={() => setFallback(true)} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
      <div className="relative h-full min-h-[240px] p-6 flex flex-col justify-between">
        <div className="flex items-center gap-2">
          <ProductBadge product={p} />
          {statusBadge}
        </div>
        <div>
          <div className="font-display text-[clamp(22px,2.2vw,34px)] font-bold leading-tight group-hover:text-orange-300 transition-colors">{event.title}</div>
          <div className="text-[12px] text-white/80 mt-2">{dateText(event.event_date)}{meta ? ` · ${meta}` : ''}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      onClick={onClick}
      className="bg-white border border-[var(--line-soft)] rounded-xl overflow-hidden h-full flex flex-col cursor-pointer group hover:shadow-md transition-all hover:-translate-y-0.5"
    >
      <div className="relative h-36 overflow-hidden">
        <img src={src} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" onError={() => setFallback(true)} />
        <div className="absolute top-2.5 right-2.5">{statusBadge}</div>
      </div>
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <ProductBadge product={p} />
          <div className="font-semibold text-[14px] mt-2 group-hover:text-[var(--primary)] transition-colors">{event.title}</div>
        </div>
        <div className="text-[11px] text-[var(--ink-45)] mt-2">{dateText(event.event_date)}{meta ? ` · ${meta}` : ''}</div>
      </div>
    </div>
  );
}

function Home({ resources, events, onProduct, onSheshi, onSelectEvent }: { resources: Resource[]; events: ManagedEvent[]; onProduct: (s: string) => void; onSheshi: () => void; onSelectEvent: (id: string) => void }) {
  const [name, setName] = useState('');
  useEffect(() => setName(localStorage.getItem('sheshi-vault-user-name') || ''), []);

  const currentEvents = events.filter(e => {
    const s = calculateEventStatus(e);
    return s === 'ongoing' || s === 'upcoming';
  }).sort((a, b) => {
    const statusOrder = { ongoing: 1, upcoming: 2, completed: 3 };
    const orderA = statusOrder[calculateEventStatus(a)];
    const orderB = statusOrder[calculateEventStatus(b)];
    if (orderA !== orderB) return orderA - orderB;
    return localDate(a.event_date).getTime() - localDate(b.event_date).getTime();
  });

  const sheshiResources = resources.filter(r => r.productId === SHESHI_ID);
  const latest = [...resources].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 5);

  return <main className="flex-1 overflow-y-auto">
    <div className="px-8 py-6 max-w-[1400px] space-y-9">
      <div>
        <div className="text-[11px] font-mono text-[var(--ink-45)] uppercase tracking-wider">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <h1 className="font-display welcome-title mt-2">Welcome back{name && <> <em>{name}</em></>}</h1>
      </div>

      <section>
        <div className="flex items-end justify-between gap-4 mb-4">
          <h2 className="section-heading flex-1">Current & Upcoming Events</h2>
        </div>
        {currentEvents.length ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <EventCard event={currentEvents[0]} hero onClick={() => onSelectEvent(currentEvents[0].id)} />
            </div>
            <div className="flex flex-col gap-3">
              {currentEvents.slice(1, 3).map(e => (
                <EventCard key={e.id} event={e} onClick={() => onSelectEvent(e.id)} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-[13px] text-[var(--ink-45)] py-6">No current or upcoming events.</div>
        )}
      </section>

      <section>
        <div className="flex items-end justify-between gap-4 mb-4">
          <h2 className="section-heading flex-1">Sheshi</h2>
          {sheshiResources.length > 0 && <button onClick={onSheshi} className="text-[11px] font-semibold text-[var(--primary)] whitespace-nowrap cursor-pointer">View all</button>}
        </div>
        {sheshiResources.length ? <ResourceGrid items={sheshiResources.slice(0, 5)} /> : <button onClick={onSheshi} className="w-full text-left rounded-xl border border-[var(--line-soft)] bg-white p-5 text-[13px] text-[var(--ink-45)] hover:shadow-sm">Company files, CEO material, Sheshi information and other shared resources.</button>}
      </section>

      <section>
        <h2 className="section-heading mb-4">Products</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {products.map(p => <button key={p.id} onClick={() => onProduct(p.slug)} className="text-left rounded-xl border border-[var(--line-soft)] p-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer" style={{ background: `linear-gradient(135deg,${p.light} 0%,${p.light} 62%,${p.color}18 100%)`, borderColor: `${p.color}35` }}><div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold mb-2" style={{ background: p.light, color: p.color, boxShadow: `0 0 0 1px ${p.color}18` }}>{p.name[0]}</div><div className="font-semibold text-[13px]">{p.name}</div><div className="text-[11px] text-[var(--ink-45)] mt-1">{resources.filter(r => r.productId === p.id || r.productId === p.slug).length} files</div></button>)}
        </div>
      </section>

      <section className="pb-8">
        <h2 className="section-heading mb-4">Latest Resources</h2>
        <ResourceGrid items={latest} />
      </section>
    </div>
  </main>
}

function SearchIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg> }
function ListIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg> }
function GridViewIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg> }
function SortIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4" /><path d="M7 20V4" /><path d="m21 8-4-4-4 4" /><path d="M17 4v16" /></svg> }

function ResourceListRow({ resource }: { resource: Resource }) {
  const [fav, setFav] = useState(isFavoriteId(resource.id))

  useEffect(() => {
    const handleFavChange = () => setFav(isFavoriteId(resource.id))
    window.addEventListener('vault-favorites-changed', handleFavChange)
    return () => window.removeEventListener('vault-favorites-changed', handleFavChange)
  }, [resource.id])

  const p = resource.productId === SHESHI_ID ? { id: SHESHI_ID, name: 'Sheshi', slug: 'sheshi', color: '#ff5500', light: '#3a2214', description: 'Shared Sheshi resources' } as Product : productOf(resource.productId);
  const isVideo = resource.type === 'video';
  const tags = (resource.tags || []).filter(Boolean).slice(0, 3);
  const isOfficial = resource.isOfficial || resource.contentStatus === 'Official';

  return (
    <div
      className="group bg-white border border-[var(--line-soft)] rounded-xl p-3.5 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer"
      onClick={() => { if (resource.sourceUrl) { openViewer(resource.sourceUrl, resource.title, resource.id, (resource.tags || []), resource.type, resource.description || '', resource.contentStatus || 'Active', resource.version || 'v1.0') } }}
    >
      <div className="w-12 h-12 rounded-lg bg-[var(--canvas-deep)] flex items-center justify-center overflow-hidden flex-shrink-0 relative border border-[var(--line-soft)]">
        {resource.thumbnail ? (
          <img src={resource.thumbnail} alt={resource.title} className="w-full h-full object-cover" style={{ objectPosition: 'left top' }} loading="lazy" onError={e => { e.currentTarget.style.display = 'none' }} />
        ) : (
          <FileIcon />
        )}
        {isVideo && (
          <span className="absolute inset-0 bg-black/20 flex items-center justify-center text-white">
            <PlayIcon />
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-[14px] text-[var(--ink)] truncate group-hover:text-[var(--primary)] transition-colors">{resource.title}</span>
          {isOfficial && <span className="px-1.5 py-0.2 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] font-bold text-[9px] border border-[var(--primary)]/30">Official ✓</span>}
          {resource.fileFormat && (
            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border border-slate-200">{resource.fileFormat}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[var(--ink-45)] mt-1">
          <ProductBadge product={p} />
          {resource.version && <span className="font-mono font-bold">[{resource.version}]</span>}
          {resource.fileSize && <span>• {resource.fileSize}</span>}
          <span>• {resource.viewCount || 0} views</span>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="hidden md:flex flex-wrap gap-1">
          {tags.map(t => <span key={t} className="resource-tag">{t}</span>)}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavoriteId(resource.id);
          }}
          className={`p-2 rounded-lg transition-all cursor-pointer ${fav ? 'bg-[var(--primary)] text-white shadow-xs' : 'text-[var(--ink-45)] hover:bg-[var(--canvas-deep)]'}`}
          title={fav ? 'Remove from Favorites' : 'Add to Favorites'}
        >
          <StarIcon filled={fav} />
        </button>

        {resource.sourceUrl && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isVideo) { window.open(resource.sourceUrl!, '_blank', 'noreferrer') }
              else { triggerDirectDownload(resource.sourceUrl!, resource.title) }
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold transition-colors cursor-pointer"
          >
            {isVideo ? 'Open Video' : 'Download'}
          </button>
        )}
      </div>
    </div>
  )
}

function SmartResourceExplorer({ items }: { items: Resource[] }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'az' | 'views'>('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const typeCounts = useMemo(() => {
    const counts = { all: items.length, video: 0, logo: 0, brochure: 0, document: 0, other: 0 }
    items.forEach(r => {
      if (r.type in counts) { counts[r.type as keyof typeof counts]++ }
      else { counts.other++ }
    })
    return counts
  }, [items])

  // Phase 3 Ranked Search Engine Algorithm
  const filtered = useMemo(() => {
    let res = items.filter(r => {
      const matchesSearch = !search.trim() ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        (r.fileFormat && r.fileFormat.toLowerCase().includes(search.toLowerCase())) ||
        (r.description && r.description.toLowerCase().includes(search.toLowerCase())) ||
        (r.tags && r.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))

      const matchesType = typeFilter === 'all' ||
        (typeFilter === 'brand_assets' ? (r.type === 'logo' || r.type === 'brochure') : r.type === typeFilter)

      return matchesSearch && matchesType
    })

    return res.sort((a, b) => {
      // 1. Search Ranking: Exact title match > Partial title match
      if (search.trim()) {
        const clean = search.trim().toLowerCase()
        const titleExactA = a.title.toLowerCase() === clean ? 2 : a.title.toLowerCase().startsWith(clean) ? 1 : 0
        const titleExactB = b.title.toLowerCase() === clean ? 2 : b.title.toLowerCase().startsWith(clean) ? 1 : 0
        if (titleExactA !== titleExactB) return titleExactB - titleExactA
      }

      // 2. Official Badge Priority
      const officialA = a.isOfficial || a.contentStatus === 'Official' ? 1 : 0
      const officialB = b.isOfficial || b.contentStatus === 'Official' ? 1 : 0
      if (officialA !== officialB) return officialB - officialA

      // 3. User Selected Sort
      if (sortBy === 'newest') return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
      if (sortBy === 'oldest') return String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
      if (sortBy === 'az') return a.title.localeCompare(b.title)
      if (sortBy === 'views') return (b.viewCount || 0) - (a.viewCount || 0)
      return 0
    })
  }, [items, search, typeFilter, sortBy])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-2xl border border-[var(--line-soft)] shadow-sm">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search files by title, tags, format, or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--line-soft)] bg-[var(--canvas-deep)] text-[12.5px] outline-none focus:border-[var(--primary)]"
          />
          <span className="absolute left-3 top-2.5 text-[var(--ink-45)]"><SearchIcon /></span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="appearance-none bg-white border border-[var(--line-soft)] text-[12px] font-semibold text-[var(--ink-70)] py-2 pl-8 pr-7 rounded-xl outline-none cursor-pointer hover:border-[var(--line)]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="az">Title (A-Z)</option>
              <option value="views">Most Viewed</option>
            </select>
            <span className="absolute left-2.5 pointer-events-none text-[var(--ink-45)]"><SortIcon /></span>
            <span className="absolute right-2.5 pointer-events-none text-[11px] text-[var(--ink-45)]">▾</span>
          </div>

          <div className="flex rounded-xl border border-[var(--line-soft)] p-0.5 bg-[var(--canvas-deep)]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--ink-45)]'}`}
              title="Grid View"
            >
              <GridViewIcon />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--ink-45)]'}`}
              title="List View"
            >
              <ListIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-[12px] font-medium">
        {[
          { key: 'all', label: `All Files (${typeCounts.all})` },
          { key: 'video', label: `Videos (${typeCounts.video})` },
          { key: 'brand_assets', label: `Brand Assets (${typeCounts.logo + typeCounts.brochure})` },
          { key: 'document', label: `Documents (${typeCounts.document})` },
          { key: 'other', label: `Other (${typeCounts.other})` }
        ].map(cat => (
          <button
            key={cat.key}
            onClick={() => setTypeFilter(cat.key)}
            className={`px-3 py-1.5 rounded-full border text-[11.5px] transition-all cursor-pointer ${typeFilter === cat.key ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs font-semibold' : 'bg-white border-[var(--line-soft)] text-[var(--ink-70)] hover:border-[var(--line)]'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {viewMode === 'grid' ? (
        <ResourceGrid items={filtered} />
      ) : (
        filtered.length ? (
          <div className="space-y-2">
            {filtered.map(x => <ResourceListRow key={x.id} resource={x} />)}
          </div>
        ) : (
          <div className="py-14 text-center text-[13px] text-[var(--ink-45)]">No matching files found.</div>
        )
      )}
    </div>
  )
}

function SheshiPage({ resources }: { resources: Resource[] }) {
  const items = resources.filter(r => r.productId === SHESHI_ID);
  return <main className="flex-1 overflow-y-auto">
    <div className="px-8 py-6 max-w-[1400px]">
      <div className="flex gap-4 items-center mb-8 pb-6 border-b border-[var(--line-soft)]">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold bg-[#3a2214] text-[#ff5500]">S</div>
        <div>
          <h1 className="font-display text-[24px] font-bold">Sheshi Hub</h1>
          <p className="text-[13px] text-[var(--ink-45)]">Company files, CEO material, Sheshi information and shared resources.</p>
        </div>
      </div>
      <div className="pb-8">
        <SmartResourceExplorer items={items} />
      </div>
    </div>
  </main>
}

function ProductPage({ product, resources }: { product: Product; resources: Resource[] }) {
  const items = resources.filter(r => r.productId === product.id || r.productId === product.slug);
  return <main className="flex-1 overflow-y-auto">
    <div className="px-8 py-6 max-w-[1400px]">
      <div className="flex gap-4 items-center mb-8 pb-6 border-b border-[var(--line-soft)]">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold" style={{ background: product.light, color: product.color }}>{product.name[0]}</div>
        <div>
          <h1 className="font-display text-[24px] font-bold">{product.name}</h1>
          <p className="text-[13px] text-[var(--ink-45)]">{product.description}</p>
        </div>
      </div>
      <div className="pb-8">
        <SmartResourceExplorer items={items} />
      </div>
    </div>
  </main>
}

function FavoritesPage({ resources }: { resources: Resource[] }) {
  const [favIds, setFavIds] = useState<string[]>(getFavoriteIds());
  useEffect(() => {
    const updateFavs = () => setFavIds(getFavoriteIds());
    window.addEventListener('vault-favorites-changed', updateFavs);
    return () => window.removeEventListener('vault-favorites-changed', updateFavs);
  }, []);

  const items = useMemo(() => resources.filter(r => favIds.includes(r.id)), [resources, favIds]);

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="px-8 py-6 max-w-[1400px]">
        <div className="flex gap-4 items-center mb-8 pb-6 border-b border-[var(--line-soft)]">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold bg-[var(--primary)]/10 text-[var(--primary)]">
            <StarIcon filled />
          </div>
          <div>
            <h1 className="font-display text-[24px] font-bold flex items-center gap-2">
              Favorites <span className="text-[14px] font-normal text-[var(--ink-45)]">({items.length} starred items)</span>
            </h1>
            <p className="text-[13px] text-[var(--ink-45)]">Your personal saved resources across Sheshi Vault.</p>
          </div>
        </div>
        <div className="pb-8">
          {items.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-[var(--ink-45)] bg-white rounded-2xl border border-[var(--line-soft)] space-y-2">
              <div className="text-[28px] text-[var(--primary)]">⭐</div>
              <div className="font-semibold text-[var(--ink)]">No favorites saved yet</div>
              <p className="text-[12px] max-w-sm mx-auto">Click the star button on any file card or viewer modal to save files here for quick access.</p>
            </div>
          ) : (
            <SmartResourceExplorer items={items} />
          )}
        </div>
      </div>
    </main>
  );
}

function AllResources({ resources }: { resources: Resource[] }) {
  const [product, setProduct] = useState('');
  const items = product ? resources.filter(r => r.productId === product || productOf(r.productId)?.slug === product || productOf(r.productId)?.id === product) : resources;
  return <main className="flex-1 overflow-y-auto">
    <div className="px-8 py-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-[24px] font-bold">All Resources</h1>
          <p className="text-[13px] text-[var(--ink-45)]">Browse all logos, brochures, documents, and videos across the organization.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setProduct('')} className={`px-3 py-1.5 rounded-full text-[12px] cursor-pointer ${!product ? 'bg-[var(--primary)] text-white' : 'bg-white border border-[var(--line-soft)]'}`}>All Products</button>
          {products.map(p => <button key={p.id} onClick={() => setProduct(p.slug)} className={`px-3 py-1.5 rounded-full text-[12px] cursor-pointer ${product === p.slug ? 'bg-[var(--primary)] text-white' : 'bg-white border border-[var(--line-soft)]'}`}>{p.name}</button>)}
        </div>
      </div>

      <div className="pb-8">
        <SmartResourceExplorer items={items} />
      </div>
    </div>
  </main>
}

function Sidebar({ view, onView, isAdmin, profile, onSignOut, onOpenAuth }: { view: View; onView: (v: View) => void; isAdmin: boolean; profile: VaultProfile | null; onSignOut: () => void; onOpenAuth: (mode: AuthMode) => void }) {
  const [open, setOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [favCount, setFavCount] = useState(getFavoriteIds().length);

  useEffect(() => {
    const handleFavChange = () => setFavCount(getFavoriteIds().length);
    window.addEventListener('vault-favorites-changed', handleFavChange);
    return () => window.removeEventListener('vault-favorites-changed', handleFavChange);
  }, []);

  const nav = (active: boolean) => 'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] ' + (active ? 'bg-[var(--primary)] text-white' : 'text-[var(--ink-70)]');
  const label = (text: string) => !collapsed && <span>{text}</span>;
  const isAdvanced = profile ? (profile.role === 'advanced' || profile.role === 'teammate') && profile.status === 'approved' : false;

  return (
    <aside className={(collapsed ? 'w-[64px]' : 'w-[236px]') + ' flex-shrink-0 flex flex-col bg-white border-r border-[var(--line)] transition-all duration-200'}>
      <div className={'h-16 flex items-center ' + (collapsed ? 'justify-center px-2' : 'justify-between px-4') + ' border-b border-[var(--line-soft)]'}>
        <span className={'font-display ' + (collapsed ? 'hidden' : 'text-[19px]') + ' font-bold tracking-[-.02em]'}>Sheshi Vault</span>
        <button onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="w-8 h-8 rounded-md flex items-center justify-center text-[var(--ink-45)] hover:bg-[var(--canvas-deep)] cursor-pointer">
          <PanelIcon collapsed={collapsed} />
        </button>
      </div>

      <nav className={'flex-1 overflow-y-auto ' + (collapsed ? 'px-2' : 'px-2.5') + ' py-3'}>
        <button title="Home" onClick={() => onView({ kind: 'home' })} className={nav(view.kind === 'home')}><HomeIcon />{label('Home')}</button>
        <button title="Sheshi" onClick={() => onView({ kind: 'sheshi' })} className={nav(view.kind === 'sheshi')}><CompanyIcon />{label('Sheshi')}</button>
        <button title="Products" onClick={() => { if (collapsed) setCollapsed(false); setOpen(!open) }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-[var(--ink-70)] cursor-pointer"><GridIcon />{!collapsed && <><span className="flex-1 text-left">Products</span><Chevron open={open} /></>}</button>
        {open && !collapsed && <div className="ml-3 pl-3 border-l border-[var(--line-soft)]">{products.map(p => <button key={p.id} onClick={() => onView({ kind: 'product', slug: p.slug })} className={'w-full flex gap-2 px-2.5 py-1.5 text-left rounded-md text-[12.5px] cursor-pointer ' + (view.kind === 'product' && view.slug === p.slug ? 'font-semibold text-[var(--primary)]' : 'text-[var(--ink-45)]')}><span className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: p.color }} />{p.name}</button>)}</div>}
        <button title="Events" onClick={() => onView({ kind: 'events' })} className={nav(view.kind === 'events' || view.kind === 'event-detail')}><CalIcon />{label('Events')}</button>
        <button title="Videos" onClick={() => onView({ kind: 'videos' })} className={nav(view.kind === 'videos')}><PlayIcon />{label('Videos')}</button>
        
        {/* Favorites Navigation Item */}
        <button title="Favorites" onClick={() => onView({ kind: 'favorites' })} className={nav(view.kind === 'favorites')}>
          <StarIcon filled={view.kind === 'favorites'} />
          {!collapsed && (
            <span className="flex-1 flex items-center justify-between">
              <span>Favorites</span>
              {favCount > 0 && <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px]">{favCount}</span>}
            </span>
          )}
        </button>

        <button title="All Resources" onClick={() => onView({ kind: 'all' })} className={nav(view.kind === 'all')}><DownloadIcon />{label('All Resources')}</button>
        {isAdmin && <div className="mt-2 pt-2 border-t border-[var(--line-soft)]"><button title="Admin" onClick={() => onView({ kind: 'admin' })} className={nav(view.kind === 'admin')}><ShieldIcon />{label('Admin')}</button></div>}
        {isAdvanced && !isAdmin && <div className="mt-2 pt-2 border-t border-[var(--line-soft)]"><button title="Upload Files" onClick={() => onView({ kind: 'admin' })} className={nav(view.kind === 'admin')}><ShieldIcon />{label('Upload Files')}</button></div>}
      </nav>

      <div className="p-3 border-t border-[var(--line-soft)]">
        {profile ? <div className="flex flex-col gap-2">{!collapsed && <div className="px-1"><div className="text-[12.5px] font-semibold text-[var(--ink)] truncate">{profile.full_name || profile.email}</div><div className="text-[11px] text-[var(--ink-45)] truncate flex items-center justify-between mt-0.5"><span>{profile.email}</span>{profile.role !== 'teammate' && <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase ${profile.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>{profile.role}</span>}</div></div>}<button onClick={onSignOut} className="w-full py-1.5 px-3 rounded-lg border border-[var(--line-soft)] text-[12px] font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer">Sign Out</button></div> : <div className="flex flex-col gap-2">{!collapsed && <div className="text-[11px] text-[var(--ink-45)] px-1">Sign in to access admin features and private resources.</div>}<button onClick={() => onOpenAuth('login')} className="w-full py-2 px-3 rounded-lg bg-[var(--primary)] text-white text-[12px] font-semibold hover:opacity-90 transition-opacity cursor-pointer">Sign In / Register</button></div>}
      </div>
    </aside>
  )
}

export default function LiveApp() {
  const [view, setView] = useState<View>({ kind: 'home' });
  const [resources, setResources] = useState<Resource[]>([]);
  const [events, setEvents] = useState<ManagedEvent[]>([]);
  const [profile, setProfile] = useState<VaultProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const fetchProfile = async () => {
    try {
      const p = await getMyProfile();
      setProfile(p);
      setIsAdmin(p?.role === 'admin' && p?.status === 'approved');
      if (p?.full_name) { localStorage.setItem('sheshi-vault-user-name', p.full_name); }
    } catch { setProfile(null); setIsAdmin(false); }
  };

  const loadAll = async () => {
    try {
      const [r, e] = await Promise.all([getManagedResources(), getEvents()]);
      setResources(r.filter(x => !x.deletedAt));
      setEvents(e);
      setDbError(null);
    } catch (err: any) { setDbError(err.message || 'Failed to connect'); }
  };

  useEffect(() => {
    const init = async () => {
      setAuthLoading(true);
      await fetchProfile();
      await loadAll();
      setAuthLoading(false);
    };
    init();

    const sub = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') { await fetchProfile(); await loadAll(); }
      else if (event === 'SIGNED_OUT') { setProfile(null); setIsAdmin(false); localStorage.removeItem('sheshi-vault-user-name'); await loadAll(); }
    });

    const handleVaultChange = () => { loadAll(); };
    window.addEventListener('vault-resources-changed', handleVaultChange);

    return () => { sub.data.subscription.unsubscribe(); window.removeEventListener('vault-resources-changed', handleVaultChange); };
  }, []);

  const handleSignOut = async () => { await signOut(); setView({ kind: 'home' }); };

  if (authLoading) {
    return <div className="flex h-screen w-screen items-center justify-center bg-[var(--canvas)]"><div className="w-8 h-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" /></div>
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--canvas)] text-[var(--ink)]">
      <Sidebar view={view} onView={setView} isAdmin={isAdmin} profile={profile} onSignOut={handleSignOut} onOpenAuth={(mode) => { setAuthMode(mode); setShowAuthModal(true); }} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {dbError && <div className="bg-red-500/10 border-b border-red-500/20 text-red-400 px-6 py-2 text-[12px] flex justify-between items-center"><span>{dbError}</span><button onClick={loadAll} className="underline">Retry</button></div>}

        {view.kind === 'home' && <Home resources={resources} events={events} onProduct={s => setView({ kind: 'product', slug: s })} onSheshi={() => setView({ kind: 'sheshi' })} onSelectEvent={id => setView({ kind: 'event-detail', id })} />}
        {view.kind === 'sheshi' && <SheshiPage resources={resources} />}
        {view.kind === 'product' && (() => { const p = productOf(view.slug); return p ? <ProductPage product={p} resources={resources} /> : <AllResources resources={resources} />; })()}
        {view.kind === 'events' && <EventPage events={events} resources={resources} onSelectEvent={id => setView({ kind: 'event-detail', id })} />}
        {view.kind === 'event-detail' && <EventPage events={events} resources={resources} selectedEventId={view.id} onBack={() => setView({ kind: 'events' })} onSelectEvent={id => setView({ kind: 'event-detail', id })} />}
        {view.kind === 'videos' && <VideosPage resources={resources} />}
        {view.kind === 'favorites' && <FavoritesPage resources={resources} />}
        {view.kind === 'all' && <AllResources resources={resources} />}
        {view.kind === 'admin' && <AdminConsole />}
      </div>

      <AuthScreen isOpen={showAuthModal} initialMode={authMode} onClose={() => setShowAuthModal(false)} onSuccess={async () => { setShowAuthModal(false); await fetchProfile(); await loadAll(); }} />
    </div>
  );
}