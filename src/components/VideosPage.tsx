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
   21st.dev Cinema Video Card
   ========================================================================== */
export function VideoCard({ resource }: { resource: Resource }) {
  const p = resource.productId === SHESHI_ID ? { name: 'Sheshi' } : productOf(resource.productId)
  const category = getVideoCategory(resource)
  const subtext = `${category} • ${p?.name || 'Sheshi'}`

  return (
    <div
      className="group bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] border border-[var(--border)] hover:border-[var(--border-2)] rounded-2xl overflow-hidden flex flex-col cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 backdrop-blur-md"
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
      <div className="h-48 bg-[var(--canvas-deep)] relative flex items-center justify-center overflow-hidden border-b border-[var(--border)]">
        {resource.thumbnail ? (
          <img
            src={resource.thumbnail}
            alt={resource.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-[var(--canvas-deep)] via-slate-900 to-[var(--canvas-deep)] flex items-center justify-center text-white/30 font-bold text-xs uppercase tracking-widest font-mono">
            {category} Production
          </div>
        )}

        <div className="absolute inset-0 bg-black/35 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <span className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform pl-0.5">
            <PlayIcon />
          </span>
        </div>

        {resource.fileFormat && (
          <span className="badge-pill absolute top-3 right-3 bg-black/75 backdrop-blur-md text-white/90 border border-white/10 font-mono text-[9px] uppercase px-2 py-0.5 font-bold tracking-wider">
            {resource.fileFormat}
          </span>
        )}

        <span className="badge-pill absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white/90 border border-white/10 text-[9px]">
          {category}
        </span>
      </div>

      <div className="p-4 flex flex-col justify-between flex-1 gap-3">
        <div>
          <h3 className="font-semibold text-[14.5px] text-[var(--ink)] line-clamp-2 leading-snug group-hover:text-[var(--primary)] transition-colors">
            {resource.title}
          </h3>
        </div>
        <div className="text-[11.5px] text-[var(--ink-45)] font-mono flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <span>{subtext}</span>
          {resource.fileSize && (
            <span className="badge-pill text-[9.5px]">
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
    <main className="flex-1 overflow-y-auto bg-[var(--canvas)]">
      <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-8">
        {/* Header Ribbon */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
          <div>
            <div className="badge-pill mb-1">
              <span className="pulse-dot bg-orange-500" />
              MEDIA VAULT & CINEMA
            </div>
            <h1 className="font-display text-[26px] font-extrabold tracking-tight heading-gradient">
              Video Vault
            </h1>
            <p className="text-[13px] text-[var(--ink-45)] mt-0.5">
              Product walkthroughs, customer stories, podcast series, and corporate event films.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search videos by title, category, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] text-xs text-[var(--ink)] placeholder-[var(--ink-45)] outline-none focus:border-[var(--primary)] shadow-xs"
            />
            <span className="absolute left-3 top-3 text-[var(--ink-45)]">
              <SearchIcon />
            </span>
          </div>
        </div>

        {/* 21st.dev Category Pills */}
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  selectedFilter === filter.id
                    ? 'bg-[var(--primary)] text-white shadow-md shadow-orange-500/20'
                    : 'bg-[var(--surface-card)] border border-[var(--border)] text-[var(--ink-70)] hover:border-[var(--border-2)]'
                }`}
              >
                <span>{filter.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    selectedFilter === filter.id
                      ? 'bg-white/20 text-white'
                      : 'bg-[var(--surface-2)] text-[var(--ink-45)]'
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
            <h2 className="section-heading text-sm text-[var(--ink-45)]">
              Search Results ({searchResults.length})
            </h2>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {searchResults.map((video) => (
                  <VideoCard key={video.id} resource={video} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-[var(--ink-45)] bg-[var(--surface-card)] rounded-2xl border border-[var(--border)]">
                No videos matching "{search}" were found.
              </div>
            )}
          </section>
        ) : selectedFilter !== 'All' ? (
          /* Single Category View */
          <section className="space-y-4">
            <h2 className="section-heading">
              {selectedFilter === 'People' ? 'People & Culture' : `${selectedFilter} Videos`} ({activeFilterVideos.length})
            </h2>
            {activeFilterVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {activeFilterVideos.map((video) => (
                  <VideoCard key={video.id} resource={video} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-[var(--ink-45)] bg-[var(--surface-card)] rounded-2xl border border-[var(--border)]">
                No videos available in the {selectedFilter} category.
              </div>
            )}
          </section>
        ) : (
          /* Default "All" View: Grouped Category Sections */
          <div className="space-y-10">
            {categorizedSections.length > 0 ? (
              categorizedSections.map((section) => (
                <section key={section.category} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                    <h2 className="section-heading text-base">{section.title}</h2>
                    <span className="badge-pill text-[10px]">
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
              <div className="py-16 text-center text-xs text-[var(--ink-45)] bg-[var(--surface-card)] rounded-2xl border border-[var(--border)]">
                No video assets found. Upload videos in Admin or Upload Files to view them here.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
