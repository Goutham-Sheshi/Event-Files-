import { ChangeEvent, useEffect, useState } from 'react'
import { openViewer } from './fileViewerBridge'
import { products } from './data'
import type { ResourceType, VideoCategory } from './types'
import { getMyProfile } from './authApi'
import { supabase } from './lib/supabase'
import { createLinkedVideo, deleteManagedResource, restoreManagedResource, getErrorMessage, getManagedResources, uploadResource, type ManagedResource } from './resourcesApi'

const TYPES: ResourceType[] = ['logo', 'brochure', 'video', 'document', 'other']
const VIDEO_CATEGORIES: VideoCategory[] = ['Story', 'Podcast', 'Product', 'People', 'Event', 'Brand', 'Other']
const PPT_VALUE = '__powerpoint_link__'
const VIDEO_LINK_VALUE = '__video_link__'

type LinkMode = 'upload' | 'link'

// Default storage quota (10 GB default, user-configurable via Admin UI)
const DEFAULT_STORAGE_LIMIT_GB = 10

function parseFileSizeToBytes(sizeStr?: string | null): number {
  if (!sizeStr) return 0
  const match = sizeStr.trim().match(/^([\d.]+)\s*([A-Za-z]+)?$/)
  if (!match) return 0
  const val = parseFloat(match[1])
  if (isNaN(val)) return 0
  const unit = (match[2] || 'B').toUpperCase()
  if (unit === 'KB') return val * 1024
  if (unit === 'MB') return val * 1024 * 1024
  if (unit === 'GB') return val * 1024 * 1024 * 1024
  if (unit === 'TB') return val * 1024 * 1024 * 1024 * 1024
  return val
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let val = bytes / 1024
  let idx = 0
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024
    idx++
  }
  return `${val.toFixed(val >= 10 || idx === 0 ? 1 : 2)} ${units[idx]}`
}

