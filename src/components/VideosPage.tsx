import React, { useMemo, useState } from 'react'
import type { Product, Resource, VideoCategory } from '../types'
import { products } from '../data'
import { openViewer } from '../fileViewerBridge'

const SHESHI_ID = 'sheshi'

export function getVideoCategory(resource: Resource): VideoCategory {
  if (resource.videoCategory) return resource.videoCategory

  const tags = (resource.tags || []).map((t) => t.toLowerCase())
  const text = `${resource.title} ${resource.description || ''} ${tags.join(' ')}`.toLowerCase()

  if (tags.includes('podcast') || text.includes('podcast')) return 'Podcast'
  if (tags.includes('story') || text.includes('story')) return 'Story'
  if (tags.includes('brand') || text.includes('brand') || tags.includes('logo') || text.includes('logo'))
    return 'Brand'
  if (tags.includes('event') || text.includes('event') || text.includes('conrad') || text.includes('summit'))
    return 'Event'
  if (
    tags.includes('people') ||
    text.includes('people') ||
    tags.includes('fun friday') ||
    text.includes('fun friday') ||
    text.includes('marathon')
  )
    return 'People'
  if (
    tags.includes('product') ||
    text.includes('product') ||
    tags.includes('demo') ||
    text.includes('flow animation') ||
    text.includes('module')
  )
    return 'Product'

  return 'Other'
}

function productOf(id: string) {
  return products.find((p) => p.id === id || p.slug === id)
}

function SearchIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="m8 5 11 7-11 7z" />
    </svg>
  )
}

/* ==========================================================================
   21st.dev & Preline UI Cinema Video Card
   ========================================================================== */
