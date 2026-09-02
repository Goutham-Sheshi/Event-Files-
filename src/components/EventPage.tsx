import { useEffect, useState } from 'react'
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
  deleteEventLink
} from '../eventsApi'
import type {
  EventResourceItem,
  EventResourceCategory,
  EventGalleryMediaItem,
  EventLinkItem,
  VaultProfile,
  Product
} from '../types'
import { products } from '../data'
import { triggerDirectDownload } from '../utils'
import { openViewer } from '../fileViewerBridge'

interface EventPageProps {
  event: ManagedEvent
  profile: VaultProfile | null
  isAdmin: boolean
  onBack: () => void
  onEventUpdated: () => void
  onOpenEditModal?: (event: ManagedEvent) => void
}

type TabType = 'overview' | 'resources' | 'gallery' | 'links'

const CATEGORIES: { id: EventResourceCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Files' },
  { id: 'documents', label: 'Documents' },
  { id: 'presentations', label: 'Presentations' },
  { id: 'marketing', label: 'Marketing Assets' },
  { id: 'design', label: 'Design Files' },
  { id: 'other', label: 'Other' },
]

export default function EventPage({
  event,
  profile,
  isAdmin,
  onBack,
  onEventUpdated,
  onOpenEditModal
}: EventPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [resources, setResources] = useState<EventResourceItem[]>([])
  const [gallery, setGallery] = useState<EventGalleryMediaItem[]>([])
  const [links, setLinks] = useState<EventLinkItem[]>([])

  const [loading, setLoading] = useState(true)
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

  const isAdvanced = profile ? (profile.role === 'advanced' || profile.role === 'teammate') && profile.status === 'approved' : false
  const canUpload = isAdmin || isAdvanced

  const product = products.find(p => p.id === event.product_id || p.slug === event.product_id)
  const status = calculateEventStatus(event)
  const userEmail = profile?.email || ''

  const loadData = async () => {
    setLoading(true)
    try {
      const [resData, galData, linkData] = await Promise.all([
        getEventResources(event.id),
        getEventGallery(event.id),
        getEventLinks(event.id)
      ])
      setResources(resData)
      setGallery(galData)
      setLinks(linkData)
    } catch { /* ignore */ }
    finally { setLoading(false) }
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
    } finally { setBusy(false) }
  }

  // Handle Resource Upload
  const handleResourceUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resourceFile) { setError('Please select a file to upload'); return }
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
    } finally { setBusy(false) }
  }

  // Handle Gallery Upload
  const handleMediaUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mediaFile) { setError('Please select an image or video file'); return }
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
    } finally { setBusy(false) }
  }

  // Handle Add Link
  const handleAddLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkTitle.trim() || !linkUrl.trim()) { setError('Title and URL are required'); return }
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
    } finally { setBusy(false) }
  }

  // Deletion checks
  const canDeleteResource = (item: EventResourceItem) => isAdmin || (isAdvanced && item.uploadedBy.toLowerCase() === userEmail.toLowerCase())
  const canDeleteMedia = (item: EventGalleryMediaItem) => isAdmin || (isAdvanced && item.uploadedBy.toLowerCase() === userEmail.toLowerCase())
  const canDeleteLink = (item: EventLinkItem) => isAdmin || (isAdvanced && item.addedBy.toLowerCase() === userEmail.toLowerCase())

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
  const filteredResources = resources.filter(item => {
    const matchesSearch = !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.fileFormat && item.fileFormat.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter
    return matchesSearch && matchesCat
  })

  // Date Formatting
  const startDateText = new Date(event.event_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  const endDateText = event.end_date ? new Date(event.end_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null
  const dateRangeText = endDateText ? `${startDateText} - ${endDateText}` : startDateText

  // Photos vs Videos in Gallery
  const photos = gallery.filter(g => g.mediaType === 'image')
  const videos = gallery.filter(g => g.mediaType === 'video')

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--canvas)]">
      {/* Top Banner & Header */}
      <div className="relative bg-[#0f121a] text-white overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0 opacity-40">
          {event.banner ? (
            <img src={event.banner} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-orange-600 via-indigo-900 to-slate-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f121a] via-[#0f121a]/60 to-transparent" />
        </div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-8 py-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white mb-6 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full border border-white/15 transition-all"
          >
            ← Back to Events
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2 flex-wrap">
                {product && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: product.light, color: product.color }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: product.color }} />
                    {product.name}
                  </span>
                )}
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    status === 'ongoing'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : status === 'upcoming'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                  }`}
                >
                  {status}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/90 border border-white/15">
                  {event.event_type}
                </span>
              </div>

              <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white">
                {event.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-white/80">
                <div className="flex items-center gap-1.5">
                  <span>📅</span>
                  <span>{dateRangeText}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-1.5">
                    <span>📍</span>
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2">
                {onOpenEditModal && (
                  <button
                    onClick={() => onOpenEditModal(event)}
                    className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold border border-white/20 transition-all"
                  >
                    Edit Event
                  </button>
                )}
                <button
                  onClick={handleDeleteEvent}
                  disabled={busy}
                  className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-semibold border border-red-500/30 transition-all"
                >
                  Delete Event
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-0 z-30 bg-white border-b border-[var(--line-soft)] shadow-sm">
        <div className="max-w-[1400px] mx-auto px-8 flex gap-8">
          {(['overview', 'resources', 'gallery', 'links'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 text-sm font-semibold border-b-2 capitalize transition-all ${
                activeTab === tab
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--ink-45)] hover:text-[var(--ink)]'
              }`}
            >
              {tab === 'resources' ? `Resources (${resources.length})` :
               tab === 'gallery' ? `Gallery (${gallery.length})` :
               tab === 'links' ? `Links (${links.length})` : 'Overview'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[1400px] mx-auto px-8 py-8">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Description Card */}
            <div className="bg-white border border-[var(--line-soft)] rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-[var(--ink)] mb-3">About this Event</h2>
              <p className="text-sm text-[var(--ink-70)] leading-relaxed whitespace-pre-line">
                {event.description || 'No detailed description provided for this event.'}
              </p>
            </div>

            {/* Quick Stats & Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-[var(--line-soft)] rounded-2xl p-6 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xl">
                  📁
                </div>
                <div>
                  <div className="text-2xl font-bold text-[var(--ink)]">{resources.length}</div>
                  <div className="text-xs text-[var(--ink-45)] font-medium">Event Resources & Files</div>
                </div>
              </div>

              <div className="bg-white border border-[var(--line-soft)] rounded-2xl p-6 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl">
                  🖼️
                </div>
                <div>
                  <div className="text-2xl font-bold text-[var(--ink)]">{gallery.length}</div>
                  <div className="text-xs text-[var(--ink-45)] font-medium">Photos & Videos</div>
                </div>
              </div>

              <div className="bg-white border border-[var(--line-soft)] rounded-2xl p-6 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">
                  🔗
                </div>
                <div>
                  <div className="text-2xl font-bold text-[var(--ink)]">{links.length}</div>
                  <div className="text-xs text-[var(--ink-45)] font-medium">External References</div>
                </div>
              </div>
            </div>

            {/* Event Summary Details Card */}
            <div className="bg-white border border-[var(--line-soft)] rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink-45)]">Event Details</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[var(--ink-45)] block mb-1">Associated Suite</span>
                  <span className="font-semibold text-[var(--ink)]">{product?.name || 'Sheshi'}</span>
                </div>
                <div>
                  <span className="text-[var(--ink-45)] block mb-1">Format</span>
                  <span className="font-semibold text-[var(--ink)]">{event.event_type}</span>
                </div>
                <div>
                  <span className="text-[var(--ink-45)] block mb-1">Start Date</span>
                  <span className="font-semibold text-[var(--ink)]">{startDateText}</span>
                </div>
                <div>
                  <span className="text-[var(--ink-45)] block mb-1">End Date</span>
                  <span className="font-semibold text-[var(--ink)]">{endDateText || 'Same day'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RESOURCES TAB */}
        {activeTab === 'resources' && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 max-w-lg">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search event resources..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--line-soft)] bg-white text-xs outline-none focus:border-[var(--primary)]"
                  />
                  <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
                </div>
              </div>

              {canUpload && (
                <button
                  onClick={() => setShowUploadResourceModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-all flex items-center justify-center gap-1.5"
                >
                  <span>+</span> Upload Resource
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {CATEGORIES.map(cat => {
                const count = cat.id === 'all' ? resources.length : resources.filter(r => r.category === cat.id).length
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      categoryFilter === cat.id
                        ? 'bg-[var(--ink)] text-white'
                        : 'bg-white border border-[var(--line-soft)] text-[var(--ink-70)] hover:border-slate-300'
                    }`}
                  >
                    {cat.label}
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      categoryFilter === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Resources List */}
            {filteredResources.length > 0 ? (
              <div className="bg-white border border-[var(--line-soft)] rounded-2xl overflow-hidden shadow-sm">
                <div className="divide-y divide-[var(--line-soft)]">
                  {filteredResources.map(item => (
                    <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs uppercase text-slate-600 border border-slate-200">
                        {item.fileFormat || 'FILE'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-[var(--ink)] truncate">{item.title}</div>
                        <div className="flex items-center gap-3 text-xs text-[var(--ink-45)] mt-0.5">
                          <span className="capitalize">{item.category}</span>
                          {item.fileSize && <span>• {item.fileSize}</span>}
                          <span>• Uploaded by {item.uploadedBy}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openViewer(item.fileUrl, item.title, item.id, [], 'document')}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                        >
                          View
                        </button>
                        <button
                          onClick={() => triggerDirectDownload(item.fileUrl, item.title)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)]"
                        >
                          Download
                        </button>
                        {canDeleteResource(item) && (
                          <button
                            onClick={() => handleDeleteResource(item)}
                            className="px-2 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold"
                            title="Delete resource"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-[var(--ink-45)] bg-white border border-[var(--line-soft)] rounded-2xl">
                No event resources uploaded yet in this category.
              </div>
            )}
          </div>
        )}

        {/* GALLERY TAB */}
        {activeTab === 'gallery' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[var(--ink)]">Event Media Gallery</h2>
                <p className="text-xs text-[var(--ink-45)] mt-0.5">Photos and videos captured during the event.</p>
              </div>

              {canUpload && (
                <button
                  onClick={() => setShowUploadMediaModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-all flex items-center gap-1.5"
                >
                  <span>+</span> Upload Media
                </button>
              )}
            </div>

            {/* Photos Section */}
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink-45)] mb-4">
                Photos ({photos.length})
              </h3>
              {photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {photos.map(photo => (
                    <div
                      key={photo.id}
                      className="group relative bg-slate-900 rounded-xl overflow-hidden aspect-square cursor-pointer border border-black/10 shadow-sm"
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      <img src={photo.fileUrl} alt={photo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                        <div className="text-white text-xs font-semibold truncate">{photo.title}</div>
                        {canDeleteMedia(photo) && (
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteMedia(photo) }}
                            className="mt-2 text-xs text-red-300 hover:text-red-100 bg-red-900/60 px-2 py-1 rounded w-fit"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-[var(--ink-45)] bg-white border border-[var(--line-soft)] rounded-2xl">
                  No photos uploaded for this event.
                </div>
              )}
            </div>

            {/* Videos Section */}
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink-45)] mb-4">
                Videos ({videos.length})
              </h3>
              {videos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {videos.map(video => (
                    <div key={video.id} className="bg-white border border-[var(--line-soft)] rounded-2xl overflow-hidden shadow-sm flex flex-col">
                      <div className="h-44 bg-slate-900 relative flex items-center justify-center">
                        <video src={video.fileUrl} controls className="w-full h-full object-cover" />
                      </div>
                      <div className="p-3.5 flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-[var(--ink)] truncate">{video.title}</span>
                        {canDeleteMedia(video) && (
                          <button
                            onClick={() => handleDeleteMedia(video)}
                            className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded font-semibold"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-[var(--ink-45)] bg-white border border-[var(--line-soft)] rounded-2xl">
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
                <h2 className="text-base font-bold text-[var(--ink)]">External References & Links</h2>
                <p className="text-xs text-[var(--ink-45)] mt-0.5">Website links, registration portals, drive folders, and social media coverage.</p>
              </div>

              {canUpload && (
                <button
                  onClick={() => setShowAddLinkModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-all flex items-center gap-1.5"
                >
                  <span>+</span> Add Link
                </button>
              )}
            </div>

            {links.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {links.map(item => (
                  <div key={item.id} className="bg-white border border-[var(--line-soft)] rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-sm text-[var(--ink)] leading-snug">{item.title}</h3>
                        <span className="text-base">🔗</span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-[var(--ink-70)] line-clamp-3 mb-4">{item.description}</p>
                      )}
                      <div className="text-[11px] font-mono text-[var(--ink-45)] truncate mb-4">{item.url}</div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[var(--line-soft)]">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
                      >
                        Open Link ↗
                      </a>
                      {canDeleteLink(item) && (
                        <button
                          onClick={() => handleDeleteLink(item)}
                          className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded font-semibold"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-[var(--ink-45)] bg-white border border-[var(--line-soft)] rounded-2xl">
                No external links added for this event.
              </div>
            )}
          </div>
        )}
      </div>

      {/* UPLOAD RESOURCE MODAL */}
      {showUploadResourceModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={handleResourceUploadSubmit} className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-[var(--ink)]">Upload Event Resource</h3>
              <button type="button" onClick={() => setShowUploadResourceModal(false)} className="text-slate-400 text-lg">×</button>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl">⚠️ {error}</div>}

            <label className="block text-xs font-medium">
              File *
              <input type="file" onChange={e => setResourceFile(e.target.files?.[0] || null)} className="mt-1.5 w-full p-2 border border-[var(--line-soft)] rounded-xl text-xs" required />
            </label>

            <label className="block text-xs font-medium">
              File Name / Title
              <input type="text" placeholder="e.g. India FinTech Briefing.pdf" value={resourceTitle} onChange={e => setResourceTitle(e.target.value)} className="mt-1.5 w-full p-2.5 border border-[var(--line-soft)] rounded-xl text-xs" />
            </label>

            <label className="block text-xs font-medium">
              Category *
              <select value={resourceCategory} onChange={e => setResourceCategory(e.target.value as EventResourceCategory)} className="mt-1.5 w-full p-2.5 border border-[var(--line-soft)] rounded-xl text-xs bg-white">
                <option value="documents">Documents</option>
                <option value="presentations">Presentations</option>
                <option value="marketing">Marketing Assets</option>
                <option value="design">Design Files</option>
                <option value="other">Other</option>
              </select>
            </label>

            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setShowUploadResourceModal(false)} className="px-4 py-2 text-xs font-semibold border rounded-xl">Cancel</button>
              <button disabled={busy} className="px-4 py-2 text-xs font-semibold bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-hover)]">{busy ? 'Uploading...' : 'Upload Resource'}</button>
            </div>
          </form>
        </div>
      )}

      {/* UPLOAD MEDIA MODAL */}
      {showUploadMediaModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={handleMediaUploadSubmit} className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-[var(--ink)]">Upload Gallery Photo / Video</h3>
              <button type="button" onClick={() => setShowUploadMediaModal(false)} className="text-slate-400 text-lg">×</button>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl">⚠️ {error}</div>}

            <label className="block text-xs font-medium">
              Select Image or Video *
              <input type="file" accept="image/*,video/*" onChange={e => setMediaFile(e.target.files?.[0] || null)} className="mt-1.5 w-full p-2 border border-[var(--line-soft)] rounded-xl text-xs" required />
            </label>

            <label className="block text-xs font-medium">
              Title / Caption
              <input type="text" placeholder="e.g. Keynote Speech Photo" value={mediaTitle} onChange={e => setMediaTitle(e.target.value)} className="mt-1.5 w-full p-2.5 border border-[var(--line-soft)] rounded-xl text-xs" />
            </label>

            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setShowUploadMediaModal(false)} className="px-4 py-2 text-xs font-semibold border rounded-xl">Cancel</button>
              <button disabled={busy} className="px-4 py-2 text-xs font-semibold bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-hover)]">{busy ? 'Uploading...' : 'Upload Media'}</button>
            </div>
          </form>
        </div>
      )}

      {/* ADD LINK MODAL */}
      {showAddLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={handleAddLinkSubmit} className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-[var(--ink)]">Add External Reference Link</h3>
              <button type="button" onClick={() => setShowAddLinkModal(false)} className="text-slate-400 text-lg">×</button>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl">⚠️ {error}</div>}

            <label className="block text-xs font-medium">
              Link Title *
              <input type="text" placeholder="e.g. Official Summit Registration Portal" value={linkTitle} onChange={e => setLinkTitle(e.target.value)} className="mt-1.5 w-full p-2.5 border border-[var(--line-soft)] rounded-xl text-xs" required />
            </label>

            <label className="block text-xs font-medium">
              URL *
              <input type="url" placeholder="https://..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="mt-1.5 w-full p-2.5 border border-[var(--line-soft)] rounded-xl text-xs" required />
            </label>

            <label className="block text-xs font-medium">
              Description (Optional)
              <textarea placeholder="Brief notes about this link..." value={linkDesc} onChange={e => setLinkDesc(e.target.value)} rows={3} className="mt-1.5 w-full p-2.5 border border-[var(--line-soft)] rounded-xl text-xs" />
            </label>

            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setShowAddLinkModal(false)} className="px-4 py-2 text-xs font-semibold border rounded-xl">Cancel</button>
              <button disabled={busy} className="px-4 py-2 text-xs font-semibold bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-hover)]">{busy ? 'Saving...' : 'Add Link'}</button>
            </div>
          </form>
        </div>
      )}

      {/* PHOTO LIGHTBOX MODAL */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedPhoto(null)} className="absolute -top-10 right-0 text-white text-2xl font-bold">✕</button>
            <img src={selectedPhoto.fileUrl} alt={selectedPhoto.title} className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" />
            <div className="mt-4 text-white text-center font-semibold text-sm">{selectedPhoto.title}</div>
          </div>
        </div>
      )}
    </main>
  )
}
