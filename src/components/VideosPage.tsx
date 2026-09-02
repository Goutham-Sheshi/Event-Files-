import React, { useMemo, useState } from 'react'
import type { Product, Resource } from '../types'
import { products } from '../data'
import { openViewer } from '../fileViewerBridge'

export type VideoCategory = 'Story' | 'Product' | 'People' | 'Event' | 'Brand' | 'Other'

const SHESHI_ID = 'sheshi'

export function getVideoCategory(resource: Resource): VideoCategory {
  const tags = (resource.tags || []).map(t => t.toLowerCase())
  const text = `${resource.title} ${resource.description || ''} ${tags.join(' ')}`.toLowerCase()

  if (tags.includes('story') || text.includes('story')) return 'Story'
  if (tags.includes('people') || tags.includes('team') || tags.includes('culture') || text.includes('people') || text.includes('interview')) return 'People'
  if (tags.includes('event') || tags.includes('summit') || tags.includes('webinar') || text.includes('event')) return 'Event'
  if (tags.includes('brand') || tags.includes('identity') || tags.includes('logo') || text.includes('brand')) return 'Brand'
  if (tags.includes('product') || tags.includes('demo') || text.includes('product') || text.includes('demo')) return 'Product'

  if (resource.productId && resource.productId !== SHESHI_ID) return 'Product'

  return 'Story'
}

function productOf(id: string) {
  return products.find(p => p.id === id || p.slug === id)
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

export function VideoCard({ resource }: { resource: Resource }) {
  const p = resource.productId === SHESHI_ID
    ? { name: 'Sheshi' }
    : productOf(resource.productId)
  const category = getVideoCategory(resource)
  const subtext = `${category} • ${p?.name || 'Sheshi'}`

  return (
    <div
      className="group bg-white border border-[var(--line-soft)] rounded-xl overflow-hidden flex flex-col cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all"
      onClick={() => {
        if (resource.sourceUrl) {
          openViewer(resource.sourceUrl, resource.title, resource.id, resource.tags || [], resource.type)
        }
      }}
    >
      <div className="h-44 bg-slate-900 relative flex items-center justify-center overflow-hidden">
        {resource.thumbnail ? (
          <img
            src={resource.thumbnail}
            alt={resource.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center text-white/30 font-bold text-xs uppercase tracking-widest">
            {category} Video
          </div>
        )}
        <div className="absolute inset-0 bg-black/25 group-hover:bg-black/15 transition-colors flex items-center justify-center">
          <span className="w-12 h-12 rounded-full bg-white/90 group-hover:bg-white text-[var(--primary)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-all pl-0.5">
            <PlayIcon />
          </span>
        </div>
        {resource.fileFormat && (
          <span className="absolute top-2 right-2 bg-black/60 backdrop-blur text-white px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase">
            {resource.fileFormat}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col justify-between flex-1">
        <div>
          <h3 className="font-semibold text-[15px] text-[var(--ink)] line-clamp-2 leading-snug group-hover:text-[var(--primary)] transition-colors">
            {resource.title}
          </h3>
        </div>
        <div className="text-[12px] text-[var(--ink-45)] font-medium mt-3 flex items-center justify-between">
          <span>{subtext}</span>
          {resource.fileSize && (
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-semibold">
              {resource.fileSize}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

const CATEGORY_FILTERS: { id: 'All' | VideoCategory; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: 'Story', label: 'Story' },
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
    return resources.filter(r => r.type === 'video')
  }, [resources])

  // Filtered by Search Query
  const searchResults = useMemo(() => {
    if (!search.trim()) return allVideos
    const q = search.toLowerCase()
    return allVideos.filter(r => {
      const p = productOf(r.productId)
      const cat = getVideoCategory(r)
      return (
        r.title.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.tags && r.tags.some(t => t.toLowerCase().includes(q))) ||
        cat.toLowerCase().includes(q) ||
        (p && p.name.toLowerCase().includes(q))
      );
    })
  }, [allVideos, search])

  // Categorized Video Groups for "All" View
  const categorizedSections = useMemo(() => {
    const categories: VideoCategory[] = ['Story', 'Product', 'People', 'Event', 'Brand', 'Other']
    return categories.map(cat => ({
      category: cat,
      title: cat === 'People' ? 'People' : `${cat} Videos`,
      videos: searchResults.filter(v => getVideoCategory(v) === cat)
    })).filter(section => section.videos.length > 0)
  }, [searchResults])

  // Active Filter Videos (when a specific filter like 'Story' is active)
  const activeFilterVideos = useMemo(() => {
    if (selectedFilter === 'All') return searchResults
    return searchResults.filter(v => getVideoCategory(v) === selectedFilter)
  }, [searchResults, selectedFilter])

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--canvas)]">
      <div className="px-8 py-6 max-w-[1400px] space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)]">VIDEOS</h1>
            <p className="text-xs text-[var(--ink-45)] mt-1 font-medium">
              Explore Sheshi's product, brand, people and event stories.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search videos by title, category, tags..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--line-soft)] bg-white text-xs outline-none focus:border-[var(--primary)] shadow-sm"
            />
            <span className="absolute left-3 top-3 text-[var(--ink-45)]">
              <SearchIcon />
            </span>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORY_FILTERS.map(filter => {
            const count = filter.id === 'All'
              ? allVideos.length
              : allVideos.filter(v => getVideoCategory(v) === filter.id).length

            return (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  selectedFilter === filter.id
                    ? 'bg-[var(--primary)] text-white shadow-sm'
                    : 'bg-white border border-[var(--line-soft)] text-[var(--ink-70)] hover:border-slate-300'
                }`}
              >
                {filter.label}
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedFilter === filter.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
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
                {searchResults.map(video => (
                  <VideoCard key={video.id} resource={video} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-[var(--ink-45)] bg-white rounded-2xl border border-[var(--line-soft)]">
                No videos matching "{search}" were found.
              </div>
            )}
          </section>
        ) : selectedFilter !== 'All' ? (
          /* Single Category View */
          <section className="space-y-4">
            <h2 className="section-heading">
              {selectedFilter === 'People' ? 'People' : `${selectedFilter} Videos`} ({activeFilterVideos.length})
            </h2>
            {activeFilterVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {activeFilterVideos.map(video => (
                  <VideoCard key={video.id} resource={video} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-[var(--ink-45)] bg-white rounded-2xl border border-[var(--line-soft)]">
                No videos available in the {selectedFilter} category.
              </div>
            )}
          </section>
        ) : (
          /* Default "All" View: Grouped Category Sections */
          <div className="space-y-10">
            {categorizedSections.length > 0 ? (
              categorizedSections.map(section => (
                <section key={section.category} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--line-soft)] pb-2.5">
                    <h2 className="section-heading text-base">{section.title}</h2>
                    <span className="text-xs text-[var(--ink-45)] font-medium">
                      {section.videos.length} {section.videos.length === 1 ? 'video' : 'videos'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {section.videos.map(video => (
                      <VideoCard key={video.id} resource={video} />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="py-16 text-center text-xs text-[var(--ink-45)] bg-white rounded-2xl border border-[var(--line-soft)]">
                No video assets found. Upload videos in Admin or Upload Files to view them here.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