export function VideoCard({ resource }: { resource: Resource }) {
  const p = resource.productId === SHESHI_ID ? { name: 'Sheshi' } : productOf(resource.productId)
  const category = getVideoCategory(resource)
  const subtext = `${category} • ${p?.name || 'Sheshi'}`

  return (
    <div
      className="preline-card card-highlight group hover:border-orange-500/40 rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-colors duration-200 bg-[#0d121f]"
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
      <div className="h-48 bg-[#070a12] relative flex items-center justify-center overflow-hidden border-b border-white/[0.08]">
        {resource.thumbnail ? (
          <img
            src={resource.thumbnail}
            alt={resource.title}
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-[#070a12] via-purple-950/20 to-[#070a12] flex items-center justify-center text-white/30 font-bold text-xs uppercase tracking-widest font-mono">
            {category} Production
          </div>
        )}

        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/25 transition-colors flex items-center justify-center">
          <span className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)] pl-0.5">
            <PlayIcon />
          </span>
        </div>

        {resource.fileFormat && (
          <span className="badge-pill absolute top-3 right-3 bg-black/75 backdrop-blur-md text-purple-300 border border-purple-500/30 font-mono text-[9px] uppercase px-2 py-0.5 font-bold tracking-wider">
            {resource.fileFormat}
          </span>
        )}

        <span className="badge-pill absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white/90 border border-white/10 text-[9px]">
          {category}
        </span>
      </div>

      <div className="p-4 flex flex-col justify-between flex-1 gap-3 bg-[#0d121f]">
        <div>
          <h3 className="font-bold text-[14.5px] text-white line-clamp-2 leading-snug group-hover:text-orange-300 transition-colors">
            {resource.title}
          </h3>
        </div>
        <div className="text-[11.5px] text-slate-400 font-mono flex items-center justify-between pt-2.5 border-t border-white/[0.08]">
          <span className="text-slate-300">{subtext}</span>
          {resource.fileSize && (
            <span className="font-mono text-[10px] text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
              {resource.fileSize}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

const CATEGORY_FILTERS: { id: 'All' | VideoCategory; label: string }[] = [
  { id: 'All', label: 'All Collections' },
  { id: 'Story', label: 'Story' },
  { id: 'Podcast', label: 'Podcast' },
  { id: 'Product', label: 'Product' },
  { id: 'People', label: 'People' },
  { id: 'Event', label: 'Event' },
  { id: 'Brand', label: 'Brand' },
]

interface VideosPageProps {
  resources: Resource[]
}

export default function VideosPage({ resources }: VideosPageProps) {
  const [search, setSearch] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'All' | VideoCategory>('All')

  // Filter video type resources
  const allVideos = useMemo(() => {
    return resources.filter((r) => r.type === 'video')
  }, [resources])

  // Filtered by Search Query
  const searchResults = useMemo(() => {
    if (!search.trim()) return allVideos
    const q = search.toLowerCase()
    return allVideos.filter((r) => {
      const p = productOf(r.productId)
      const cat = getVideoCategory(r)
      return (
        r.title.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.tags && r.tags.some((t) => t.toLowerCase().includes(q))) ||
        cat.toLowerCase().includes(q) ||
        (p && p.name.toLowerCase().includes(q))
      )
    })
  }, [allVideos, search])

  // Categorized Video Groups for "All" View
  const categorizedSections = useMemo(() => {
    const categories: VideoCategory[] = ['Story', 'Podcast', 'Product', 'People', 'Event', 'Brand', 'Other']
    return categories
      .map((cat) => ({
        category: cat,
        title: cat === 'People' ? 'People & Culture' : `${cat} Videos`,
        videos: searchResults.filter((v) => getVideoCategory(v) === cat),
      }))
      .filter((section) => section.videos.length > 0)
  }, [searchResults])

  // Active Filter Videos
  const activeFilterVideos = useMemo(() => {
    if (selectedFilter === 'All') return searchResults
    return searchResults.filter((v) => getVideoCategory(v) === selectedFilter)
  }, [searchResults, selectedFilter])

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-8">
        {/* Ambient 21st.dev Video Vault Banner */}
        <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-950/30 via-[#0d121f] to-[#070a12] border border-purple-500/20 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 font-mono text-[10.5px] font-bold uppercase tracking-wider mb-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span>MEDIA VAULT & CINEMA</span>
              </div>
              <h1 className="font-display text-[28px] sm:text-[34px] font-extrabold tracking-tight heading-gradient leading-tight">
                Video Vault
              </h1>
              <p className="text-[13.5px] text-slate-400 mt-1 max-w-xl leading-relaxed">
                Official product walkthroughs, customer spotlight films, podcast series, and corporate summit recordings.
              </p>
            </div>

            {/* Preline Search Input */}
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Search videos by title, category, tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500 focus:bg-white/[0.06] transition-all"
              />
              <span className="absolute left-3.5 top-3 text-slate-400">
                <SearchIcon />
              </span>
            </div>
          </div>
        </div>

        {/* Preline Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORY_FILTERS.map((filter) => {
            const count =
              filter.id === 'All'
                ? allVideos.length
                : allVideos.filter((v) => getVideoCategory(v) === filter.id).length

            return (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer border ${
                  selectedFilter === filter.id
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                    : 'bg-[#0c101d] border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                <span>{filter.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    selectedFilter === filter.id
                      ? 'bg-white/25 text-white'
                      : 'bg-white/[0.06] text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Content Area */}
        {search.trim() ? (
          /* Search Results View */
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Search Results</h2>
              <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-400 font-mono text-[10px] font-bold border border-white/10">
                {searchResults.length}
              </span>
            </div>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {searchResults.map((video) => (
                  <VideoCard key={video.id} resource={video} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-slate-400 bg-[#0c101d] rounded-3xl border border-white/[0.08] space-y-2">
                <div className="text-2xl">🎬</div>
                <div className="font-semibold text-white">No videos matching "{search}"</div>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Try searching for keywords like "demo", "keynote", "story", or "podcast".
                </p>
              </div>
            )}
          </section>
        ) : selectedFilter !== 'All' ? (
          /* Single Category View */
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                {selectedFilter === 'People' ? 'People & Culture' : `${selectedFilter} Videos`}
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 font-mono text-[10px] font-bold border border-orange-500/20">
                {activeFilterVideos.length}
              </span>
            </div>
            {activeFilterVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {activeFilterVideos.map((video) => (
                  <VideoCard key={video.id} resource={video} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-slate-400 bg-[#0c101d] rounded-3xl border border-white/[0.08]">
                No videos available in the {selectedFilter} category yet.
              </div>
            )}
          </section>
        ) : (
          /* Default "All" View: Grouped Category Sections */
          <div className="space-y-10">
            {categorizedSections.length > 0 ? (
              categorizedSections.map((section) => (
                <section key={section.category} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-orange-400" />
                      <h2 className="text-base font-bold text-white tracking-tight">{section.title}</h2>
                    </div>
                    <span className="badge-pill text-[10px] font-mono text-slate-400">
                      {section.videos.length} {section.videos.length === 1 ? 'video' : 'videos'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {section.videos.map((video) => (
                      <VideoCard key={video.id} resource={video} />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="py-16 text-center text-xs text-slate-400 bg-[#0c101d] rounded-3xl border border-white/[0.08] space-y-2">
                <div className="text-2xl">🎬</div>
                <div className="font-semibold text-white">No video assets found</div>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Upload MP4 videos in Admin Console or Quick Upload to view them in the cinema gallery.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
