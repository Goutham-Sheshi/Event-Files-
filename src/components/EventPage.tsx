import React, { useEffect, useState } from 'react'
import type { ManagedEvent } from '../eventsApi'
import {
  calculateEventStatus,
  deleteEvent,
  getEventGallery,
  getEventLinks,
  getEventResources,
  uploadEventResource,
  uploadEventGalleryMedia,
  addEventLink,
  deleteEventResource,
  deleteEventGalleryMedia,
  deleteEventLink,
} from '../eventsApi'
import type {
  EventResourceItem,
  EventResourceCategory,
  EventGalleryMediaItem,
  EventLinkItem,
  VaultProfile,
  Product,
} from '../types'
import { products } from '../data'
import { triggerDirectDownload } from '../utils'
import { openViewer } from '../fileViewerBridge'
import EventNotesEditor from './EventNotesEditor'

interface EventPageProps {
  event: ManagedEvent
  profile: VaultProfile | null
  isAdmin: boolean
  onBack: () => void
  onEventUpdated: () => void
  onOpenEditModal?: (event: ManagedEvent) => void
}

type TabType = 'overview' | 'resources' | 'gallery' | 'links' | 'notes'

const CATEGORIES: { id: EventResourceCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Files' },
  { id: 'documents', label: 'Documents' },
  { id: 'presentations', label: 'Presentations' },
  { id: 'marketing', label: 'Marketing Assets' },
  { id: 'design', label: 'Design Files' },
  { id: 'other', label: 'Other' },
]

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function FolderStatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function MediaStatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function LinkStatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
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

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export default function EventPage({
  event,
  profile,
  isAdmin,
  onBack,
  onEventUpdated,
  onOpenEditModal,
}: EventPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [resources, setResources] = useState<EventResourceItem[]>([])
  const [gallery, setGallery] = useState<EventGalleryMediaItem[]>([])
  const [links, setLinks] = useState<EventLinkItem[]>([])

  const [, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<EventResourceCategory | 'all'>('all')

  // Modals
  const [showUploadResourceModal, setShowUploadResourceModal] = useState(false)
  const [showUploadMediaModal, setShowUploadMediaModal] = useState(false)
  const [showAddLinkModal, setShowAddLinkModal] = useState(false)

  // Upload Form States
  const [resourceFile, setResourceFile] = useState<File | null>(null)
  const [resourceTitle, setResourceTitle] = useState('')
  const [resourceCategory, setResourceCategory] = useState<EventResourceCategory>('documents')

  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaTitle, setMediaTitle] = useState('')

  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkDesc, setLinkDesc] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Lightbox Modal
  const [selectedPhoto, setSelectedPhoto] = useState<EventGalleryMediaItem | null>(null)

  const isAdvanced = profile
    ? (profile.role === 'advanced' || profile.role === 'teammate') && profile.status === 'approved'
    : false
  const canUpload = isAdmin || isAdvanced

  const product = products.find((p) => p.id === event.product_id || p.slug === event.product_id)
  const status = calculateEventStatus(event)
  const userEmail = profile?.email || ''

  const loadData = async () => {
    setLoading(true)
    try {
      const [resData, galData, linkData] = await Promise.all([
        getEventResources(event.id),
        getEventGallery(event.id),
        getEventLinks(event.id),
      ])
      setResources(resData)
      setGallery(galData)
      setLinks(linkData)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [event.id])

  const handleDeleteEvent = async () => {
    if (!isAdmin) return
    if (!window.confirm(`Are you sure you want to delete event "${event.title}"? This action cannot be undone.`)) return
    try {
      setBusy(true)
      await deleteEvent(event.id)
      onEventUpdated()
      onBack()
    } catch (e: any) {
      alert(e?.message || 'Failed to delete event')
    } finally {
      setBusy(false)
    }
  }

  // Handle Resource Upload
  const handleResourceUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resourceFile) {
      setError('Please select a file to upload')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await uploadEventResource(event.id, resourceFile, resourceTitle, resourceCategory)
      setShowUploadResourceModal(false)
      setResourceFile(null)
      setResourceTitle('')
      setResourceCategory('documents')
      loadData()
    } catch (err: any) {
      setError(err?.message || 'Failed to upload resource')
    } finally {
      setBusy(false)
    }
  }

  // Handle Gallery Upload
  const handleMediaUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mediaFile) {
      setError('Please select an image or video file')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await uploadEventGalleryMedia(event.id, mediaFile, mediaTitle)
      setShowUploadMediaModal(false)
      setMediaFile(null)
      setMediaTitle('')
      loadData()
    } catch (err: any) {
      setError(err?.message || 'Failed to upload media')
    } finally {
      setBusy(false)
    }
  }

  // Handle Add Link
  const handleAddLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkTitle.trim() || !linkUrl.trim()) {
      setError('Title and URL are required')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await addEventLink(event.id, linkTitle, linkUrl, linkDesc)
      setShowAddLinkModal(false)
      setLinkTitle('')
      setLinkUrl('')
      setLinkDesc('')
      loadData()
    } catch (err: any) {
      setError(err?.message || 'Failed to add link')
    } finally {
      setBusy(false)
    }
  }

  // Deletion checks
  const canDeleteResource = (item: EventResourceItem) =>
    isAdmin || (isAdvanced && item.uploadedBy.toLowerCase() === userEmail.toLowerCase())
  const canDeleteMedia = (item: EventGalleryMediaItem) =>
    isAdmin || (isAdvanced && item.uploadedBy.toLowerCase() === userEmail.toLowerCase())
  const canDeleteLink = (item: EventLinkItem) =>
    isAdmin || (isAdvanced && item.addedBy.toLowerCase() === userEmail.toLowerCase())

  const handleDeleteResource = async (item: EventResourceItem) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return
    await deleteEventResource(item.id, userEmail, isAdmin)
    loadData()
  }

  const handleDeleteMedia = async (item: EventGalleryMediaItem) => {
    if (!window.confirm(`Delete media item "${item.title}"?`)) return
    await deleteEventGalleryMedia(item.id, userEmail, isAdmin)
    loadData()
  }

  const handleDeleteLink = async (item: EventLinkItem) => {
    if (!window.confirm(`Delete link "${item.title}"?`)) return
    await deleteEventLink(item.id, userEmail, isAdmin)
    loadData()
  }

  // Filtered Resources
  const filteredResources = resources.filter((item) => {
    const matchesSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.fileFormat && item.fileFormat.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter
    return matchesSearch && matchesCat
  })

  // Date Formatting
  const startDateText = new Date(event.event_date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const endDateText = event.end_date
    ? new Date(event.end_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : null
  const dateRangeText = endDateText ? `${startDateText} — ${endDateText}` : startDateText

  // Photos vs Videos in Gallery
  const photos = gallery.filter((g) => g.mediaType === 'image')
  const videos = gallery.filter((g) => g.mediaType === 'video')

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--canvas)]">
      {/* 21st.dev Cinematic Event Hero Banner */}
      <div className="relative bg-[var(--canvas-deep)] text-white overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0 z-0 opacity-40">
          {event.banner ? (
            <img src={event.banner} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-orange-600/60 via-indigo-900/60 to-slate-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--canvas)] via-[var(--canvas)]/70 to-transparent" />
        </div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-8 py-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-white/80 hover:text-white mb-6 bg-white/10 hover:bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 transition-all cursor-pointer"
          >
            <span>←</span> Back to Events
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3.5 max-w-3xl">
              <div className="flex items-center gap-2 flex-wrap">
                {product && (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border"
                    style={{
                      background: `${product.color}20`,
                      borderColor: `${product.color}40`,
                      color: product.color,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: product.color }} />
                    {product.name}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                    status === 'ongoing'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : status === 'upcoming'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
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
                <span className="badge-pill bg-white/10 text-white/90 border-white/15 text-xs py-0.5">
                  {event.event_type}
                </span>
              </div>

              <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                {event.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-white/80 font-mono">
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                  <CalendarIcon />
                  <span>{dateRangeText}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                    <LocationIcon />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2.5">
                {onOpenEditModal && (
                  <button
                    onClick={() => onOpenEditModal(event)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer"
                  >
                    Edit Event
                  </button>
                )}
                <button
                  onClick={handleDeleteEvent}
                  disabled={busy}
                  className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-semibold border border-red-500/30 transition-all cursor-pointer"
                >
                  Delete Event
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preline UI Sticky Segmented Tab Switcher */}
      <div className="sticky top-0 z-20 bg-[#090d16]/90 backdrop-blur-2xl border-b border-white/[0.08] py-3">
        <div className="max-w-[1400px] mx-auto px-8 flex gap-2 overflow-x-auto">
          {(['overview', 'resources', 'gallery', 'links', 'notes'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border-white/10'
              }`}
            >
              <span>
                {tab === 'resources'
                  ? `Resources (${resources.length})`
                  : tab === 'gallery'
                  ? `Gallery (${gallery.length})`
                  : tab === 'links'
                  ? `Links (${links.length})`
                  : tab === 'notes'
                  ? 'Notes & Intel'
                  : 'Overview'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-[1400px] mx-auto px-8 py-8">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Description Card */}
            <div className="preline-card card-highlight p-6 sm:p-7 bg-[#0d121f]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>About this Event</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-orange-500/15 text-orange-400 border border-orange-500/30">
                    Official Brief
                  </span>
                </h2>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {event.description || 'No detailed description provided for this event.'}
              </p>
            </div>

            {/* 3 Preline UI Telemetry Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="preline-metric-card p-6 flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold shadow-[0_0_16px_rgba(249,115,22,0.2)]">
                  <FolderStatIcon />
                </div>
                <div>
                  <div className="text-3xl font-extrabold text-white font-mono tracking-tight">{resources.length}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">Event Resources & Files</div>
                </div>
              </div>

              <div className="preline-metric-card p-6 flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold shadow-[0_0_16px_rgba(99,102,241,0.2)]">
                  <MediaStatIcon />
                </div>
                <div>
                  <div className="text-3xl font-extrabold text-white font-mono tracking-tight">{gallery.length}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">Photos & Videos</div>
                </div>
              </div>

              <div className="preline-metric-card p-6 flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shadow-[0_0_16px_rgba(16,185,129,0.2)]">
                  <LinkStatIcon />
                </div>
                <div>
                  <div className="text-3xl font-extrabold text-white font-mono tracking-tight">{links.length}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">External References</div>
                </div>
              </div>
            </div>

            {/* Event Summary Details Grid */}
            <div className="preline-card card-highlight p-6 bg-[#0d121f] space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Event Parameters & Specifications
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <span className="text-slate-400 block mb-1">Associated Suite</span>
                  <span className="font-bold text-white text-[13px]">{product?.name || 'Sheshi'}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <span className="text-slate-400 block mb-1">Format</span>
                  <span className="font-bold text-white text-[13px]">{event.event_type}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <span className="text-slate-400 block mb-1">Start Date</span>
                  <span className="font-bold text-white text-[13px]">{startDateText}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <span className="text-slate-400 block mb-1">End Date</span>
                  <span className="font-bold text-white text-[13px]">{endDateText || 'Same day'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RESOURCES TAB */}
        {activeTab === 'resources' && (
          <div className="space-y-6">
            {/* Preline Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a0e19]/90 border border-white/[0.08] p-3 rounded-2xl shadow-xl backdrop-blur-2xl">
              <div className="relative flex-1 max-w-lg">
                <input
                  type="text"
                  placeholder="Search event resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500 focus:bg-white/[0.06] transition-all"
                />
                <span className="absolute left-3.5 top-3 text-slate-400">
                  <SearchIcon />
                </span>
              </div>

              {canUpload && (
                <button
                  onClick={() => setShowUploadResourceModal(true)}
                  className="px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-white text-xs font-bold shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>+</span> Upload Resource
                </button>
              )}
            </div>

            {/* Preline Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {CATEGORIES.map((cat) => {
                const count =
                  cat.id === 'all' ? resources.length : resources.filter((r) => r.category === cat.id).length
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer border ${
                      categoryFilter === cat.id
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                        : 'bg-[#0c101d] border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        categoryFilter === cat.id ? 'bg-white/25 text-white' : 'bg-white/[0.06] text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Resources List */}
            {filteredResources.length > 0 ? (
              <div className="space-y-2">
                {filteredResources.map((item) => (
                  <div key={item.id} className="preline-row p-4 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-[#070a12] flex items-center justify-center font-bold text-xs uppercase text-orange-400 border border-white/10 font-mono">
                      {item.fileFormat || 'FILE'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-white truncate">{item.title}</div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                        <span className="capitalize text-slate-300">{item.category}</span>
                        {item.fileSize && <span>• {item.fileSize}</span>}
                        <span>• Uploaded by {item.uploadedBy}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewer(item.fileUrl, item.title, item.id, [], 'document', '')}
                        className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-xs font-semibold border border-white/10 cursor-pointer transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => triggerDirectDownload(item.fileUrl, item.title)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-white text-xs font-bold shadow-[0_0_12px_rgba(249,115,22,0.25)] cursor-pointer transition-all"
                      >
                        Download
                      </button>
                      {canDeleteResource(item) && (
                        <button
                          onClick={() => handleDeleteResource(item)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                          title="Delete resource"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-slate-400 bg-[#0c101d] border border-white/[0.08] rounded-3xl space-y-2">
                <div className="text-2xl">📁</div>
                <div className="font-semibold text-white">No event resources in this category</div>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Files uploaded to this event will appear here for all authorized team members.
                </p>
              </div>
            )}
          </div>
        )}

        {/* GALLERY TAB */}
        {activeTab === 'gallery' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Event Media Gallery</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  High-resolution photo coverage and event video records.
                </p>
              </div>

              {canUpload && (
                <button
                  onClick={() => setShowUploadMediaModal(true)}
                  className="px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-white text-xs font-bold shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>+</span> Upload Media
                </button>
              )}
            </div>

            {/* Photos Section */}
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-4">
                Photos ({photos.length})
              </h3>
              {photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative bg-[#0c101d] rounded-2xl overflow-hidden aspect-square cursor-pointer border border-white/[0.08] hover:border-orange-500/40 shadow-sm transition-colors"
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      <img
                        src={photo.fileUrl}
                        alt={photo.title}
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                        <div className="text-white text-xs font-semibold truncate">{photo.title}</div>
                        {canDeleteMedia(photo) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteMedia(photo)
                            }}
                            className="mt-2 text-xs text-red-300 hover:text-red-100 bg-red-900/60 px-2.5 py-1 rounded-lg w-fit flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <TrashIcon /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-14 text-center text-xs text-slate-400 bg-[#0c101d] border border-white/[0.08] rounded-3xl">
                  No photos uploaded for this event.
                </div>
              )}
            </div>

            {/* Videos Section */}
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-4">
                Videos ({videos.length})
              </h3>
              {videos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      className="preline-card card-highlight overflow-hidden shadow-sm flex flex-col bg-[#0c101d]"
                    >
                      <div className="h-44 bg-black relative flex items-center justify-center">
                        <video src={video.fileUrl} controls className="w-full h-full object-cover" />
                      </div>
                      <div className="p-3.5 flex items-center justify-between gap-2 border-t border-white/[0.08]">
                        <span className="font-bold text-xs text-white truncate">{video.title}</span>
                        {canDeleteMedia(video) && (
                          <button
                            onClick={() => handleDeleteMedia(video)}
                            className="text-xs text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-14 text-center text-xs text-slate-400 bg-[#0c101d] border border-white/[0.08] rounded-3xl">
                  No videos uploaded for this event.
                </div>
              )}
            </div>
          </div>
        )}

        {/* LINKS TAB */}
        {activeTab === 'links' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">External References & Portals</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Registration sites, shared drives, and coverage links.
                </p>
              </div>

              {canUpload && (
                <button
                  onClick={() => setShowAddLinkModal(true)}
                  className="px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-white text-xs font-bold shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>+</span> Add Link
                </button>
              )}
            </div>

            {links.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {links.map((item) => (
                  <div
                    key={item.id}
                    className="preline-card card-highlight p-5 flex flex-col justify-between hover:border-orange-500/30 transition-all bg-[#0d121f]"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-sm text-white leading-snug">{item.title}</h3>
                        <span className="text-orange-400">
                          <ExternalLinkIcon />
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-300 line-clamp-3 mb-4">{item.description}</p>
                      )}
                      <div className="text-[11px] font-mono text-slate-500 truncate mb-4">{item.url}</div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1.5"
                      >
                        Open Link <ExternalLinkIcon />
                      </a>
                      {canDeleteLink(item) && (
                        <button
                          onClick={() => handleDeleteLink(item)}
                          className="text-xs text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg font-semibold cursor-pointer transition-colors"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-slate-400 bg-[#0c101d] border border-white/[0.08] rounded-3xl space-y-2">
                <div className="text-2xl">🔗</div>
                <div className="font-semibold text-white">No external links added</div>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Add direct links to external conference sites, slide decks, or video recordings.
                </p>
              </div>
            )}
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && <EventNotesEditor eventId={event.id} canEdit={canUpload} />}
      </div>

      {/* UPLOAD RESOURCE MODAL */}
      {showUploadResourceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleResourceUploadSubmit}
            className="w-full max-w-lg bg-[var(--paper)] border border-[var(--border)] rounded-3xl shadow-2xl p-6 space-y-4"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-[var(--ink)] font-display">Upload Event Resource</h3>
                <p className="text-xs text-[var(--ink-45)] mt-0.5">Attach documents, decks or assets to this event.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadResourceModal(false)}
                className="text-[var(--ink-45)] text-xl hover:text-[var(--ink)] cursor-pointer"
              >
                ×
              </button>
            </div>

            {error && <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-300 text-xs rounded-xl">⚠️ {error}</div>}

            <label className="block text-xs font-semibold text-[var(--ink-70)]">
              File *
              <input
                type="file"
                onChange={(e) => setResourceFile(e.target.files?.[0] || null)}
                className="mt-1.5 w-full p-2.5 border border-[var(--border)] rounded-xl text-xs bg-[var(--surface)] text-[var(--ink)]"
                required
              />
            </label>

            <label className="block text-xs font-semibold text-[var(--ink-70)]">
              File Name / Title
              <input
                type="text"
                placeholder="e.g. India FinTech Keynote Deck.pptx"
                value={resourceTitle}
                onChange={(e) => setResourceTitle(e.target.value)}
                className="mt-1.5 w-full p-2.5 border border-[var(--border)] rounded-xl text-xs bg-[var(--surface)] text-[var(--ink)]"
              />
            </label>

            <label className="block text-xs font-semibold text-[var(--ink-70)]">
              Category *
              <select
                value={resourceCategory}
                onChange={(e) => setResourceCategory(e.target.value as EventResourceCategory)}
                className="mt-1.5 w-full p-2.5 border border-[var(--border)] rounded-xl text-xs bg-[var(--surface)] text-[var(--ink)]"
              >
                <option value="documents">Documents</option>
                <option value="presentations">Presentations</option>
                <option value="marketing">Marketing Assets</option>
                <option value="design">Design Files</option>
                <option value="other">Other</option>
              </select>
            </label>

            <div className="flex justify-end gap-2.5 pt-4">
              <button
                type="button"
                onClick={() => setShowUploadResourceModal(false)}
                className="px-4 py-2 text-xs font-semibold border border-[var(--border)] rounded-xl text-[var(--ink-70)] hover:bg-[var(--surface)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                className="px-4 py-2 text-xs font-semibold bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-hover)] cursor-pointer"
              >
                {busy ? 'Uploading...' : 'Upload Resource'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* UPLOAD MEDIA MODAL */}
      {showUploadMediaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleMediaUploadSubmit}
            className="w-full max-w-lg bg-[var(--paper)] border border-[var(--border)] rounded-3xl shadow-2xl p-6 space-y-4"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-[var(--ink)] font-display">Upload Gallery Media</h3>
                <p className="text-xs text-[var(--ink-45)] mt-0.5">Add photos or videos to the event media gallery.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadMediaModal(false)}
                className="text-[var(--ink-45)] text-xl hover:text-[var(--ink)] cursor-pointer"
              >
                ×
              </button>
            </div>

            {error && <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-300 text-xs rounded-xl">⚠️ {error}</div>}

            <label className="block text-xs font-semibold text-[var(--ink-70)]">
              Select Image or Video *
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                className="mt-1.5 w-full p-2.5 border border-[var(--border)] rounded-xl text-xs bg-[var(--surface)] text-[var(--ink)]"
                required
              />
            </label>

            <label className="block text-xs font-semibold text-[var(--ink-70)]">
              Title / Caption
              <input
                type="text"
                placeholder="e.g. Keynote Opening Session"
                value={mediaTitle}
                onChange={(e) => setMediaTitle(e.target.value)}
                className="mt-1.5 w-full p-2.5 border border-[var(--border)] rounded-xl text-xs bg-[var(--surface)] text-[var(--ink)]"
              />
            </label>

            <div className="flex justify-end gap-2.5 pt-4">
              <button
                type="button"
                onClick={() => setShowUploadMediaModal(false)}
                className="px-4 py-2 text-xs font-semibold border border-[var(--border)] rounded-xl text-[var(--ink-70)] hover:bg-[var(--surface)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                className="px-4 py-2 text-xs font-semibold bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-hover)] cursor-pointer"
              >
                {busy ? 'Uploading...' : 'Upload Media'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD LINK MODAL */}
      {showAddLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddLinkSubmit}
            className="w-full max-w-lg bg-[var(--paper)] border border-[var(--border)] rounded-3xl shadow-2xl p-6 space-y-4"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-[var(--ink)] font-display">Add External Reference Link</h3>
                <p className="text-xs text-[var(--ink-45)] mt-0.5">Attach portal URLs, social posts, or press coverage.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLinkModal(false)}
                className="text-[var(--ink-45)] text-xl hover:text-[var(--ink)] cursor-pointer"
              >
                ×
              </button>
            </div>

            {error && <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-300 text-xs rounded-xl">⚠️ {error}</div>}

            <label className="block text-xs font-semibold text-[var(--ink-70)]">
              Link Title *
              <input
                type="text"
                placeholder="e.g. Official Summit Registration Portal"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                className="mt-1.5 w-full p-2.5 border border-[var(--border)] rounded-xl text-xs bg-[var(--surface)] text-[var(--ink)]"
                required
              />
            </label>

            <label className="block text-xs font-semibold text-[var(--ink-70)]">
              URL *
              <input
                type="url"
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="mt-1.5 w-full p-2.5 border border-[var(--border)] rounded-xl text-xs bg-[var(--surface)] text-[var(--ink)]"
                required
              />
            </label>

            <label className="block text-xs font-semibold text-[var(--ink-70)]">
              Description (Optional)
              <textarea
                placeholder="Brief notes about this link..."
                value={linkDesc}
                onChange={(e) => setLinkDesc(e.target.value)}
                rows={3}
                className="mt-1.5 w-full p-2.5 border border-[var(--border)] rounded-xl text-xs bg-[var(--surface)] text-[var(--ink)]"
              />
            </label>

            <div className="flex justify-end gap-2.5 pt-4">
              <button
                type="button"
                onClick={() => setShowAddLinkModal(false)}
                className="px-4 py-2 text-xs font-semibold border border-[var(--border)] rounded-xl text-[var(--ink-70)] hover:bg-[var(--surface)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                className="px-4 py-2 text-xs font-semibold bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-hover)] cursor-pointer"
              >
                {busy ? 'Saving...' : 'Add Link'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PHOTO LIGHTBOX MODAL */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 text-white text-2xl font-bold cursor-pointer"
            >
              ✕
            </button>
            <img
              src={selectedPhoto.fileUrl}
              alt={selectedPhoto.title}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
            <div className="mt-4 text-white text-center font-semibold text-sm">{selectedPhoto.title}</div>
          </div>
        </div>
      )}
    </main>
  )
}
