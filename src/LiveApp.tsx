import React, { useEffect, useMemo, useState } from 'react'
import { products } from './data'
import { getManagedResources, getFreshResourceUrl } from './resourcesApi'
import { getEvents, calculateEventStatus, type ManagedEvent, type EventStatus } from './eventsApi'
import type { Product, Resource, ResourceType } from './types'
import AdminConsole from './AdminConsole'
import { getMyProfile, signOut, hasWeeklyAuthentication, type VaultProfile } from './authApi'
import AuthScreen, { type AuthMode } from './components/AuthScreen'
import { supabase } from './lib/supabase'
import { triggerDirectDownload } from './utils'
import { openViewer } from './fileViewerBridge'
import EventPage from './components/EventPage'
import VideosPage, { VideoCard } from './components/VideosPage'
import { getFavoriteIds, isFavoriteId, toggleFavoriteId } from './favoritesApi'
import CommandPalette from './components/CommandPalette'
import MultiStepUploadModal from './components/MultiStepUploadModal'
import NotificationToast from './components/NotificationToast'
import NotificationCenter from './components/NotificationCenter'
import {
  checkUnreadNotificationsOnLogin,
  subscribeToRealtimeNotifications,
} from './notificationsApi'

/* ==========================================================================
   21st.dev Micro-Iconography
   ========================================================================== */
const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

const HomeIcon = () => <Icon><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22v-8h6v8" /></Icon>
const GridIcon = () => <Icon><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Icon>
const DownloadIcon = () => <Icon><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></Icon>
const CalIcon = () => <Icon><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Icon>
const ShieldIcon = () => <Icon><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></Icon>
const FileIcon = () => <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></Icon>
const CompanyIcon = () => <Icon><path d="M4 21V7l8-4 8 4v14" /><path d="M8 21v-5h8v5M8 10h.01M12 10h.01M16 10h.01" /></Icon>
const PanelIcon = ({ collapsed }: { collapsed: boolean }) => (
  <Icon>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d={collapsed ? 'M14 8l4 4-4 4' : 'M10 8l-4 4 4 4'} />
    <path d="M9 4v16" />
  </Icon>
)
const PlayIcon = () => <Icon><path d="m8 5 11 7-11 7z" /></Icon>
const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)
const Chevron = ({ open }: { open: boolean }) => (
  <span style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .18s ease', display: 'inline-block' }}>›</span>
)

type View =
  | { kind: 'home' }
  | { kind: 'product'; slug: string }
  | { kind: 'sheshi' }
  | { kind: 'all' }
  | { kind: 'events' }
  | { kind: 'videos' }
  | { kind: 'favorites' }
  | { kind: 'admin' }
  | { kind: 'event-detail'; id: string }

const SHESHI_ID = 'sheshi'
const productOf = (id: string) => products.find(p => p.id === id || p.slug === id)
const localDate = (v: string) => {
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(v)
}
const dateText = (v: string) =>
  localDate(v).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

function ProductBadge({ product }: { product?: Product }) {
  if (!product) return null
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border"
      style={{
        background: `${product.color}15`,
        borderColor: `${product.color}35`,
        color: product.color,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: product.color }} />
      {product.name}
    </span>
  )
}

/* ==========================================================================
   21st.dev Resource Card
   Tactile obsidian glass with aspect-ratio thumbnail, hover depth,
   JetBrains Mono format badges, and micro-actions.
   ========================================================================== */
