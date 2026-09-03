import React, { useEffect, useMemo, useState } from 'react'
import type { ManagedEvent } from '../eventsApi'
import type { Product, Resource } from '../types'
import { products } from '../data'
import { openViewer } from '../fileViewerBridge'

interface CommandPaletteProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly resources: Resource[]
  readonly events: ManagedEvent[]
  readonly onSelectProduct: (slug: string) => void
  readonly onSelectEvent: (id: string) => void
}

type CommandCategory = 'all' | 'resources' | 'products' | 'videos' | 'events'

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

function CalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function ProductIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

export default function CommandPalette({
  isOpen,
  onClose,
  resources,
  events,
  onSelectProduct,
  onSelectEvent,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CommandCategory>('all')
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
        else setQuery('')
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const results = useMemo(() => {
    if (!isOpen) return []
    const q = query.trim().toLowerCase()

    const resourceMatches = (category === 'all' || category === 'resources') ? resources.filter(r => r.type !== 'video' && (!q || r.title.toLowerCase().includes(q) || (r.tags || []).some(t => t.toLowerCase().includes(q)) || (r.description || '').toLowerCase().includes(q))).map(r => ({
      id: r.id,
      title: r.title,
      type: 'resource' as const,
      subtext: `${r.fileFormat || r.type} · ${r.fileSize || 'Library'}`,
      item: r,
    })) : []

    const videoMatches = (category === 'all' || category === 'videos') ? resources.filter(r => r.type === 'video' && (!q || r.title.toLowerCase().includes(q) || (r.tags || []).some(t => t.toLowerCase().includes(q)))).map(r => ({
      id: r.id,
      title: r.title,
      type: 'video' as const,
      subtext: `Video · ${r.videoCategory || 'Story'}`,
      item: r,
    })) : []

    const productMatches = (category === 'all' || category === 'products') ? products.filter(p => !q || p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)).map(p => ({
      id: p.id,
      title: p.name,
      type: 'product' as const,
      subtext: p.description,
      item: p,
    })) : []

    const eventMatches = (category === 'all' || category === 'events') ? events.filter(e => !q || e.title.toLowerCase().includes(q) || (e.location || '').toLowerCase().includes(q)).map(e => ({
      id: e.id,
      title: e.title,
      type: 'event' as const,
      subtext: `${e.event_date} ${e.location ? `· ${e.location}` : ''}`,
      item: e,
    })) : []

    return [...resourceMatches.slice(0, 5), ...videoMatches.slice(0, 5), ...productMatches.slice(0, 5), ...eventMatches.slice(0, 5)]
  }, [isOpen, query, category, resources, events])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, category])

  if (!isOpen) return null

  const handleSelect = (idx: number) => {
    const match = results[idx]
    if (!match) return
    onClose()
    if (match.type === 'resource' || match.type === 'video') {
      const r = match.item as Resource
      if (r.sourceUrl) {
        openViewer(r.sourceUrl, r.title, r.id, r.tags || [], r.type, r.description || '', r.contentStatus || 'Active', r.version || 'v1.0')
      }
    } else if (match.type === 'product') {
      const p = match.item as Product
      onSelectProduct(p.slug)
    } else if (match.type === 'event') {
      const e = match.item as ManagedEvent
      onSelectEvent(e.id)
    }
  }

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % Math.max(1, results.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(1, results.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSelect(selectedIndex)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#12151e] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <span className="text-slate-400"><SearchIcon /></span>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleListKeyDown}
            placeholder="Type a command or search assets, products, videos, events..."
            className="w-full bg-transparent text-[14px] text-white placeholder-slate-500 outline-none font-medium"
          />
          <kbd className="px-2 py-0.5 rounded bg-white/10 text-slate-400 font-mono text-[10px] uppercase border border-white/10">ESC</kbd>
        </div>

        <div className="flex items-center gap-1.5 px-4 py-2 bg-[#1a1d26] border-b border-white/5 text-[11px] font-semibold text-slate-400 overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'resources', label: 'Resources' },
            { id: 'videos', label: 'Videos' },
            { id: 'products', label: 'Products' },
            { id: 'events', label: 'Events' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id as CommandCategory)}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${category === tab.id ? 'bg-[#E05A1C] text-white' : 'hover:bg-white/5'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-2 max-h-[380px] overflow-y-auto space-y-1">
          {results.length === 0 ? (
            <div className="py-12 text-center text-[12px] text-slate-500 font-medium">
              No matching assets or commands found.
            </div>
          ) : (
            results.map((res, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={`${res.type}-${res.id}`}
                  onClick={() => handleSelect(idx)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all ${isSelected ? 'bg-orange-500/15 border border-orange-500/30 text-white' : 'hover:bg-white/5 text-slate-300'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-orange-500 text-white' : 'bg-white/10 text-slate-400'}`}>
                      {res.type === 'resource' && <FileIcon />}
                      {res.type === 'video' && <PlayIcon />}
                      {res.type === 'product' && <ProductIcon />}
                      {res.type === 'event' && <CalIcon />}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold truncate">{res.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">{res.subtext}</div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">Jump →</span>
                </div>
              )
            })
          )}
        </div>

        <div className="px-4 py-2.5 bg-[#0e1017] border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between font-mono">
          <span>Navigation: <kbd className="text-white">↑</kbd> <kbd className="text-white">↓</kbd> to move</span>
          <span>Select: <kbd className="text-white">↵</kbd></span>
        </div>
      </div>
    </div>
  )
}