export default function AdminResources({ canDelete = true }: { canDelete?: boolean }) {
  const [items, setItems] = useState<ManagedResource[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [productId, setProductId] = useState('sheshi')
  const [type, setType] = useState<ResourceType>('document')
  const [videoCategory, setVideoCategory] = useState<VideoCategory>('Story')
  const [categoryAutoDetected, setCategoryAutoDetected] = useState(false)
  const [linkMode, setLinkMode] = useState<LinkMode>('upload')
  const [pptMode, setPptMode] = useState(false)
  const [pptUrl, setPptUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)

  // Storage Modal state
  const [showStorageModal, setShowStorageModal] = useState(false)
  const [storageSearch, setStorageSearch] = useState('')
  const [selectedUploaderFilter, setSelectedUploaderFilter] = useState('ALL')
  const [selectedFormatFilter, setSelectedFormatFilter] = useState('ALL')
  const [storageSortBy, setStorageSortBy] = useState<'size_desc' | 'size_asc' | 'newest' | 'oldest'>('size_desc')
  const [activeTab, setActiveTab] = useState<'uploaders' | 'formats' | 'files'>('uploaders')
  const [storageLimitGb, setStorageLimitGb] = useState<number>(() => {
    const saved = localStorage.getItem('vault_storage_limit_gb')
    return saved ? parseFloat(saved) || 10 : 10
  })

  const updateStorageLimit = (val: number) => {
    setStorageLimitGb(val)
    localStorage.setItem('vault_storage_limit_gb', val.toString())
  }

  function detectCategoryFromTags(tags: string): VideoCategory | null {
    const t = tags.toLowerCase()
    if (t.includes('podcast')) return 'Podcast'
    if (t.includes('story')) return 'Story'
    if (t.includes('brand') || t.includes('logo')) return 'Brand'
    if (t.includes('event') || t.includes('summit') || t.includes('conrad')) return 'Event'
    if (t.includes('people') || t.includes('fun friday') || t.includes('marathon')) return 'People'
    if (t.includes('product') || t.includes('demo') || t.includes('module')) return 'Product'
    return null
  }

  function handleTagsChange(value: string) {
    setTagsInput(value)
    if (type === 'video') {
      const detected = detectCategoryFromTags(value)
      if (detected) {
        setVideoCategory(detected)
        setCategoryAutoDetected(true)
      } else {
        setCategoryAutoDetected(false)
      }
    }
  }

  const load = async () => {
    try { setItems(await getManagedResources()) }
    catch (e) { setError(getErrorMessage(e, 'Failed to load files')) }
  }

  useEffect(() => {
    getMyProfile().then(p => {
      setIsAdmin(p?.role === 'admin' && p?.status === 'approved')
    })
    load()
    const handleChanged = () => { load() }
    window.addEventListener('vault-resources-changed', handleChanged)
    return () => window.removeEventListener('vault-resources-changed', handleChanged)
  }, [])

  const pick = (e: ChangeEvent<HTMLInputElement>) => setFiles(Array.from(e.target.files || []))

  const resetForm = () => {
    setFiles([])
    setDescription('')
    setTagsInput('')
    setPptUrl('')
    setVideoUrl('')
    setVideoTitle('')
    setPptMode(false)
    setLinkMode('upload')
    setType('document')
    setVideoCategory('Story')
    setCategoryAutoDetected(false)
  }

  const addPowerPoint = async () => {
    if (!pptUrl.trim()) return
    setBusy(true)
    setError('')
    setNotice('')
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    if (!tags.includes('PPT')) tags.push('PPT')
    try {
      await uploadResource({
        title: 'PowerPoint Presentation',
        description: description.trim() || null,
        type: 'document',
        productId,
        tags,
      }, new File([], 'presentation.ppt', { type: 'application/vnd.ms-powerpoint' }))
      resetForm()
      setNotice('PowerPoint link registered.')
      await load()
      window.dispatchEvent(new Event('vault-resources-changed'))
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to add PowerPoint'))
    } finally {
      setBusy(false)
    }
  }

  const addVideoLink = async () => {
    if (!videoUrl.trim()) return
    setBusy(true)
    setError('')
    setNotice('')
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    try {
      await createLinkedVideo({
        title: videoTitle.trim() || 'Video Link',
        description: description.trim() || null,
        type: 'video',
        productId,
        tags,
        videoCategory,
      }, videoUrl)
      resetForm()
      setNotice('Video link added successfully.')
      await load()
      window.dispatchEvent(new Event('vault-resources-changed'))
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to add video link'))
    } finally {
      setBusy(false)
    }
  }

  const upload = async () => {
    if (!files.length) return
    setBusy(true)
    setError('')
    setNotice('')
    const count = files.length
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    try {
      for (const file of files) {
        await uploadResource({
          title: file.name.replace(/\.[^.]+$/, ''),
          description: description.trim() || null,
          type,
          productId,
          tags,
          videoCategory: type === 'video' ? videoCategory : undefined,
        }, file)
      }
      resetForm()
      setNotice(`${count} file${count === 1 ? '' : 's'} uploaded successfully.`)
      await load()
      window.dispatchEvent(new Event('vault-resources-changed'))
    } catch (e) {
      setError(getErrorMessage(e, 'Upload failed'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (item: ManagedResource) => {
    if (!canDelete || busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await deleteManagedResource(item)
      await load()
      setNotice(`"${item.title}" was deleted.`)
      window.dispatchEvent(new Event('vault-resources-changed'))
    } catch (e) {
      setError(getErrorMessage(e, 'Delete failed'))
    } finally {
      setBusy(false)
    }
  }

  const restore = async (item: ManagedResource) => {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await restoreManagedResource(item)
      await load()
      setNotice(`"${item.title}" was restored.`)
      window.dispatchEvent(new Event('vault-resources-changed'))
    } catch (e) {
      setError(getErrorMessage(e, 'Restore failed'))
    } finally {
      setBusy(false)
    }
  }

  const isVideoLink = type === 'video' && linkMode === 'link'

  // ─── Calculate Storage Statistics ──────────────────────────────────────────
  const totalStorageLimitBytes = storageLimitGb * 1024 * 1024 * 1024
  const activeItems = items.filter(r => r.deletedAt === undefined)
  const totalUsedBytes = activeItems.reduce((acc, item) => acc + parseFileSizeToBytes(item.fileSize), 0)
  const freeSpaceBytes = Math.max(0, totalStorageLimitBytes - totalUsedBytes)
  const usedPercentage = Math.min(100, (totalUsedBytes / totalStorageLimitBytes) * 100)

  // Uploaders aggregation
  const uploaderStatsMap = new Map<string, { name: string; count: number; bytes: number }>()
  activeItems.forEach(item => {
    const uploaderName = item.uploadedByName || 'Existing library'
    const bytes = parseFileSizeToBytes(item.fileSize)
    const existing = uploaderStatsMap.get(uploaderName) || { name: uploaderName, count: 0, bytes: 0 }
    uploaderStatsMap.set(uploaderName, {
      name: uploaderName,
      count: existing.count + 1,
      bytes: existing.bytes + bytes,
    })
  })
  const uploaderList = Array.from(uploaderStatsMap.values()).sort((a, b) => b.bytes - a.bytes)

  // File Formats aggregation
  const formatStatsMap = new Map<string, { format: string; count: number; bytes: number }>()
  activeItems.forEach(item => {
    const formatKey = (item.fileFormat || item.type || 'OTHER').toUpperCase()
    const bytes = parseFileSizeToBytes(item.fileSize)
    const existing = formatStatsMap.get(formatKey) || { format: formatKey, count: 0, bytes: 0 }
    formatStatsMap.set(formatKey, {
      format: formatKey,
      count: existing.count + 1,
      bytes: existing.bytes + bytes,
    })
  })
  const formatList = Array.from(formatStatsMap.values()).sort((a, b) => b.bytes - a.bytes)

  // Filtered files for storage breakdown table
  const filteredStorageFiles = activeItems.filter(item => {
    const uploaderName = item.uploadedByName || 'Existing library'
    const fmt = (item.fileFormat || item.type || 'OTHER').toUpperCase()
    const matchesSearch = !storageSearch || item.title.toLowerCase().includes(storageSearch.toLowerCase()) || (item.tags || []).some(t => t.toLowerCase().includes(storageSearch.toLowerCase()))
    const matchesUploader = selectedUploaderFilter === 'ALL' || uploaderName === selectedUploaderFilter
    const matchesFormat = selectedFormatFilter === 'ALL' || fmt === selectedFormatFilter
    return matchesSearch && matchesUploader && matchesFormat
  }).sort((a, b) => {
    const bytesA = parseFileSizeToBytes(a.fileSize)
    const bytesB = parseFileSizeToBytes(b.fileSize)
    if (storageSortBy === 'size_desc') return bytesB - bytesA
    if (storageSortBy === 'size_asc') return bytesA - bytesB
    if (storageSortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  })

  return (
    <div className="px-8 py-6 max-w-[1400px] min-h-full">
      {/* ── Header Area ──────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[22px] font-bold text-[var(--ink)]">
            {canDelete ? 'Related Products & Files' : 'Upload Files'}
          </h1>
          <p className="text-[13px] text-[var(--ink-45)] mt-1">
            {canDelete ? 'Manage the shared library and see who uploaded each file.' : 'Upload files to the shared library.'}
          </p>
        </div>

        {/* Admin Storage Usage Widget */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowStorageModal(true)}
            className="group text-left bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 hover:border-[var(--primary)]/60 rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer min-w-[320px]"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center text-[12px] font-bold">⚡</span>
                <span className="text-[12px] font-bold tracking-wide text-white">Supabase Storage</span>
              </div>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Admin Only
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <span className="text-[16px] font-black text-white">
                {formatBytes(totalUsedBytes)} <span className="text-[12px] font-normal text-slate-400">of {storageLimitGb} GB used</span>
              </span>
              <span className="text-[12px] font-bold text-amber-400">
                {usedPercentage.toFixed(1)}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-700/70 overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usedPercentage > 90 ? 'bg-red-500' : usedPercentage > 75 ? 'bg-amber-500' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.max(2, usedPercentage)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium group-hover:text-white transition-colors">
              <span>{formatBytes(freeSpaceBytes)} remaining</span>
              <span className="text-[var(--primary)] font-semibold flex items-center gap-1">
                View Details <span>→</span>
              </span>
            </div>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[390px_minmax(0,1fr)] gap-6">
        <div className="bg-white border border-[var(--line-soft)] rounded-2xl p-5 h-fit">
          <h2 className="font-semibold text-[14px] mb-4">Add files</h2>
          <div className="space-y-3">
            <label className="block text-[12px] font-medium">Related Product
              <select value={productId} onChange={e => setProductId(e.target.value)} className="mt-1.5 w-full px-3 py-2.5 rounded-lg border">
                <option value="sheshi">Sheshi</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>

            <label className="block text-[12px] font-medium">File Type
              <select
                value={pptMode ? PPT_VALUE : isVideoLink ? VIDEO_LINK_VALUE : type}
                onChange={e => {
                  const value = e.target.value
                  if (value === PPT_VALUE) {
                    setPptMode(true)
                    setLinkMode('upload')
                    setFiles([])
                  } else if (value === VIDEO_LINK_VALUE) {
                    setPptMode(false)
                    setType('video')
                    setLinkMode('link')
                    setFiles([])
                  } else {
                    setPptMode(false)
                    setPptUrl('')
                    setVideoUrl('')
                    setVideoTitle('')
                    setLinkMode('upload')
                    setType(value as ResourceType)
                  }
                }}
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border"
              >
                {TYPES.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
                <option value={VIDEO_LINK_VALUE}>Video Link</option>
                <option value={PPT_VALUE}>PowerPoint (PPT)</option>
              </select>
            </label>

            {type === 'video' && !pptMode && (
              <>
                <div className="flex rounded-lg border border-[var(--line-soft)] p-1 bg-[var(--canvas)]">
                  <button type="button" onClick={() => { setLinkMode('upload'); setVideoUrl('') }} className={`flex-1 rounded-md px-3 py-2 text-[11px] font-semibold ${linkMode === 'upload' ? 'bg-[var(--primary)] text-white' : 'text-[var(--ink-45)]'}`}>Upload Video</button>
                  <button type="button" onClick={() => { setLinkMode('link'); setFiles([]) }} className={`flex-1 rounded-md px-3 py-2 text-[11px] font-semibold ${linkMode === 'link' ? 'bg-[var(--primary)] text-white' : 'text-[var(--ink-45)]'}`}>Paste Video Link</button>
                </div>
                <label className="block text-[12px] font-medium">Video Category
                  <select value={videoCategory} onChange={e => setVideoCategory(e.target.value as VideoCategory)} className="mt-1.5 w-full px-3 py-2.5 rounded-lg border">
                    {VIDEO_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              </>
            )}

            {pptMode && (
              <label className="block text-[12px] font-medium">PowerPoint Link
                <input value={pptUrl} onChange={e => setPptUrl(e.target.value)} type="url" placeholder="Paste the PowerPoint / OneDrive / SharePoint link" className="mt-1.5 w-full px-3 py-2.5 rounded-lg border" />
              </label>
            )}

            {isVideoLink && (
              <>
                <label className="block text-[12px] font-medium">Video Title
                  <input value={videoTitle} onChange={e => setVideoTitle(e.target.value)} placeholder="e.g. Quanta Product Walkthrough" className="mt-1.5 w-full px-3 py-2.5 rounded-lg border" />
                </label>
                <label className="block text-[12px] font-medium">Video Link
                  <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} type="url" placeholder="Paste YouTube, Vimeo, Drive or video URL" className="mt-1.5 w-full px-3 py-2.5 rounded-lg border" />
                </label>
              </>
            )}

            <label className="block text-[12px] font-medium">Tags
              <input value={tagsInput} onChange={e => handleTagsChange(e.target.value)} placeholder="e.g. Story, Event, Brand, 2026" className="mt-1.5 w-full px-3 py-2.5 rounded-lg border" />
              <span className="block mt-1 text-[10px] text-[var(--ink-45)]">
                Separate multiple tags with commas
                {type === 'video' && categoryAutoDetected && (
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">⚡ Auto-detected category</span>
                )}
              </span>
            </label>

            <label className="block text-[12px] font-medium">Description
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add a short description for these files" rows={3} className="mt-1.5 w-full px-3 py-2.5 rounded-lg border resize-y" />
            </label>

            {!pptMode && !isVideoLink && (
              <>
                <label className="block rounded-xl border-2 border-dashed p-5 text-center cursor-pointer">
                  <input type="file" multiple onChange={pick} className="hidden" />
                  <div className="text-[13px] font-semibold">Choose files</div>
                  <div className="text-[11px] text-[var(--ink-45)] mt-1">Multiple files supported</div>
                </label>
                {files.length > 0 && <div className="text-[11px] space-y-1">{files.map(f => <div key={`${f.name}-${f.size}`}>{f.name}</div>)}</div>}
              </>
            )}

            {error && <div className="text-[12px] text-red-600">{error}</div>}
            {notice && <div className="text-[12px] text-green-700">{notice}</div>}

            <button
              disabled={busy || (pptMode ? !pptUrl.trim() : isVideoLink ? !videoUrl.trim() : !files.length)}
              onClick={pptMode ? addPowerPoint : isVideoLink ? addVideoLink : upload}
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--primary)] text-white text-[12px] font-semibold disabled:opacity-40"
            >
              {busy ? (pptMode || isVideoLink ? 'Adding…' : 'Uploading…') : (pptMode ? 'Add PowerPoint' : isVideoLink ? 'Add Video Link' : `Upload ${files.length || ''} File${files.length === 1 ? '' : 's'}`)}
            </button>
          </div>
        </div>

        <div className="bg-white border border-[var(--line-soft)] rounded-2xl divide-y">
          <div className="px-5 py-4 flex items-center justify-between gap-4 font-semibold text-[14px]">
            <span>Shared Library {showDeleted && <span className="text-[12px] font-normal text-red-600">(Trash)</span>}</span>
            {isAdmin && (
              <label className="flex items-center gap-2 text-[12px] font-normal text-[var(--ink-45)] cursor-pointer select-none">
                <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} className="rounded text-[var(--primary)]" />
                Show Deleted Files
              </label>
            )}
          </div>
          {(() => {
            const filtered = items.filter(item => showDeleted ? item.deletedAt !== undefined : item.deletedAt === undefined)
            if (filtered.length === 0) return <div className="px-5 py-10 text-[12px] text-[var(--ink-45)]">{showDeleted ? 'No deleted files found.' : 'No files yet.'}</div>
            return filtered.map(item => {
              const label = item.fileFormat === 'PPT LINK' ? 'PowerPoint' : item.type
              return <div key={item.id} className={`px-5 py-3.5 flex items-center gap-3 ${item.deletedAt ? 'opacity-60 bg-red-50/10' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className={`text-[12.5px] font-semibold truncate ${item.deletedAt ? 'line-through text-slate-400' : ''}`}>{item.title}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] text-[var(--ink-45)]">{label} · {item.fileSize || '—'}</span>
                    {canDelete && <span className="inline-flex items-center rounded-full border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)]">Uploaded by: {item.uploadedByName || 'Existing library'}</span>}
                    {item.deletedAt && <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">Deleted</span>}
                  </div>
                </div>
                {!item.deletedAt && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-[var(--primary)]">Open</a>}
                {!item.deletedAt && item.sourceUrl && <button onClick={() => openViewer(item.sourceUrl!, item.title, item.id, item.tags || [], item.type as ResourceType, item.description || '')} className="text-[11px] font-semibold text-[var(--ink-45)] hover:text-[var(--ink)] hover:underline">Edit</button>}
                {item.deletedAt ? (isAdmin && <button disabled={busy} onClick={() => restore(item)} className="text-[11px] font-semibold text-emerald-600 hover:underline">Restore</button>) : (canDelete && <button disabled={busy} onClick={() => remove(item)} className="text-[11px] font-semibold text-red-600 hover:underline">Delete</button>)}
              </div>
            })
          })()}
        </div>
      </div>

      {/* ── Supabase Storage Breakdown & Analytics Modal (Admin Only) ─────────────── */}
      {showStorageModal && (
        <div
          className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={e => { if (e.target === e.currentTarget) setShowStorageModal(false) }}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center text-lg font-bold">
                  💾
                </div>
                <div>
                  <h2 className="text-[17px] font-bold text-white flex items-center gap-2">
                    Supabase Storage Analytics
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Live Database Sync
                    </span>
                  </h2>
                  <p className="text-[12px] text-slate-400">
                    Real-time breakdown of capacity, uploaders, file formats, and file-level consumption.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Plan Quota Selector */}
                <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5">
                  <span className="text-[11px] font-semibold text-slate-300 whitespace-nowrap">Plan Quota:</span>
                  <select
                    value={storageLimitGb}
                    onChange={e => updateStorageLimit(parseFloat(e.target.value) || 10)}
                    className="bg-slate-900 border border-slate-700 text-[12px] font-bold text-white rounded px-2 py-1 outline-none cursor-pointer"
                  >
                    <option value={1}>1 GB (Free Tier Standard)</option>
                    <option value={5}>5 GB (Free Tier Expanded)</option>
                    <option value={10}>10 GB (Supabase Pro Base)</option>
                    <option value={20}>20 GB (Pro Extra)</option>
                    <option value={50}>50 GB (Pro Growth)</option>
                    <option value={100}>100 GB (Pro Max)</option>
                    <option value={500}>500 GB (Enterprise)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setShowStorageModal(false)}
                  className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center text-lg font-bold transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Overview Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800/80 border border-slate-700/70 rounded-xl p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Used Storage
                  </div>
                  <div className="text-[20px] font-black text-white">
                    {formatBytes(totalUsedBytes)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>Limit: {storageLimitGb}.00 GB</span>
                    <span className="font-bold text-amber-400">{usedPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-700 mt-2 overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.max(3, usedPercentage)}%` }} />
                  </div>
                </div>

                <div className="bg-slate-800/80 border border-slate-700/70 rounded-xl p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Storage Remaining
                  </div>
                  <div className="text-[20px] font-black text-emerald-400">
                    {formatBytes(freeSpaceBytes)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {(100 - usedPercentage).toFixed(1)}% free capacity
                  </div>
                </div>

                <div className="bg-slate-800/80 border border-slate-700/70 rounded-xl p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Total Active Files
                  </div>
                  <div className="text-[20px] font-black text-white">
                    {activeItems.length} <span className="text-[13px] font-normal text-slate-400">items</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {activeItems.filter(i => i.storagePath).length} stored files · {activeItems.filter(i => !i.storagePath).length} external links
                  </div>
                </div>

                <div className="bg-slate-800/80 border border-slate-700/70 rounded-xl p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Top Contributor
                  </div>
                  <div className="text-[16px] font-bold text-white truncate">
                    {uploaderList[0]?.name || 'N/A'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {uploaderList[0] ? `${uploaderList[0].count} files · ${formatBytes(uploaderList[0].bytes)}` : 'No files'}
                  </div>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex border-b border-slate-800 gap-6 text-[13px] font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('uploaders')}
                  className={`pb-3 border-b-2 transition-colors ${activeTab === 'uploaders' ? 'border-[var(--primary)] text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                  👤 Breakdown by Uploader ({uploaderList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('formats')}
                  className={`pb-3 border-b-2 transition-colors ${activeTab === 'formats' ? 'border-[var(--primary)] text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                  📁 Breakdown by File Format ({formatList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('files')}
                  className={`pb-3 border-b-2 transition-colors ${activeTab === 'files' ? 'border-[var(--primary)] text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                  📄 File Explorer & Filters ({filteredStorageFiles.length})
                </button>
              </div>

              {/* Tab 1: Breakdown by Uploader */}
              {activeTab === 'uploaders' && (
                <div className="space-y-4">
                  <div className="text-[12px] text-slate-400">
                    Click any uploader row to filter the detailed file list below.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {uploaderList.map(u => {
                      const pct = totalUsedBytes > 0 ? (u.bytes / totalUsedBytes) * 100 : 0
                      return (
                        <div
                          key={u.name}
                          onClick={() => {
                            setSelectedUploaderFilter(u.name)
                            setActiveTab('files')
                          }}
                          className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] font-bold text-[13px] flex items-center justify-center flex-shrink-0">
                              {u.name[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-[13.5px] text-white truncate">{u.name}</div>
                              <div className="text-[11px] text-slate-400">{u.count} file{u.count === 1 ? '' : 's'} uploaded</div>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <div className="font-black text-[14px] text-white">{formatBytes(u.bytes)}</div>
                            <div className="text-[11px] text-amber-400 font-medium">{pct.toFixed(1)}% of used space</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Tab 2: Breakdown by File Format */}
              {activeTab === 'formats' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {formatList.map(f => {
                    const pct = totalUsedBytes > 0 ? (f.bytes / totalUsedBytes) * 100 : 0
                    return (
                      <div
                        key={f.format}
                        onClick={() => {
                          setSelectedFormatFilter(f.format)
                          setActiveTab('files')
                        }}
                        className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl p-4 cursor-pointer transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded bg-slate-700 text-white font-mono text-[10px] font-bold tracking-wider">
                            {f.format}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">{f.count} files</span>
                        </div>
                        <div className="text-[16px] font-black text-white">{formatBytes(f.bytes)}</div>
                        <div className="text-[11px] text-slate-400 mt-1">{pct.toFixed(1)}% of storage</div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Tab 3: Detailed File Explorer & Filter Bar */}
              <div className="space-y-4">
                {/* Filter Controls Bar */}
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                    <input
                      type="text"
                      value={storageSearch}
                      onChange={e => setStorageSearch(e.target.value)}
                      placeholder="Search file name or tag..."
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[12px] text-white placeholder-slate-500 outline-none min-w-[180px] flex-1"
                    />

                    <select
                      value={selectedUploaderFilter}
                      onChange={e => setSelectedUploaderFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[12px] text-white outline-none"
                    >
                      <option value="ALL">All Uploaders</option>
                      {uploaderList.map(u => (
                        <option key={u.name} value={u.name}>{u.name} ({u.count})</option>
                      ))}
                    </select>

                    <select
                      value={selectedFormatFilter}
                      onChange={e => setSelectedFormatFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[12px] text-white outline-none"
                    >
                      <option value="ALL">All Formats</option>
                      {formatList.map(f => (
                        <option key={f.format} value={f.format}>{f.format} ({f.count})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-medium">Sort:</span>
                    <select
                      value={storageSortBy}
                      onChange={e => setStorageSortBy(e.target.value as any)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[12px] text-white outline-none"
                    >
                      <option value="size_desc">Size: Largest First</option>
                      <option value="size_asc">Size: Smallest First</option>
                      <option value="newest">Upload: Newest First</option>
                      <option value="oldest">Upload: Oldest First</option>
                    </select>
                  </div>
                </div>

                {/* File Explorer Table */}
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12px]">
                      <thead className="bg-slate-800 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-3">File Name</th>
                          <th className="px-4 py-3">Format</th>
                          <th className="px-4 py-3">Uploaded By</th>
                          <th className="px-4 py-3">File Size</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {filteredStorageFiles.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-[12px]">
                              No files match your selected filters.
                            </td>
                          </tr>
                        ) : (
                          filteredStorageFiles.map(item => {
                            const bytes = parseFileSizeToBytes(item.fileSize)
                            return (
                              <tr key={item.id} className="hover:bg-slate-800/70 transition-colors">
                                <td className="px-4 py-3 font-semibold text-white max-w-[260px] truncate">
                                  {item.title}
                                </td>
                                <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                                  <span className="px-2 py-0.5 rounded bg-slate-700/60 font-bold">
                                    {item.fileFormat || item.type || '—'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-300">
                                  {item.uploadedByName || 'Existing library'}
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-200 font-bold">
                                  {item.fileSize || formatBytes(bytes)}
                                </td>
                                <td className="px-4 py-3 text-right space-x-3 font-semibold">
                                  {item.sourceUrl && (
                                    <button
                                      type="button"
                                      onClick={() => openViewer(item.sourceUrl!, item.title, item.id, item.tags || [], item.type as ResourceType, item.description || '')}
                                      className="text-emerald-400 hover:underline"
                                    >
                                      Edit / View
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      type="button"
                                      onClick={() => remove(item)}
                                      className="text-red-400 hover:underline"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