function ResourceCard({ resource }: { resource: Resource }) {
  const [fav, setFav] = useState(isFavoriteId(resource.id))

  useEffect(() => {
    const handleFavChange = () => setFav(isFavoriteId(resource.id))
    window.addEventListener('vault-favorites-changed', handleFavChange)
    return () => window.removeEventListener('vault-favorites-changed', handleFavChange)
  }, [resource.id])

  if (resource.type === 'video') return <VideoCard resource={resource} />

  const p = resource.productId === SHESHI_ID
    ? ({ id: SHESHI_ID, name: 'Sheshi', slug: 'sheshi', color: '#ff5500', light: '#3a2214', description: 'Shared Sheshi resources' } as Product)
    : productOf(resource.productId)
  const isVideo = resource.type === 'video'
  const tags = (resource.tags || []).filter(Boolean).slice(0, 3)
  const isOfficial = resource.isOfficial || resource.contentStatus === 'Official'

  return (
    <div
      data-resource-id={resource.id}
      data-resource-tags={JSON.stringify(resource.tags || [])}
      data-resource-type={resource.type}
      data-resource-description={resource.description || ''}
      className="group relative flex flex-col rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] hover:border-[var(--border-2)] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50 cursor-pointer backdrop-blur-md"
      onClick={async () => {
        if (!resource.sourceUrl) return
        const freshUrl = await getFreshResourceUrl(resource.sourceUrl, (resource as any).storagePath)
        openViewer(
          freshUrl,
          resource.title,
          resource.id,
          resource.tags || [],
          resource.type,
          resource.description || '',
          resource.contentStatus || 'Active',
          resource.version || 'v1.0'
        )
      }}
    >
      {/* Thumbnail Container */}
      <div className="h-44 bg-[var(--canvas-deep)] flex items-center justify-center overflow-hidden relative border-b border-[var(--border)]">
        {resource.thumbnail ? (
          <img
            src={resource.thumbnail}
            alt={resource.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            style={{ objectPosition: 'left top' }}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--ink-45)] border border-[var(--border)]">
            <FileIcon />
          </div>
        )}

        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <span className="w-11 h-11 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
              <PlayIcon />
            </span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          {isOfficial ? (
            <span className="badge-pill bg-gradient-to-r from-orange-500/90 to-amber-500/90 text-white border-0 shadow-md font-bold text-[9px] px-2 py-0.5">
              Official ✓
            </span>
          ) : <span />}

          {resource.fileFormat && (
            <span className="badge-pill bg-black/75 backdrop-blur-md text-white/90 border border-white/10 font-mono text-[9px] uppercase px-2 py-0.5 font-bold tracking-wider">
              {resource.fileFormat}
            </span>
          )}
        </div>

        {/* Favorite Star Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleFavoriteId(resource.id)
          }}
          className={`absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer backdrop-blur-md ${
            fav
              ? 'bg-[var(--primary)] text-white shadow-lg shadow-orange-500/30 scale-105'
              : 'bg-black/50 text-white/75 hover:text-white hover:bg-black/80 hover:scale-110'
          }`}
          title={fav ? 'Remove from Favorites' : 'Add to Favorites'}
        >
          <StarIcon filled={fav} />
        </button>
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col gap-2.5 flex-1 justify-between">
        <div>
          <div className="line-clamp-2 text-[14px] leading-snug font-semibold text-[var(--ink)] tracking-tight group-hover:text-[var(--primary)] transition-colors min-h-[38px]">
            {resource.title}
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((tag) => (
                <span key={tag} className="resource-tag">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
            <ProductBadge product={p} />
            {resource.version && (
              <span className="badge-pill text-[9.5px]">
                {resource.version}
              </span>
            )}
            {resource.fileSize && (
              <span className="text-[10.5px] font-mono text-[var(--ink-45)] ml-auto">
                {resource.fileSize}
              </span>
            )}
          </div>

          <div className="mt-3 flex justify-between items-center text-[11px] pt-1">
            <span className="text-[var(--ink-45)] font-mono text-[10.5px]">
              {resource.viewCount || 0} views
            </span>
            {resource.sourceUrl && (
              <button
                onClick={async (e) => {
                  e.stopPropagation()
                  const freshUrl = await getFreshResourceUrl(resource.sourceUrl!, (resource as any).storagePath)
                  if (isVideo) window.open(freshUrl, '_blank', 'noreferrer')
                  else await triggerDirectDownload(freshUrl, resource.title)
                }}
                className="font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] flex items-center gap-1 border-0 bg-transparent p-0 cursor-pointer text-[11px] group/btn"
              >
                <span>{isVideo ? 'Open Video' : 'Download'}</span>
                <span className="group-hover/btn:translate-x-0.5 transition-transform">→</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ResourceGrid({ items }: { items: Resource[] }) {
  return items.length ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {items.map((x) => (
        <ResourceCard key={x.id} resource={x} />
      ))}
    </div>
  ) : (
    <div className="py-16 text-center text-[13px] text-[var(--ink-45)] rounded-2xl border border-[var(--border)] bg-[var(--surface-card)]">
      No resources found in this collection.
    </div>
  )
}

function eventFallback(event: ManagedEvent, product?: Product) {
  const a = product?.color || '#ff5500'
  const b = product?.light || '#222c3a'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="#090a0f"/></linearGradient><filter id="f"><feGaussianBlur stdDeviation="80"/></filter></defs><rect width="1200" height="700" fill="url(#g)"/><circle cx="920" cy="110" r="260" fill="${b}" opacity=".45" filter="url(#f)"/><circle cx="210" cy="650" r="220" fill="#fff" opacity=".08"/><path d="M700 0C970 120 900 470 1200 610V0Z" fill="#fff" opacity=".04"/><path d="M0 510C250 410 420 590 690 500S980 350 1200 460" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="2"/><text x="72" y="635" fill="#fff" fill-opacity=".7" font-family="'Plus Jakarta Sans',sans-serif" font-weight="700" font-size="24" letter-spacing="4">SHESHI EVENT</text></svg>`
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
}

/* ==========================================================================
   21st.dev Event Card
   Tactile obsidian event card with status radar indicator and date badge.
   ========================================================================== */
function EventCard({ event, hero, onClick }: { event: ManagedEvent; hero?: boolean; onClick?: () => void }) {
  const p = productOf(event.product_id || '')
  const status = calculateEventStatus(event)
  const meta = [event.location, event.event_type].filter(Boolean).join(' · ')
  const [fallback, setFallback] = useState(!event.banner)
  const src = fallback ? eventFallback(event, p) : event.banner || eventFallback(event, p)

  const statusBadge = (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
        status === 'ongoing'
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : status === 'upcoming'
          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
      }`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: status === 'ongoing' ? '#10b981' : status === 'upcoming' ? '#3b82f6' : '#94a3b8',
        }}
      />
      {status}
    </span>
  )

  if (hero) {
    return (
      <div
        onClick={onClick}
        className="relative min-h-[300px] rounded-3xl overflow-hidden text-white shadow-2xl border border-[var(--border)] cursor-pointer group hover:border-[var(--border-highlight)] transition-all duration-300"
      >
        <img
          src={src}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          alt=""
          onError={() => setFallback(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/60 to-black/20" />

        <div className="relative h-full min-h-[300px] p-7 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ProductBadge product={p} />
              {statusBadge}
            </div>
            <span className="badge-pill bg-white/10 text-white/90 backdrop-blur-md border-white/15">
              Spotlight Event
            </span>
          </div>

          <div>
            <div className="font-display text-[clamp(24px,2.4vw,36px)] font-extrabold leading-tight tracking-tight group-hover:text-orange-300 transition-colors">
              {event.title}
            </div>
            <div className="flex items-center gap-3 text-[12px] text-white/70 mt-2.5 font-mono">
              <span>📅 {dateText(event.event_date)}</span>
              {meta ? <span>• {meta}</span> : null}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className="bg-[var(--surface-card)] border border-[var(--border)] hover:border-[var(--border-2)] hover:bg-[var(--surface-card-hover)] rounded-2xl overflow-hidden h-full flex flex-col cursor-pointer group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 backdrop-blur-md"
    >
      <div className="relative h-36 overflow-hidden bg-[var(--canvas-deep)] border-b border-[var(--border)]">
        <img
          src={src}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          alt=""
          onError={() => setFallback(true)}
        />
        <div className="absolute top-2.5 right-2.5">{statusBadge}</div>
      </div>
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          <ProductBadge product={p} />
          <div className="font-semibold text-[14.5px] mt-2 text-[var(--ink)] group-hover:text-[var(--primary)] transition-colors line-clamp-1">
            {event.title}
          </div>
        </div>
        <div className="text-[11.5px] font-mono text-[var(--ink-45)] flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <span>{dateText(event.event_date)}</span>
          {event.location && <span className="truncate max-w-[120px]">{event.location}</span>}
        </div>
      </div>
    </div>
  )
}

function EventsPage({ events, onSelectEvent }: { events: ManagedEvent[]; onSelectEvent: (id: string) => void }) {
  const sorted = [...events].sort((a, b) => {
    const statusOrder: Record<EventStatus, number> = { ongoing: 0, upcoming: 1, completed: 2 }
    const diff = statusOrder[calculateEventStatus(a)] - statusOrder[calculateEventStatus(b)]
    return diff || localDate(a.event_date).getTime() - localDate(b.event_date).getTime()
  })
  const current = sorted.filter((e) => calculateEventStatus(e) !== 'completed')
  const completed = sorted.filter((e) => calculateEventStatus(e) === 'completed')

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-8">
        <div>
          <div className="badge-pill mb-2">
            <span className="pulse-dot bg-orange-500" />
            SCHEDULE & SUMMITS
          </div>
          <h1 className="font-display text-[28px] font-extrabold tracking-tight heading-gradient">
            Corporate Events & Summits
          </h1>
          <p className="text-[13px] text-[var(--ink-45)] mt-1 max-w-xl">
            Upcoming conferences, product launches, and field events across Sheshi and product suites.
          </p>
        </div>

        {current.length > 0 ? (
          <section>
            <h2 className="section-heading mb-4">Active & Upcoming</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {current.map((event) => (
                <EventCard key={event.id} event={event} onClick={() => onSelectEvent(event.id)} />
              ))}
            </div>
          </section>
        ) : (
          <div className="py-14 text-center text-[13px] text-[var(--ink-45)] rounded-2xl border border-[var(--border)] bg-[var(--surface-card)]">
            No active or upcoming events scheduled.
          </div>
        )}

        {completed.length > 0 && (
          <section className="pb-8">
            <h2 className="section-heading mb-4">Past Event Archives</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {completed.map((event) => (
                <EventCard key={event.id} event={event} onClick={() => onSelectEvent(event.id)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

/* ==========================================================================
   21st.dev Bento Grid Home Showcase
   Human-designed bento layout with telemetry cards, spotlight hero,
   product suite ecosystem, and latest vault drops.
   ========================================================================== */
function Home({
  resources,
  events,
  onProduct,
  onSheshi,
  onSelectEvent,
}: {
  resources: Resource[]
  events: ManagedEvent[]
  onProduct: (s: string) => void
  onSheshi: () => void
  onSelectEvent: (id: string) => void
}) {
  const [name, setName] = useState('')
  useEffect(() => setName(localStorage.getItem('sheshi-vault-user-name') || ''), [])

  const currentEvents = events
    .filter((e) => {
      const s = calculateEventStatus(e)
      return s === 'ongoing' || s === 'upcoming'
    })
    .sort((a, b) => {
      const statusOrder = { ongoing: 1, upcoming: 2, completed: 3 }
      const orderA = statusOrder[calculateEventStatus(a)]
      const orderB = statusOrder[calculateEventStatus(b)]
      if (orderA !== orderB) return orderA - orderB
      return localDate(a.event_date).getTime() - localDate(b.event_date).getTime()
    })

  const sheshiResources = resources.filter((r) => r.productId === SHESHI_ID)
  const latest = [...resources]
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, 5)

  // Telemetry metrics
  const totalViews = resources.reduce((acc, r) => acc + (r.viewCount || 0), 0)
  const videoCount = resources.filter((r) => r.type === 'video').length
  const deckCount = resources.filter((r) => isDeckResource(r)).length

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-10">
        {/* Welcome & Bento Hero Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge-pill">
              <span className="pulse-dot bg-emerald-500" />
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
            <span className="badge-pill">VAULT V2.4 • REALTIME ENGINE</span>
          </div>
          <h1 className="font-display text-[32px] font-extrabold tracking-tight heading-gradient">
            Welcome back{name && <>, <span className="text-[var(--primary)]">{name}</span></>}
          </h1>
          <p className="text-[13.5px] text-[var(--ink-45)] mt-1">
            Enterprise assets, product collateral, guidelines, and corporate summit intelligence.
          </p>
        </div>

        {/* 21st.dev Bento Grid Header Layout */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Bento Tile 1: Spotlight Event / Hero (Col 1-8) */}
          <div className="lg:col-span-8 flex flex-col">
            {currentEvents.length > 0 ? (
              <EventCard event={currentEvents[0]} hero onClick={() => onSelectEvent(currentEvents[0].id)} />
            ) : (
              <div className="h-full min-h-[280px] rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface)] p-8 flex flex-col justify-between">
                <div className="flex items-center gap-2">
                  <span className="badge-pill bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20">
                    Sheshi Hub
                  </span>
                  <span className="text-[11px] font-mono text-[var(--ink-45)]">Corporate Central</span>
                </div>
                <div>
                  <h2 className="font-display text-[26px] font-bold text-[var(--ink)]">
                    Unified Asset Repository & Brand Standards
                  </h2>
                  <p className="text-[13px] text-[var(--ink-45)] mt-2 max-w-lg">
                    Access verified PowerPoint decks, high-fidelity logos, product demo recordings, and company files.
                  </p>
                </div>
                <button
                  onClick={onSheshi}
                  className="self-start px-4 py-2 rounded-xl bg-[var(--primary)] text-white font-semibold text-[12px] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Explore Sheshi Hub →
                </button>
              </div>
            )}
          </div>

          {/* Bento Tile 2: Vault Telemetry & Metrics (Col 9-12) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Stat 1: Total Assets */}
            <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] backdrop-blur-md flex items-center justify-between">
              <div>
                <div className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[var(--ink-45)]">
                  Total Managed Assets
                </div>
                <div className="text-[28px] font-display font-extrabold text-[var(--ink)] mt-1">
                  {resources.length}
                </div>
                <div className="text-[11px] text-[var(--ink-70)] mt-0.5">
                  {deckCount} Decks • {videoCount} Videos
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-[var(--primary)] flex items-center justify-center border border-orange-500/20">
                <FileIcon />
              </div>
            </div>

            {/* Stat 2: Active Events */}
            <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] backdrop-blur-md flex items-center justify-between">
              <div>
                <div className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[var(--ink-45)]">
                  Upcoming & Active Events
                </div>
                <div className="text-[28px] font-display font-extrabold text-[var(--ink)] mt-1">
                  {currentEvents.length}
                </div>
                <div className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Realtime notification active
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <CalIcon />
              </div>
            </div>

            {/* Stat 3: Community Views */}
            <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] backdrop-blur-md flex items-center justify-between">
              <div>
                <div className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[var(--ink-45)]">
                  Total File Interactions
                </div>
                <div className="text-[28px] font-display font-extrabold text-[var(--ink)] mt-1">
                  {totalViews.toLocaleString()}
                </div>
                <div className="text-[11px] text-[var(--ink-70)] mt-0.5">
                  Views & downloads recorded
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <DownloadIcon />
              </div>
            </div>
          </div>
        </section>

        {/* Secondary Events Carousel/Row (if more events exist) */}
        {currentEvents.length > 1 && (
          <section>
            <div className="flex items-end justify-between mb-4">
              <h2 className="section-heading">More Upcoming Summits</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentEvents.slice(1, 4).map((e) => (
                <EventCard key={e.id} event={e} onClick={() => onSelectEvent(e.id)} />
              ))}
            </div>
          </section>
        )}

        {/* Product Ecosystem Section */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="section-heading">Product Suites</h2>
              <p className="text-[12.5px] text-[var(--ink-45)] mt-0.5">
                Explore brand kits, feature decks, and media files by product division.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {products.map((p) => {
              const count = resources.filter((r) => r.productId === p.id || r.productId === p.slug).length
              return (
                <button
                  key={p.id}
                  onClick={() => onProduct(p.slug)}
                  className="group relative text-left rounded-2xl border border-[var(--border)] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer overflow-hidden backdrop-blur-md bg-[var(--surface-card)] hover:border-[var(--border-2)]"
                >
                  <div
                    className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-20 filter blur-2xl transition-opacity group-hover:opacity-40"
                    style={{ background: p.color }}
                  />
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm mb-3 border transition-transform group-hover:scale-110"
                    style={{
                      background: `${p.color}15`,
                      color: p.color,
                      borderColor: `${p.color}35`,
                    }}
                  >
                    {p.name[0]}
                  </div>
                  <div className="font-bold text-[14.5px] text-[var(--ink)] group-hover:text-[var(--primary)] transition-colors">
                    {p.name}
                  </div>
                  <div className="text-[11.5px] font-mono text-[var(--ink-45)] mt-1">
                    {count} resources available
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Sheshi Core Hub Banner */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="section-heading">Sheshi Hub</h2>
            {sheshiResources.length > 0 && (
              <button
                onClick={onSheshi}
                className="text-[11.5px] font-semibold text-[var(--primary)] hover:underline cursor-pointer"
              >
                View all Sheshi files ({sheshiResources.length}) →
              </button>
            )}
          </div>
          {sheshiResources.length ? (
            <ResourceGrid items={sheshiResources.slice(0, 5)} />
          ) : (
            <button
              onClick={onSheshi}
              className="w-full text-left rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-6 text-[13px] text-[var(--ink-45)] hover:border-[var(--border-2)] cursor-pointer"
            >
              Company files, CEO material, Sheshi information and shared assets.
            </button>
          )}
        </section>

        {/* Latest Resources Drops */}
        <section className="pb-10">
          <div className="flex items-end justify-between mb-4">
            <h2 className="section-heading">Latest Resources</h2>
            <span className="badge-pill">Recently Added</span>
          </div>
          <ResourceGrid items={latest} />
        </section>
      </div>
    </main>
  )
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}
function ListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}
function GridViewIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}
function SortIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 16 4 4 4-4" />
      <path d="M7 20V4" />
      <path d="m21 8-4-4-4 4" />
      <path d="M17 4v16" />
    </svg>
  )
}

/* ==========================================================================
   21st.dev Resource List Row (for List View)
   ========================================================================== */
function ResourceListRow({ resource }: { resource: Resource }) {
  const [fav, setFav] = useState(isFavoriteId(resource.id))

  useEffect(() => {
    const handleFavChange = () => setFav(isFavoriteId(resource.id))
    window.addEventListener('vault-favorites-changed', handleFavChange)
    return () => window.removeEventListener('vault-favorites-changed', handleFavChange)
  }, [resource.id])

  const p = resource.productId === SHESHI_ID
    ? ({ id: SHESHI_ID, name: 'Sheshi', slug: 'sheshi', color: '#ff5500', light: '#3a2214', description: 'Shared Sheshi resources' } as Product)
    : productOf(resource.productId)
  const isVideo = resource.type === 'video'
  const tags = (resource.tags || []).filter(Boolean).slice(0, 3)
  const isOfficial = resource.isOfficial || resource.contentStatus === 'Official'

  return (
    <div
      className="group bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] border border-[var(--border)] hover:border-[var(--border-2)] rounded-xl p-3.5 flex items-center gap-4 hover:shadow-lg transition-all cursor-pointer backdrop-blur-md"
      onClick={() => {
        if (resource.sourceUrl) {
          openViewer(
            resource.sourceUrl,
            resource.title,
            resource.id,
            resource.tags || [],
            resource.type,
            resource.description || '',
            resource.contentStatus || 'Active',
            resource.version || 'v1.0'
          )
        }
      }}
    >
      <div className="w-12 h-12 rounded-lg bg-[var(--canvas-deep)] flex items-center justify-center overflow-hidden flex-shrink-0 relative border border-[var(--border)]">
        {resource.thumbnail ? (
          <img
            src={resource.thumbnail}
            alt={resource.title}
            className="w-full h-full object-cover"
            style={{ objectPosition: 'left top' }}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <FileIcon />
        )}
        {isVideo && (
          <span className="absolute inset-0 bg-black/30 flex items-center justify-center text-white">
            <PlayIcon />
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-[14px] text-[var(--ink)] truncate group-hover:text-[var(--primary)] transition-colors">
            {resource.title}
          </span>
          {isOfficial && (
            <span className="badge-pill bg-orange-500/15 text-[var(--primary)] border-orange-500/30">
              Official ✓
            </span>
          )}
          {resource.fileFormat && (
            <span className="badge-pill font-mono text-[9px] uppercase">
              {resource.fileFormat}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[var(--ink-45)] mt-1 font-mono">
          <ProductBadge product={p} />
          {resource.version && <span>[{resource.version}]</span>}
          {resource.fileSize && <span>• {resource.fileSize}</span>}
          <span>• {resource.viewCount || 0} views</span>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="hidden md:flex flex-wrap gap-1">
          {tags.map((t) => (
            <span key={t} className="resource-tag">
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleFavoriteId(resource.id)
          }}
          className={`p-2 rounded-lg transition-all cursor-pointer ${
            fav ? 'bg-[var(--primary)] text-white shadow-xs' : 'text-[var(--ink-45)] hover:bg-[var(--surface-2)]'
          }`}
          title={fav ? 'Remove from Favorites' : 'Add to Favorites'}
        >
          <StarIcon filled={fav} />
        </button>

        {resource.sourceUrl && (
          <button
            onClick={async (e) => {
              e.stopPropagation()
              const freshUrl = await getFreshResourceUrl(resource.sourceUrl!, (resource as any).storagePath)
              if (isVideo) window.open(freshUrl, '_blank', 'noreferrer')
              else triggerDirectDownload(freshUrl, resource.title)
            }}
            className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--ink)] text-[11px] font-semibold transition-colors cursor-pointer border border-[var(--border)]"
          >
            {isVideo ? 'Open Video' : 'Download'}
          </button>
        )}
      </div>
    </div>
  )
}

function isDeckResource(resource: Resource) {
  const type = String(resource.type || '').toLowerCase()
  const format = String(resource.fileFormat || '').toLowerCase()
  const tags = (resource.tags || []).map((tag) => String(tag).toLowerCase())
  const url = String(resource.sourceUrl || '').toLowerCase()
  const title = String(resource.title || '').toLowerCase()

  return (
    type === 'deck' ||
    ['ppt', 'pptx', 'powerpoint', 'presentation'].includes(format) ||
    tags.some((tag) => ['deck', 'ppt', 'pptx', 'powerpoint', 'presentation'].includes(tag)) ||
    /\.(ppt|pptx)(?:[?#].*)?$/.test(url) ||
    /\b(deck|powerpoint presentation)\b/.test(title)
  )
}

/* ==========================================================================
   Smart Resource Explorer
   ========================================================================== */
function SmartResourceExplorer({ items }: { items: Resource[] }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'az' | 'views'>('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const typeCounts = useMemo(() => {
    const counts = { all: items.length, video: 0, deck: 0, logo: 0, brochure: 0, document: 0, other: 0 }
    items.forEach((r) => {
      if (isDeckResource(r)) counts.deck++
      else if (r.type in counts) counts[r.type as keyof typeof counts]++
      else counts.other++
    })
    return counts
  }, [items])

  const filtered = useMemo(() => {
    let res = items.filter((r) => {
      const matchesSearch =
        !search.trim() ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        (r.fileFormat && r.fileFormat.toLowerCase().includes(search.toLowerCase())) ||
        (r.description && r.description.toLowerCase().includes(search.toLowerCase())) ||
        (r.tags && r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())))

      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'brand_assets'
          ? r.type === 'logo' || r.type === 'brochure'
          : typeFilter === 'deck'
          ? isDeckResource(r)
          : r.type === typeFilter)

      return matchesSearch && matchesType
    })

    return res.sort((a, b) => {
      if (search.trim()) {
        const clean = search.trim().toLowerCase()
        const titleExactA = a.title.toLowerCase() === clean ? 2 : a.title.toLowerCase().startsWith(clean) ? 1 : 0
        const titleExactB = b.title.toLowerCase() === clean ? 2 : b.title.toLowerCase().startsWith(clean) ? 1 : 0
        if (titleExactA !== titleExactB) return titleExactB - titleExactA
      }

      const officialA = a.isOfficial || a.contentStatus === 'Official' ? 1 : 0
      const officialB = b.isOfficial || b.contentStatus === 'Official' ? 1 : 0
      if (officialA !== officialB) return officialB - officialA

      if (sortBy === 'newest') return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
      if (sortBy === 'oldest') return String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
      if (sortBy === 'az') return a.title.localeCompare(b.title)
      if (sortBy === 'views') return (b.viewCount || 0) - (a.viewCount || 0)
      return 0
    })
  }, [items, search, typeFilter, sortBy])

  return (
    <div className="space-y-4">
      {/* Search & Toolbar Control Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[var(--surface-card)] p-3 rounded-2xl border border-[var(--border)] shadow-sm backdrop-blur-md">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search files by title, tags, format, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[12.5px] text-[var(--ink)] placeholder-[var(--ink-45)] outline-none focus:border-[var(--primary)]"
          />
          <span className="absolute left-3 top-2.5 text-[var(--ink-45)]">
            <SearchIcon />
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none bg-[var(--surface-2)] border border-[var(--border)] text-[12px] font-semibold text-[var(--ink)] py-2 pl-8 pr-7 rounded-xl outline-none cursor-pointer hover:border-[var(--border-2)]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="az">Title (A-Z)</option>
              <option value="views">Most Viewed</option>
            </select>
            <span className="absolute left-2.5 pointer-events-none text-[var(--ink-45)]">
              <SortIcon />
            </span>
            <span className="absolute right-2.5 pointer-events-none text-[11px] text-[var(--ink-45)]">▾</span>
          </div>

          <div className="flex rounded-xl border border-[var(--border)] p-0.5 bg-[var(--surface-2)]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm' : 'text-[var(--ink-45)]'
              }`}
              title="Grid View"
            >
              <GridViewIcon />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm' : 'text-[var(--ink-45)]'
              }`}
              title="List View"
            >
              <ListIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Badges */}
      <div className="flex flex-wrap gap-2 text-[12px] font-medium">
        {[
          { key: 'all', label: `All Files (${typeCounts.all})` },
          { key: 'video', label: `Videos (${typeCounts.video})` },
          { key: 'deck', label: `Decks (${typeCounts.deck})` },
          { key: 'brand_assets', label: `Brand Assets (${typeCounts.logo + typeCounts.brochure})` },
          { key: 'document', label: `Documents (${typeCounts.document})` },
          { key: 'other', label: `Other (${typeCounts.other})` },
        ].map((cat) => (
          <button
            key={cat.key}
            onClick={() => setTypeFilter(cat.key)}
            className={`px-3 py-1.5 rounded-full border text-[11.5px] transition-all cursor-pointer ${
              typeFilter === cat.key
                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-md shadow-orange-500/20 font-semibold'
                : 'bg-[var(--surface-card)] border-[var(--border)] text-[var(--ink-70)] hover:border-[var(--border-2)]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {viewMode === 'grid' ? (
        <ResourceGrid items={filtered} />
      ) : filtered.length ? (
        <div className="space-y-2">
          {filtered.map((x) => (
            <ResourceListRow key={x.id} resource={x} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-[13px] text-[var(--ink-45)] rounded-2xl border border-[var(--border)] bg-[var(--surface-card)]">
          No matching files found.
        </div>
      )}
    </div>
  )
}

function SheshiPage({ resources }: { resources: Resource[] }) {
  const items = resources.filter((r) => r.productId === SHESHI_ID)
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-6">
        <div className="flex gap-5 items-center pb-6 border-b border-[var(--border)]">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold bg-gradient-to-tr from-[#3a2214] to-[#ff5500] text-white shadow-xl shadow-orange-500/20 border border-orange-500/30">
            S
          </div>
          <div>
            <div className="badge-pill mb-1">CENTRAL BRAND SUITE</div>
            <h1 className="font-display text-[26px] font-extrabold tracking-tight heading-gradient">
              Sheshi Hub
            </h1>
            <p className="text-[13px] text-[var(--ink-45)]">
              Corporate identity files, executive decks, official logo kits, and brand guidelines.
            </p>
          </div>
        </div>
        <div className="pb-8">
          <SmartResourceExplorer items={items} />
        </div>
      </div>
    </main>
  )
}

function ProductPage({ product, resources }: { product: Product; resources: Resource[] }) {
  const items = resources.filter((r) => r.productId === product.id || r.productId === product.slug)
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-6">
        <div className="flex gap-5 items-center pb-6 border-b border-[var(--border)]">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold border shadow-xl"
            style={{
              background: `${product.color}18`,
              color: product.color,
              borderColor: `${product.color}40`,
            }}
          >
            {product.name[0]}
          </div>
          <div>
            <div className="badge-pill mb-1" style={{ color: product.color, borderColor: `${product.color}35` }}>
              PRODUCT SUITE
            </div>
            <h1 className="font-display text-[26px] font-extrabold tracking-tight heading-gradient">
              {product.name}
            </h1>
            <p className="text-[13px] text-[var(--ink-45)]">{product.description}</p>
          </div>
        </div>
        <div className="pb-8">
          <SmartResourceExplorer items={items} />
        </div>
      </div>
    </main>
  )
}

