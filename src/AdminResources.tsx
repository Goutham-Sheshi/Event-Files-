import { ChangeEvent, useEffect, useState } from 'react'
import { openViewer } from './fileViewerBridge'
import { products } from './data'
import type { ContentStatus, ResourceType, VideoCategory } from './types'
import { getMyProfile } from './authApi'
import { supabase } from './lib/supabase'
import { createLinkedVideo, deleteManagedResource, restoreManagedResource, permanentlyDeleteResource, checkDuplicateResource, replaceManagedResourceFile, getErrorMessage, getManagedResources, uploadResource, renameGlobalTag, mergeGlobalTags, deleteGlobalTag, type ManagedResource } from './resourcesApi'

const TYPES: ResourceType[] = ['logo', 'brochure', 'video', 'document', 'other']
const VIDEO_CATEGORIES: VideoCategory[] = ['Story', 'Podcast', 'Product', 'People', 'Event', 'Brand', 'Other']
const STATUS_OPTIONS: ContentStatus[] = ['Active', 'Official', 'Archived', 'Deprecated']
const PPT_VALUE = '__powerpoint_link__'
const VIDEO_LINK_VALUE = '__video_link__'

type LinkMode = 'upload' | 'link'

function StorageCloudIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19H9a7 7 0 0 1-6.9-6C1.4 8 5 4 9.5 4c1.2 0 2.3.3 3.3.9C14 2.1 16.8 0 20 0c3.9 0 7 3.1 7 7 0 .5-.1 1-.2 1.5A7 7 0 0 1 17.5 19z" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

function UserAvatarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function FolderFormatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function FileItemIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function CloseCrossIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function AlertTriangleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

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
  const [contentStatus, setContentStatus] = useState<ContentStatus>('Active')
  const [versionInput, setVersionInput] = useState('v1.0')
  const [categoryAutoDetected, setCategoryAutoDetected] = useState(false)
  const [linkMode, setLinkMode] = useState<LinkMode>('upload')
  const [pptMode, setPptMode] = useState(false)
  const [pptUrl, setPptUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE_OFFICIAL')

  // Phase 2: Duplicate Modal State
  const [duplicateMatch, setDuplicateMatch] = useState<ManagedResource | null>(null)
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null)

  // Storage Modal state
  const [showStorageModal, setShowStorageModal] = useState(false)
  const [storageSearch, setStorageSearch] = useState('')
  const [selectedUploaderFilter, setSelectedUploaderFilter] = useState('ALL')
  const [selectedFormatFilter, setSelectedFormatFilter] = useState('ALL')
  const [storageSortBy, setStorageSortBy] = useState<'size_desc' | 'size_asc' | 'newest' | 'oldest'>('size_desc')
  const [activeTab, setActiveTab] = useState<'uploaders' | 'formats' | 'files'>('uploaders')

  // Tag Governance Modal state
  const [showTagModal, setShowTagModal] = useState(false)
  const [tagRenameOld, setTagRenameOld] = useState('')
  const [tagRenameNew, setTagRenameNew] = useState('')

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

  const removeFileFromQueue = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

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
    setContentStatus('Active')
    setVersionInput('v1.0')
    setCategoryAutoDetected(false)
    setUploadProgress('')
    setDuplicateMatch(null)
    setPendingUploadFile(null)
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
        contentStatus,
        version: versionInput,
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
        contentStatus,
        version: versionInput,
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

  // Pre-flight check & Upload function
  const upload = async (overrideFile?: File) => {
    const uploadList = overrideFile ? [overrideFile] : files
    if (!uploadList.length) return

    // Pre-flight Duplicate Check for single upload if not overriding
    if (!overrideFile && uploadList.length === 1) {
      const target = uploadList[0]
      const duplicate = await checkDuplicateResource(target.name, target.size, target.name.replace(/\.[^.]+$/, ''))
      if (duplicate) {
        setDuplicateMatch(duplicate)
        setPendingUploadFile(target)
        return
      }
    }

    setBusy(true)
    setError('')
    setNotice('')
    const count = uploadList.length
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)

    try {
      let current = 0
      for (const file of uploadList) {
        current++
        setUploadProgress(`Uploading file ${current} of ${count}: ${file.name}...`)
        await uploadResource({
          title: file.name.replace(/\.[^.]+$/, ''),
          description: description.trim() || null,
          type,
          productId,
          tags,
          videoCategory: type === 'video' ? videoCategory : undefined,
          contentStatus,
          version: versionInput,
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
      setUploadProgress('')
    }
  }

  // Handle Replace File action from Duplicate Modal
  const handleReplaceDuplicate = async () => {
    if (!duplicateMatch || !pendingUploadFile) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const updated = await replaceManagedResourceFile(duplicateMatch, pendingUploadFile)
      setNotice(`File "${updated.title}" was updated to version ${updated.version || 'v2.0'}.`)
      resetForm()
      await load()
      window.dispatchEvent(new Event('vault-resources-changed'))
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to replace file'))
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

  const handlePermanentDelete = async (item: ManagedResource) => {
    if (!confirm(`Permanently delete "${item.title}"? This cannot be undone.`)) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await permanentlyDeleteResource(item)
      await load()
      setNotice(`"${item.title}" was permanently purged.`)
      window.dispatchEvent(new Event('vault-resources-changed'))
    } catch (e) {
      setError(getErrorMessage(e, 'Permanent delete failed'))
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

  const handleRenameTag = async () => {
    if (!tagRenameOld || !tagRenameNew.trim()) return
    setBusy(true)
    try {
      await renameGlobalTag(tagRenameOld, tagRenameNew.trim())
      setNotice(`Tag "${tagRenameOld}" renamed to "${tagRenameNew.trim()}".`)
      setTagRenameOld('')
      setTagRenameNew('')
      await load()
      window.dispatchEvent(new Event('vault-resources-changed'))
    } catch (e) {
      setError(getErrorMessage(e, 'Tag rename failed'))
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteTag = async (tag: string) => {
    if (!confirm(`Delete tag "${tag}" across all resources?`)) return
    setBusy(true)
    try {
      await deleteGlobalTag(tag)
      setNotice(`Tag "${tag}" removed from all resources.`)
      await load()
      window.dispatchEvent(new Event('vault-resources-changed'))
    } catch (e) {
      setError(getErrorMessage(e, 'Tag deletion failed'))
    } finally {
      setBusy(false)
    }
  }

  const isVideoLink = type === 'video' && linkMode === 'link'

  // ─── Calculate Storage & Global Tags ──────────────────────────────────────────
  const activeItems = items.filter(r => r.deletedAt === undefined)
  const totalUsedBytes = activeItems.reduce((acc, item) => acc + parseFileSizeToBytes(item.fileSize), 0)

  // Global Tags aggregation
  const globalTagMap = new Map<string, number>()
  activeItems.forEach(item => {
    (item.tags || []).forEach(t => {
      const clean = t.trim()
      if (clean) globalTagMap.set(clean, (globalTagMap.get(clean) || 0) + 1)
    })
  })
  const globalTagList = Array.from(globalTagMap.entries()).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count)

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
            {canDelete ? 'Manage shared library, file governance, duplicate detection, and storage analytics.' : 'Upload files to the shared library.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Admin Tag Governance Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowTagModal(true)}
              className="bg-white border border-[var(--line-soft)] hover:border-[var(--primary)] text-[var(--ink)] rounded-2xl px-4 py-3 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-2 text-[12.5px] font-semibold"
            >
              <span className="text-[var(--primary)]"><TagIcon /></span>
              Tag Governance ({globalTagList.length})
            </button>
          )}

          {/* Admin Storage Usage Widget */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowStorageModal(true)}
              className="group text-left bg-white border border-[var(--line-soft)] hover:border-[var(--primary)] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer min-w-[270px]"
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2 text-[var(--ink)]">
                  <span className="w-6 h-6 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                    <StorageCloudIcon />
                  </span>
                  <span className="text-[12.5px] font-bold tracking-tight">Storage Usage</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                  Admin
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[16px] font-black text-[var(--ink)]">
                  {formatBytes(totalUsedBytes)} <span className="text-[11px] font-normal text-[var(--ink-45)]">consumed</span>
                </span>
                <span className="text-[11px] font-bold text-[var(--primary)] group-hover:underline">
                  Details →
                </span>
              </div>
            </button>
          )}
        </div>
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

            <div className="grid grid-cols-2 gap-3">
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

              <label className="block text-[12px] font-medium">Content Status
                <select value={contentStatus} onChange={e => setContentStatus(e.target.value as ContentStatus)} className="mt-1.5 w-full px-3 py-2.5 rounded-lg border font-semibold">
                  <option value="Active">Active</option>
                  <option value="Official">Official ✓</option>
                  <option value="Archived">Archived</option>
                  <option value="Deprecated">Deprecated ⚠️</option>
                </select>
              </label>
            </div>

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

            <div className="grid grid-cols-3 gap-3">
              <label className="col-span-2 block text-[12px] font-medium">Tags
                <input value={tagsInput} onChange={e => handleTagsChange(e.target.value)} placeholder="e.g. Story, Event, Brand, 2026" className="mt-1.5 w-full px-3 py-2.5 rounded-lg border" />
              </label>

              <label className="block text-[12px] font-medium">Version
                <input value={versionInput} onChange={e => setVersionInput(e.target.value)} placeholder="v1.0" className="mt-1.5 w-full px-3 py-2.5 rounded-lg border font-mono font-semibold" />
              </label>
            </div>
            <span className="block text-[10px] text-[var(--ink-45)]">
              Separate multiple tags with commas
              {type === 'video' && categoryAutoDetected && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">⚡ Auto-detected category</span>
              )}
            </span>

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
                
                {/* Pre-Upload Queue List */}
                {files.length > 0 && (
                  <div className="text-[11px] space-y-1.5 bg-[var(--canvas-deep)] border border-[var(--line-soft)] rounded-xl p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-45)] mb-1 flex items-center justify-between">
                      <span>Selected Queue ({files.length})</span>
                      <button type="button" onClick={() => setFiles([])} className="text-red-500 hover:underline cursor-pointer">Clear All</button>
                    </div>
                    {files.map((f, idx) => (
                      <div key={`${f.name}-${f.size}`} className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-[var(--line-soft)]">
                        <div className="min-w-0 flex-1 truncate">
                          <span className="font-semibold text-[var(--ink)] block truncate">{f.name}</span>
                          <span className="text-[10px] text-[var(--ink-45)]">{formatBytes(f.size)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFileFromQueue(idx)}
                          className="w-5 h-5 rounded bg-red-100 text-red-600 font-bold flex items-center justify-center text-[12px] hover:bg-red-200 cursor-pointer"
                          title="Remove file"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {uploadProgress && <div className="text-[12px] font-semibold text-[var(--primary)] animate-pulse">{uploadProgress}</div>}
            {error && <div className="text-[12px] text-red-600">{error}</div>}
            {notice && <div className="text-[12px] text-green-700">{notice}</div>}

            <button
              disabled={busy || (pptMode ? !pptUrl.trim() : isVideoLink ? !videoUrl.trim() : !files.length)}
              onClick={() => upload()}
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--primary)] text-white text-[12px] font-semibold disabled:opacity-40 cursor-pointer"
            >
              {busy ? (pptMode || isVideoLink ? 'Adding…' : 'Uploading…') : (pptMode ? 'Add PowerPoint' : isVideoLink ? 'Add Video Link' : `Upload ${files.length || ''} File${files.length === 1 ? '' : 's'}`)}
            </button>
          </div>
        </div>

        <div className="bg-white border border-[var(--line-soft)] rounded-2xl divide-y">
          <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-4 font-semibold text-[14px]">
            <div className="flex items-center gap-3">
              <span>Shared Library {showDeleted && <span className="text-[12px] font-normal text-red-600">(Trash Bin)</span>}</span>
              
              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-[var(--canvas-deep)] border border-[var(--line-soft)] text-[11px] text-[var(--ink)] outline-none font-medium"
              >
                <option value="ACTIVE_OFFICIAL">Active & Official (Default)</option>
                <option value="ALL">All Content Statuses</option>
                <option value="Official">Official Only ✓</option>
                <option value="Archived">Archived Only</option>
                <option value="Deprecated">Deprecated Only ⚠️</option>
              </select>
            </div>

            {isAdmin && (
              <label className="flex items-center gap-2 text-[12px] font-normal text-[var(--ink-45)] cursor-pointer select-none">
                <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} className="rounded text-[var(--primary)]" />
                Show Deleted Files (Trash)
              </label>
            )}
          </div>

          {(() => {
            const filtered = items.filter(item => {
              const matchesDelete = showDeleted ? item.deletedAt !== undefined : item.deletedAt === undefined
              if (!matchesDelete) return false
              const status = item.contentStatus || 'Active'
              if (filterStatus === 'ACTIVE_OFFICIAL') return status === 'Active' || status === 'Official' || item.isOfficial
              if (filterStatus === 'ALL') return true
              if (filterStatus === 'Official') return status === 'Official' || item.isOfficial
              return status === filterStatus
            })

            if (filtered.length === 0) return <div className="px-5 py-10 text-[12px] text-[var(--ink-45)]">{showDeleted ? 'No deleted files in trash.' : 'No files matching selected status.'}</div>
            
            return filtered.map(item => {
              const label = item.fileFormat === 'PPT LINK' ? 'PowerPoint' : item.type
              const status = item.contentStatus || 'Active'
              const isOfficial = item.isOfficial || status === 'Official'

              return <div key={item.id} className={`px-5 py-3.5 flex items-center gap-3 ${item.deletedAt ? 'opacity-70 bg-red-50/20' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[12.5px] font-semibold truncate ${item.deletedAt ? 'line-through text-slate-400' : ''}`}>{item.title}</span>
                    {isOfficial && <span className="px-2 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] font-bold text-[9.5px] border border-[var(--primary)]/30">Official ✓</span>}
                    {status === 'Archived' && <span className="px-2 py-0.5 rounded bg-slate-500/15 text-slate-400 font-semibold text-[9.5px]">Archived</span>}
                    {status === 'Deprecated' && <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-500 font-bold text-[9.5px]">Deprecated ⚠️</span>}
                    {item.version && <span className="px-1.5 py-0.2 rounded bg-[var(--canvas-deep)] font-mono text-[9.5px] font-bold text-[var(--ink-45)] border border-[var(--line-soft)]">{item.version}</span>}
                  </div>

                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] text-[var(--ink-45)]">{label} · {item.fileSize || '—'}</span>
                    {canDelete && <span className="inline-flex items-center rounded-full border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)]">Uploaded by: {item.uploadedByName || 'Existing library'}</span>}
                    {item.deletedAt && <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">Deleted</span>}
                  </div>
                </div>

                {!item.deletedAt && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-[var(--primary)]">Open</a>}
                {!item.deletedAt && item.sourceUrl && (
                  <button
                    onClick={() => openViewer(
                      item.sourceUrl!,
                      item.title,
                      item.id,
                      item.tags || [],
                      item.type as ResourceType,
                      item.description || '',
                      item.contentStatus || 'Active',
                      item.version || 'v1.0'
                    )}
                    className="text-[11px] font-semibold text-[var(--ink-45)] hover:text-[var(--ink)] hover:underline"
                  >
                    Edit
                  </button>
                )}
                {item.deletedAt ? (
                  <div className="flex items-center gap-3">
                    <button disabled={busy} onClick={() => restore(item)} className="text-[11px] font-semibold text-emerald-600 hover:underline">Restore</button>
                    {isAdmin && <button disabled={busy} onClick={() => handlePermanentDelete(item)} className="text-[11px] font-semibold text-red-600 hover:underline">Permanent Delete</button>}
                  </div>
                ) : (
                  canDelete && <button disabled={busy} onClick={() => remove(item)} className="text-[11px] font-semibold text-red-600 hover:underline">Delete</button>
                )}
              </div>
            })
          })()}
        </div>
      </div>

      {/* ── Phase 2: Duplicate File Warning Modal ────────────────────────────── */}
      {duplicateMatch && pendingUploadFile && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) { setDuplicateMatch(null); setPendingUploadFile(null); } }}
        >
          <div className="bg-white border border-[var(--line-soft)] rounded-2xl w-full max-w-lg shadow-2xl p-6 text-[var(--ink)] space-y-4">
            <div className="flex items-center gap-3 text-amber-500">
              <span className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <AlertTriangleIcon />
              </span>
              <div>
                <h2 className="text-[16px] font-bold text-[var(--ink)]">Possible Duplicate Detected</h2>
                <p className="text-[11.5px] text-[var(--ink-45)]">A similar file already exists in the Vault.</p>
              </div>
            </div>

            <div className="bg-[var(--canvas-deep)] border border-[var(--line-soft)] rounded-xl p-4 space-y-2">
              <div className="text-[11px] uppercase font-bold text-[var(--ink-45)]">Existing Vault File</div>
              <div className="font-bold text-[14px] text-[var(--ink)]">{duplicateMatch.title}</div>
              <div className="text-[11.5px] text-[var(--ink-45)] flex items-center gap-2">
                <span>Version: <strong className="text-[var(--ink)]">{duplicateMatch.version || 'v1.0'}</strong></span>
                <span>• Size: <strong className="text-[var(--ink)]">{duplicateMatch.fileSize || '—'}</strong></span>
                <span>• Uploaded by: <strong className="text-[var(--ink)]">{duplicateMatch.uploadedByName || 'Library'}</strong></span>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl p-3 text-[12px]">
              Would you like to replace the existing file (increments to version <strong>v2.0</strong>) or upload as a new separate file?
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setDuplicateMatch(null); setPendingUploadFile(null); }}
                className="px-4 py-2 rounded-lg border border-[var(--line-soft)] text-[12px] font-semibold text-[var(--ink-45)] hover:text-[var(--ink)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = pendingUploadFile
                  setDuplicateMatch(null)
                  setPendingUploadFile(null)
                  upload(target)
                }}
                className="px-4 py-2 rounded-lg border border-[var(--primary)] text-[var(--primary)] text-[12px] font-semibold hover:bg-[var(--primary)]/10 cursor-pointer"
              >
                Upload Anyway
              </button>
              <button
                type="button"
                onClick={handleReplaceDuplicate}
                className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-[12px] font-semibold hover:opacity-90 cursor-pointer"
              >
                Replace Existing File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Admin Tag Governance Modal ─────────────────────────────────────── */}
      {showTagModal && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={e => { if (e.target === e.currentTarget) setShowTagModal(false) }}
        >
          <div className="bg-white border border-[var(--line-soft)] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl text-[var(--ink)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--line-soft)] flex items-center justify-between gap-4 bg-[var(--paper)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                  <TagIcon />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-[var(--ink)]">Admin Tag Governance</h2>
                  <p className="text-[11.5px] text-[var(--ink-45)]">Rename tags, merge duplicates, or remove unused tags globally across the Vault.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTagModal(false)}
                className="w-8 h-8 rounded-lg bg-[var(--canvas-deep)] text-[var(--ink-70)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer"
              >
                <CloseCrossIcon />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[var(--canvas)]">
              <div className="bg-white border border-[var(--line-soft)] rounded-xl p-4 shadow-sm space-y-3">
                <h3 className="text-[13px] font-bold text-[var(--ink)]">Rename Global Tag</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={tagRenameOld}
                    onChange={e => setTagRenameOld(e.target.value)}
                    className="px-3 py-2 rounded-lg border text-[12px] bg-[var(--canvas-deep)] min-w-[160px]"
                  >
                    <option value="">Select tag to rename…</option>
                    {globalTagList.map(t => (
                      <option key={t.tag} value={t.tag}>{t.tag} ({t.count} files)</option>
                    ))}
                  </select>
                  <span className="text-[12px] text-[var(--ink-45)]">→</span>
                  <input
                    type="text"
                    value={tagRenameNew}
                    onChange={e => setTagRenameNew(e.target.value)}
                    placeholder="New Tag Name"
                    className="px-3 py-2 rounded-lg border text-[12px] bg-[var(--canvas-deep)] flex-1 min-w-[160px]"
                  />
                  <button
                    type="button"
                    disabled={busy || !tagRenameOld || !tagRenameNew.trim()}
                    onClick={handleRenameTag}
                    className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-[12px] font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Rename Tag
                  </button>
                </div>
              </div>

              <div className="bg-white border border-[var(--line-soft)] rounded-xl p-4 shadow-sm space-y-3">
                <h3 className="text-[13px] font-bold text-[var(--ink)]">Active Vault Tags ({globalTagList.length})</h3>
                <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto p-1 border border-[var(--line-soft)] rounded-lg bg-[var(--canvas-deep)]">
                  {globalTagList.map(t => (
                    <div key={t.tag} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white border border-[var(--line-soft)] text-[11px] font-medium shadow-xs">
                      <span>{t.tag}</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-bold text-[9.5px]">{t.count}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTag(t.tag)}
                        className="text-red-500 hover:text-red-700 text-[12px] font-bold ml-1"
                        title="Delete tag globally"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Supabase Storage Analytics Modal ─────────────────────────────── */}
      {showStorageModal && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={e => { if (e.target === e.currentTarget) setShowStorageModal(false) }}
        >
          <div className="bg-white border border-[var(--line-soft)] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl text-[var(--ink)] overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--line-soft)] flex items-center justify-between gap-4 bg-[var(--paper)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold">
                  <StorageCloudIcon />
                </div>
                <div>
                  <h2 className="text-[17px] font-bold text-[var(--ink)] flex items-center gap-2">
                    Storage Analytics & Consumption
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                      Live Sync
                    </span>
                  </h2>
                  <p className="text-[12px] text-[var(--ink-45)]">
                    Detailed breakdown of storage usage across uploaders, file formats, and items.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowStorageModal(false)}
                className="w-8 h-8 rounded-lg bg-[var(--canvas-deep)] text-[var(--ink-70)] hover:text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseCrossIcon />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[var(--canvas)]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-[var(--line-soft)] rounded-xl p-4 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-45)] mb-1">
                    Total Storage Consumed
                  </div>
                  <div className="text-[22px] font-black text-[var(--ink)]">
                    {formatBytes(totalUsedBytes)}
                  </div>
                  <div className="text-[11px] text-[var(--ink-45)] mt-1">
                    Across {activeItems.length} uploaded resources
                  </div>
                </div>

                <div className="bg-white border border-[var(--line-soft)] rounded-xl p-4 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-45)] mb-1">
                    Files vs Links
                  </div>
                  <div className="text-[22px] font-black text-[var(--ink)]">
                    {activeItems.filter(i => i.storagePath).length} <span className="text-[13px] font-normal text-[var(--ink-45)]">files</span>
                  </div>
                  <div className="text-[11px] text-[var(--ink-45)] mt-1">
                    {activeItems.filter(i => !i.storagePath).length} external links registered
                  </div>
                </div>

                <div className="bg-white border border-[var(--line-soft)] rounded-xl p-4 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-45)] mb-1">
                    Top Uploader
                  </div>
                  <div className="text-[18px] font-bold text-[var(--ink)] truncate">
                    {uploaderList[0]?.name || 'N/A'}
                  </div>
                  <div className="text-[11px] text-[var(--ink-45)] mt-1">
                    {uploaderList[0] ? `${uploaderList[0].count} files · ${formatBytes(uploaderList[0].bytes)}` : 'No uploads'}
                  </div>
                </div>
              </div>

              <div className="flex border-b border-[var(--line-soft)] gap-6 text-[13px] font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('uploaders')}
                  className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${activeTab === 'uploaders' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--ink-45)] hover:text-[var(--ink)]'}`}
                >
                  <UserAvatarIcon /> Breakdown by Uploader ({uploaderList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('formats')}
                  className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${activeTab === 'formats' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--ink-45)] hover:text-[var(--ink)]'}`}
                >
                  <FolderFormatIcon /> Breakdown by File Format ({formatList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('files')}
                  className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${activeTab === 'files' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--ink-45)] hover:text-[var(--ink)]'}`}
                >
                  <FileItemIcon /> File Explorer & Filters ({filteredStorageFiles.length})
                </button>
              </div>

              {activeTab === 'uploaders' && (
                <div className="space-y-4">
                  <div className="text-[12px] text-[var(--ink-45)]">
                    Click any uploader to filter the detailed file list.
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
                          className="bg-white hover:border-[var(--primary)] border border-[var(--line-soft)] rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between gap-4 shadow-sm"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-bold text-[13px] flex items-center justify-center flex-shrink-0">
                              {u.name[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-[13.5px] text-[var(--ink)] truncate">{u.name}</div>
                              <div className="text-[11px] text-[var(--ink-45)]">{u.count} file{u.count === 1 ? '' : 's'} uploaded</div>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <div className="font-black text-[14px] text-[var(--ink)]">{formatBytes(u.bytes)}</div>
                            <div className="text-[11px] text-[var(--primary)] font-medium">{pct.toFixed(1)}% of total</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

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
                        className="bg-white hover:border-[var(--primary)] border border-[var(--line-soft)] rounded-xl p-4 cursor-pointer transition-all shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded bg-[var(--canvas-deep)] text-[var(--ink)] font-mono text-[10px] font-bold tracking-wider">
                            {f.format}
                          </span>
                          <span className="text-[11px] text-[var(--ink-45)] font-medium">{f.count} files</span>
                        </div>
                        <div className="text-[16px] font-black text-[var(--ink)]">{formatBytes(f.bytes)}</div>
                        <div className="text-[11px] text-[var(--ink-45)] mt-1">{pct.toFixed(1)}% of storage</div>
                      </div>
                    )
                  })}
                </div>
              )}

              {activeTab === 'files' && (
                <div className="space-y-4">
                  <div className="bg-white border border-[var(--line-soft)] rounded-xl p-3 flex flex-wrap gap-3 items-center justify-between shadow-sm">
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                      <input
                        type="text"
                        value={storageSearch}
                        onChange={e => setStorageSearch(e.target.value)}
                        placeholder="Search file name or tag..."
                        className="px-3 py-1.5 rounded-lg bg-[var(--canvas-deep)] border border-[var(--line-soft)] text-[12px] text-[var(--ink)] placeholder-[var(--ink-45)] outline-none min-w-[180px] flex-1"
                      />

                      <select
                        value={selectedUploaderFilter}
                        onChange={e => setSelectedUploaderFilter(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--canvas-deep)] border border-[var(--line-soft)] text-[12px] text-[var(--ink)] outline-none"
                      >
                        <option value="ALL">All Uploaders</option>
                        {uploaderList.map(u => (
                          <option key={u.name} value={u.name}>{u.name} ({u.count})</option>
                        ))}
                      </select>

                      <select
                        value={selectedFormatFilter}
                        onChange={e => setSelectedFormatFilter(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--canvas-deep)] border border-[var(--line-soft)] text-[12px] text-[var(--ink)] outline-none"
                      >
                        <option value="ALL">All Formats</option>
                        {formatList.map(f => (
                          <option key={f.format} value={f.format}>{f.format} ({f.count})</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[var(--ink-45)] font-medium">Sort:</span>
                      <select
                        value={storageSortBy}
                        onChange={e => setStorageSortBy(e.target.value as any)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--canvas-deep)] border border-[var(--line-soft)] text-[12px] text-[var(--ink)] outline-none"
                      >
                        <option value="size_desc">Size: Largest First</option>
                        <option value="size_asc">Size: Smallest First</option>
                        <option value="newest">Upload: Newest First</option>
                        <option value="oldest">Oldest First</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-white border border-[var(--line-soft)] rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[12px]">
                        <thead className="bg-[var(--canvas-deep)] text-[var(--ink-70)] font-semibold border-b border-[var(--line-soft)] uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-4 py-3">File Name</th>
                            <th className="px-4 py-3">Format</th>
                            <th className="px-4 py-3">Uploaded By</th>
                            <th className="px-4 py-3">File Size</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--line-soft)]">
                          {filteredStorageFiles.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-45)] text-[12px]">
                                No files match your selected filters.
                              </td>
                            </tr>
                          ) : (
                            filteredStorageFiles.map(item => {
                              const bytes = parseFileSizeToBytes(item.fileSize)
                              return (
                                <tr key={item.id} className="hover:bg-[var(--canvas-deep)] transition-colors">
                                  <td className="px-4 py-3 font-semibold text-[var(--ink)] max-w-[260px] truncate">
                                    {item.title}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-[11px] text-[var(--ink-70)]">
                                    <span className="px-2 py-0.5 rounded bg-[var(--canvas-deep)] font-bold border border-[var(--line-soft)]">
                                      {item.fileFormat || item.type || '—'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-[var(--ink-70)]">
                                    {item.uploadedByName || 'Existing library'}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-[var(--ink)] font-bold">
                                    {item.fileSize || formatBytes(bytes)}
                                  </td>
                                  <td className="px-4 py-3 text-right space-x-3 font-semibold">
                                    {item.sourceUrl && (
                                      <button
                                        type="button"
                                        onClick={() => openViewer(
                                          item.sourceUrl!,
                                          item.title,
                                          item.id,
                                          item.tags || [],
                                          item.type as ResourceType,
                                          item.description || '',
                                          item.contentStatus || 'Active',
                                          item.version || 'v1.0'
                                        )}
                                        className="text-[var(--primary)] hover:underline"
                                      >
                                        Edit / View
                                      </button>
                                    )}
                                    {canDelete && (
                                      <button
                                        type="button"
                                        onClick={() => remove(item)}
                                        className="text-red-600 hover:underline"
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