function FavoritesPage({ resources }: { resources: Resource[] }) {
  const [favIds, setFavIds] = useState<string[]>(getFavoriteIds())
  useEffect(() => {
    const updateFavs = () => setFavIds(getFavoriteIds())
    window.addEventListener('vault-favorites-changed', updateFavs)
    return () => window.removeEventListener('vault-favorites-changed', updateFavs)
  }, [])

  const items = useMemo(() => resources.filter((r) => favIds.includes(r.id)), [resources, favIds])

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-6">
        <div className="flex gap-5 items-center pb-6 border-b border-[var(--border)]">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-xl shadow-amber-500/10">
            <StarIcon filled />
          </div>
          <div>
            <div className="badge-pill mb-1">PERSONAL BOOKMARKS</div>
            <h1 className="font-display text-[26px] font-extrabold tracking-tight heading-gradient flex items-center gap-2">
              Favorites{' '}
              <span className="text-[14px] font-normal text-[var(--ink-45)] font-mono">
                ({items.length} saved)
              </span>
            </h1>
            <p className="text-[13px] text-[var(--ink-45)]">Your personal quick-access resources across Sheshi Vault.</p>
          </div>
        </div>
        <div className="pb-8">
          {items.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-[var(--ink-45)] bg-[var(--surface-card)] rounded-2xl border border-[var(--border)] space-y-2">
              <div className="text-[32px] text-amber-400">⭐</div>
              <div className="font-semibold text-[var(--ink)]">No favorites saved yet</div>
              <p className="text-[12px] max-w-sm mx-auto text-[var(--ink-45)]">
                Click the star icon on any asset card to pin it here for instantaneous access.
              </p>
            </div>
          ) : (
            <SmartResourceExplorer items={items} />
          )}
        </div>
      </div>
    </main>
  )
}

function AllResources({ resources }: { resources: Resource[] }) {
  const [product, setProduct] = useState('')
  const items = product
    ? resources.filter((r) => r.productId === product || productOf(r.productId)?.slug === product || productOf(r.productId)?.id === product)
    : resources

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
          <div>
            <div className="badge-pill mb-1">GLOBAL ASSET LIBRARY</div>
            <h1 className="font-display text-[26px] font-extrabold tracking-tight heading-gradient">
              All Resources
            </h1>
            <p className="text-[13px] text-[var(--ink-45)]">
              Browse all presentations, brand guidelines, documents, and videos.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setProduct('')}
              className={`px-3 py-1.5 rounded-full text-[12px] cursor-pointer transition-all ${
                !product
                  ? 'bg-[var(--primary)] text-white shadow-md shadow-orange-500/20 font-semibold'
                  : 'bg-[var(--surface-card)] border border-[var(--border)] text-[var(--ink-70)]'
              }`}
            >
              All Products
            </button>
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => setProduct(p.slug)}
                className={`px-3 py-1.5 rounded-full text-[12px] cursor-pointer transition-all ${
                  product === p.slug
                    ? 'bg-[var(--primary)] text-white shadow-md shadow-orange-500/20 font-semibold'
                    : 'bg-[var(--surface-card)] border border-[var(--border)] text-[var(--ink-70)]'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="pb-8">
          <SmartResourceExplorer items={items} />
        </div>
      </div>
    </main>
  )
}

/* ==========================================================================
   21st.dev Sidebar Dock
   Tactile obsidian glass dock with glowing hover states, section headers,
   active indicator, and refined profile tile.
   ========================================================================== */
function Sidebar({
  view,
  onView,
  isAdmin,
  profile,
  onSignOut,
  onOpenAuth,
}: {
  view: View
  onView: (v: View) => void
  isAdmin: boolean
  profile: VaultProfile | null
  onSignOut: () => void
  onOpenAuth: (mode: AuthMode) => void
}) {
  const [open, setOpen] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [favCount, setFavCount] = useState(getFavoriteIds().length)

  useEffect(() => {
    const handleFavChange = () => setFavCount(getFavoriteIds().length)
    window.addEventListener('vault-favorites-changed', handleFavChange)
    return () => window.removeEventListener('vault-favorites-changed', handleFavChange)
  }, [])

  const navItem = (active: boolean) =>
    `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] transition-all cursor-pointer ${
      active
        ? 'bg-[var(--primary-soft)] text-[var(--primary)] border border-[rgba(255,85,0,0.25)] font-semibold shadow-[0_0_15px_rgba(255,85,0,0.08)]'
        : 'text-[var(--ink-70)] hover:text-[var(--ink)] hover:bg-white/[0.04]'
    }`

  const label = (text: string) => !collapsed && <span>{text}</span>
  const isAdvanced = profile
    ? (profile.role === 'advanced' || profile.role === 'teammate') && profile.status === 'approved'
    : false

  const initials = (profile?.full_name || profile?.email || 'U')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside
      className={
        (collapsed ? 'w-[70px]' : 'w-[250px]') +
        ' flex-shrink-0 flex flex-col bg-[var(--paper)] border-r border-[var(--border)] transition-all duration-300 select-none z-30'
      }
    >
      {/* Brand Header */}
      <div
        className={
          'h-16 flex items-center ' +
          (collapsed ? 'justify-center px-2' : 'justify-between px-5') +
          ' border-b border-[var(--border)]'
        }
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onView({ kind: 'home' })}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-bold text-white shadow-md shadow-orange-500/25">
              S
            </div>
            <div>
              <div className="font-display text-[15px] font-bold tracking-tight text-[var(--ink)]">
                Sheshi Vault
              </div>
              <div className="text-[9.5px] font-mono tracking-widest text-[var(--primary)] uppercase font-semibold">
                Intelligence
              </div>
            </div>
          </div>
        )}

        {collapsed && (
          <div
            className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-bold text-white shadow-md shadow-orange-500/25 cursor-pointer"
            onClick={() => setCollapsed(false)}
          >
            S
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--ink-45)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] cursor-pointer transition-colors"
        >
          <PanelIcon collapsed={collapsed} />
        </button>
      </div>

      {/* Navigation Dock */}
      <nav className={'flex-1 overflow-y-auto ' + (collapsed ? 'px-2' : 'px-3') + ' py-4 space-y-1'}>
        {!collapsed && (
          <div className="px-3 pb-1 pt-1 text-[9.5px] font-mono font-bold tracking-wider text-[var(--ink-30)] uppercase">
            Navigation
          </div>
        )}

        <button title="Home" onClick={() => onView({ kind: 'home' })} className={navItem(view.kind === 'home')}>
          <HomeIcon />
          {label('Home')}
        </button>

        <button title="Sheshi" onClick={() => onView({ kind: 'sheshi' })} className={navItem(view.kind === 'sheshi')}>
          <CompanyIcon />
          {label('Sheshi Hub')}
        </button>

        <button
          title="Products"
          onClick={() => {
            if (collapsed) setCollapsed(false)
            setOpen(!open)
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] text-[var(--ink-70)] hover:text-[var(--ink)] hover:bg-white/[0.04] cursor-pointer transition-all"
        >
          <GridIcon />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Products</span>
              <Chevron open={open} />
            </>
          )}
        </button>

        {open && !collapsed && (
          <div className="ml-4 pl-3 border-l border-[var(--border)] space-y-0.5 py-1">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => onView({ kind: 'product', slug: p.slug })}
                className={
                  'w-full flex items-center gap-2 px-2.5 py-1.5 text-left rounded-lg text-[12px] cursor-pointer transition-colors ' +
                  (view.kind === 'product' && view.slug === p.slug
                    ? 'font-bold text-[var(--primary)] bg-[var(--primary-soft)]'
                    : 'text-[var(--ink-45)] hover:text-[var(--ink)] hover:bg-white/[0.03]')
                }
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        )}

        <button
          title="Events"
          onClick={() => onView({ kind: 'events' })}
          className={navItem(view.kind === 'events' || view.kind === 'event-detail')}
        >
          <CalIcon />
          {label('Events')}
        </button>

        <button
          title="Videos"
          onClick={() => onView({ kind: 'videos' })}
          className={navItem(view.kind === 'videos')}
        >
          <PlayIcon />
          {label('Video Vault')}
        </button>

        <button
          title="Favorites"
          onClick={() => onView({ kind: 'favorites' })}
          className={navItem(view.kind === 'favorites')}
        >
          <StarIcon filled={view.kind === 'favorites'} />
          {!collapsed && (
            <span className="flex-1 flex items-center justify-between">
              <span>Favorites</span>
              {favCount > 0 && (
                <span className="badge-pill bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] py-0 px-2">
                  {favCount}
                </span>
              )}
            </span>
          )}
        </button>

        <button
          title="All Resources"
          onClick={() => onView({ kind: 'all' })}
          className={navItem(view.kind === 'all')}
        >
          <DownloadIcon />
          {label('All Resources')}
        </button>

        {(isAdmin || isAdvanced) && (
          <div className="pt-4 mt-4 border-t border-[var(--border)]">
            {!collapsed && (
              <div className="px-3 pb-1 text-[9.5px] font-mono font-bold tracking-wider text-[var(--ink-30)] uppercase">
                Governance
              </div>
            )}
            <button
              title="Admin Console"
              onClick={() => onView({ kind: 'admin' })}
              className={navItem(view.kind === 'admin')}
            >
              <ShieldIcon />
              {label(isAdmin ? 'Admin Console' : 'Upload & Manage')}
            </button>
          </div>
        )}
      </nav>

      {/* User Profile Card Footer */}
      <div className="p-3 border-t border-[var(--border)] bg-[var(--canvas-deep)]">
        {profile ? (
          <div className="flex flex-col gap-2">
            {!collapsed && (
              <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border)]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-bold text-white text-[11px] shadow-sm">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-[var(--ink)] truncate">
                    {profile.full_name || profile.email}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--ink-45)] truncate flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="uppercase">{profile.role}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={onSignOut}
              className="w-full py-1.5 px-3 rounded-xl border border-[var(--border)] text-[11px] font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              {collapsed ? '✕' : 'Sign Out'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {!collapsed && (
              <div className="text-[11px] text-[var(--ink-45)] px-1">
                Corporate credentials required for asset uploads.
              </div>
            )}
            <button
              onClick={() => onOpenAuth('login')}
              className="w-full py-2 px-3 rounded-xl bg-[var(--primary)] text-white text-[12px] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
            >
              {collapsed ? '→' : 'Sign In'}
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

/* ==========================================================================
   Main LiveApp Application Shell
   ========================================================================== */
export default function LiveApp() {
  const [view, setView] = useState<View>({ kind: 'home' })
  const [resources, setResources] = useState<Resource[]>([])
  const [events, setEvents] = useState<ManagedEvent[]>([])
  const [profile, setProfile] = useState<VaultProfile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('login')

  // Modern UI Modal States
  const [showCmdPalette, setShowCmdPalette] = useState(false)
  const [showMultiStepUpload, setShowMultiStepUpload] = useState(false)

  const fetchProfile = async (): Promise<VaultProfile | null> => {
    try {
      const p = await getMyProfile()
      setProfile(p)
      setIsAdmin(p?.role === 'admin' && p?.status === 'approved')
      if (p?.full_name) {
        localStorage.setItem('sheshi-vault-user-name', p.full_name)
      }
      return p
    } catch {
      setProfile(null)
      setIsAdmin(false)
      return null
    }
  }

  const loadAll = async () => {
    try {
      const [r, e] = await Promise.all([getManagedResources(), getEvents()])
      setResources(r.filter((x) => !x.deletedAt))
      setEvents(e)
      setDbError(null)
    } catch (err: any) {
      setDbError(err.message || 'Failed to connect')
    }
  }

  const checkNotifications = async (userKey: string) => {
    try {
      await checkUnreadNotificationsOnLogin(userKey)
    } catch (e) {
      console.warn('Notification check failed:', e)
    }
  }

  const navigateToEvent = async (eventId?: string) => {
    try {
      const freshEvents = await getEvents()
      setEvents(freshEvents)
      if (eventId && eventId !== 'events') {
        const found = freshEvents.find((e) => e.id === eventId)
        if (found) {
          setView({ kind: 'event-detail', id: eventId })
          return
        }
      }
    } catch {
      /* fallback */
    }

    if (eventId && eventId !== 'events') {
      setView({ kind: 'event-detail', id: eventId })
    } else {
      setView({ kind: 'events' })
    }
  }

  useEffect(() => {
    const unsubscribe = subscribeToRealtimeNotifications(() => {
      // Realtime notifications processed via custom events
    })

    const handleNavigate = (e: Event) => {
      const custom = e as CustomEvent<{ eventId?: string }>
      if (custom.detail?.eventId) {
        navigateToEvent(custom.detail.eventId)
      }
    }
    window.addEventListener('vault-navigate-event', handleNavigate)

    const handleFocus = () => {
      try {
        const pending = localStorage.getItem('sheshi_vault_pending_navigation')
        if (pending) {
          localStorage.removeItem('sheshi_vault_pending_navigation')
          navigateToEvent(pending)
        }
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      unsubscribe()
      window.removeEventListener('vault-navigate-event', handleNavigate)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  useEffect(() => {
    if (view.kind === 'event-detail') {
      const exists = events.some((e) => e.id === view.id)
      if (!exists) {
        loadAll()
      }
    }
  }, [view, events])

  useEffect(() => {
    const init = async () => {
      setAuthLoading(true)
      const p = await fetchProfile()
      if (p && hasWeeklyAuthentication()) {
        await loadAll()
        checkNotifications(p.email || p.id)
      }
      setAuthLoading(false)
    }
    init()

    const sub = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        const p = await fetchProfile()
        if (p && hasWeeklyAuthentication()) {
          await loadAll()
          checkNotifications(p.email || p.id)
        }
      } else if (event === 'TOKEN_REFRESHED') {
        const p = await fetchProfile()
        if (p && hasWeeklyAuthentication()) await loadAll()
      } else if (event === 'SIGNED_OUT') {
        setProfile(null)
        setIsAdmin(false)
        setResources([])
        setEvents([])
        setView({ kind: 'home' })
        localStorage.removeItem('sheshi-vault-user-name')
      }
    })

    const handleVaultChange = () => {
      loadAll()
    }
    window.addEventListener('vault-resources-changed', handleVaultChange)
    window.addEventListener('vault-events-changed', handleVaultChange)

    return () => {
      sub.data.subscription.unsubscribe()
      window.removeEventListener('vault-resources-changed', handleVaultChange)
      window.removeEventListener('vault-events-changed', handleVaultChange)
    }
  }, [])

  useEffect(() => {
    if (!profile || !hasWeeklyAuthentication()) return

    const now = new Date()
    const nextMonday = new Date(now)
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7
    nextMonday.setDate(now.getDate() + daysUntilMonday)
    nextMonday.setHours(0, 0, 0, 0)

    const weeklyTimer = window.setTimeout(async () => {
      await signOut()
      setResources([])
      setEvents([])
      setProfile(null)
      setIsAdmin(false)
      setView({ kind: 'home' })
    }, Math.max(1000, nextMonday.getTime() - now.getTime()))

    return () => window.clearTimeout(weeklyTimer)
  }, [profile])

  const handleSignOut = async () => {
    setAuthLoading(true)
    await signOut()
    setResources([])
    setEvents([])
    setProfile(null)
    setIsAdmin(false)
    setView({ kind: 'home' })
    setAuthLoading(false)
  }

  const canUpload =
    profile &&
    profile.status === 'approved' &&
    (profile.role === 'admin' || profile.role === 'advanced' || profile.role === 'teammate')

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--canvas)]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-3 border-[var(--primary)] border-t-transparent animate-spin mx-auto" />
          <div className="text-[12px] font-mono text-[var(--ink-45)]">Connecting to Sheshi Vault...</div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <AuthScreen
        isOpen
        initialMode="login"
        onClose={() => {}}
        onSuccess={async () => {
          const p = await fetchProfile()
          if (p && hasWeeklyAuthentication()) {
            await loadAll()
          }
        }}
      />
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--canvas)] text-[var(--ink)]">
      <Sidebar
        view={view}
        onView={setView}
        isAdmin={isAdmin}
        profile={profile}
        onSignOut={handleSignOut}
        onOpenAuth={(mode) => {
          setAuthMode(mode)
          setShowAuthModal(true)
        }}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 21st.dev Frosted Glass Top Control Bar */}
        <header className="h-16 border-b border-[var(--border)] bg-[var(--surface-card)] backdrop-blur-xl px-6 flex items-center justify-between gap-4 flex-shrink-0 z-20">
          {/* Spotlight ⌘K Trigger Button */}
          <button
            type="button"
            onClick={() => setShowCmdPalette(true)}
            className="flex items-center gap-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] hover:border-[var(--border-2)] rounded-xl px-4 py-2 text-[12.5px] text-[var(--ink-45)] transition-all cursor-pointer w-full max-w-md shadow-xs group"
          >
            <SearchIcon />
            <span className="flex-1 text-left text-[var(--ink-45)] group-hover:text-[var(--ink-70)] transition-colors">
              Search resources, events, videos...
            </span>
            <kbd className="px-2 py-0.5 rounded bg-[var(--surface)] text-[10.5px] font-mono font-bold text-[var(--ink-70)] border border-[var(--border)] shadow-xs">
              ⌘K
            </kbd>
          </button>

          <div className="flex items-center gap-3">
            {/* Telemetry Radar Pill */}
            <div className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[11px] font-mono font-semibold">
              <span className="pulse-dot bg-emerald-400" />
              <span>Vault Online</span>
            </div>

            {/* Notification Center */}
            <NotificationCenter
              userKey={profile?.email || profile?.id || 'guest'}
              onSelectEvent={navigateToEvent}
            />

            {canUpload && (
              <button
                type="button"
                onClick={() => setShowMultiStepUpload(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-[12.5px] font-semibold transition-all shadow-md shadow-orange-500/20 cursor-pointer flex items-center gap-2"
              >
                <span>+ Upload Asset</span>
              </button>
            )}
          </div>
        </header>

        {dbError && (
          <div className="bg-red-500/10 border-b border-red-500/20 text-red-400 px-6 py-2 text-[12px] flex justify-between items-center">
            <span>{dbError}</span>
            <button onClick={loadAll} className="underline cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {view.kind === 'home' && (
          <Home
            resources={resources}
            events={events}
            onProduct={(s) => setView({ kind: 'product', slug: s })}
            onSheshi={() => setView({ kind: 'sheshi' })}
            onSelectEvent={(id) => setView({ kind: 'event-detail', id })}
          />
        )}
        {view.kind === 'sheshi' && <SheshiPage resources={resources} />}
        {view.kind === 'product' &&
          (() => {
            const p = productOf(view.slug)
            return p ? <ProductPage product={p} resources={resources} /> : <AllResources resources={resources} />
          })()}
        {view.kind === 'events' && (
          <EventsPage events={events} onSelectEvent={(id) => setView({ kind: 'event-detail', id })} />
        )}
        {view.kind === 'event-detail' &&
          (() => {
            const event = events.find((e) => e.id === view.id)
            return event ? (
              <EventPage
                event={event}
                profile={profile}
                isAdmin={isAdmin}
                onBack={() => setView({ kind: 'events' })}
                onEventUpdated={loadAll}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-[13px] text-[var(--ink-45)]">
                Event not found.
              </div>
            )
          })()}
        {view.kind === 'videos' && <VideosPage resources={resources} />}
        {view.kind === 'favorites' && <FavoritesPage resources={resources} />}
        {view.kind === 'all' && <AllResources resources={resources} />}
        {view.kind === 'admin' && <AdminConsole />}
      </div>

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={showCmdPalette}
        onClose={() => setShowCmdPalette(false)}
        resources={resources}
        events={events}
        onSelectProduct={(slug) => setView({ kind: 'product', slug })}
        onSelectEvent={(id) => setView({ kind: 'event-detail', id })}
      />

      {/* Guided Multi-Step Upload Modal */}
      <MultiStepUploadModal
        isOpen={showMultiStepUpload}
        onClose={() => setShowMultiStepUpload(false)}
        onUploadComplete={() => {
          loadAll()
        }}
      />

      <AuthScreen
        isOpen={showAuthModal}
        initialMode={authMode}
        onClose={() => setShowAuthModal(false)}
        onSuccess={async () => {
          setShowAuthModal(false)
          const p = await fetchProfile()
          if (p && hasWeeklyAuthentication()) {
            await loadAll()
            checkNotifications(p.email || p.id)
          }
        }}
      />

      {/* In-App Notification Toast */}
      <NotificationToast onSelectEvent={navigateToEvent} />
    </div>
  )
}