import { ChangeEvent, useEffect, useState } from 'react'
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

export default function AdminResources({ canDelete = true }: { canDelete?: boolean }) {
  const [items, setItems] = useState<ManagedResource[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [productId, setProductId] = useState('sheshi')
  const [type, setType] = useState<ResourceType>('document')
  const [videoCategory, setVideoCategory] = useState<VideoCategory>('Story')
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

  const load = async () => {
    try { setItems(await getManagedResources()) }
    catch (e) { setError(getErrorMessage(e, 'Failed to load files')) }
  }

  useEffect(() => {
    getMyProfile().then(p => {
      setIsAdmin(p?.role === 'admin' && p?.status === 'approved')
    })
    load()
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
  }

  const addPowerPoint = async () => {
    const url = pptUrl.trim()
    if (!url) { setError('Paste a PowerPoint link first.'); return }
    try { new URL(url) } catch { setError('Please enter a valid PowerPoint URL.'); return }

    setBusy(true)
    setError('')
    setNotice('')
    try {
      const profile = await getMyProfile()
      const tags = ['PowerPoint', ...tagsInput.split(',').map(t => t.trim()).filter(Boolean)]
      const parsed = new URL(url)
      const lastSegment = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || 'PowerPoint')
      const title = lastSegment.replace(/\.(pptx?|ppsx?|potx?|pptm|ppsm)$/i, '') || 'PowerPoint'

      const { error: insertError } = await supabase.from('vault_resources').insert({
        title,
        description: description.trim() || null,
        type: 'document',
        product_id: productId,
        source_url: url,
        thumbnail: null,
        storage_path: null,
        file_format: 'PPT LINK',
        file_size: null,
        tags,
        featured: false,
        uploaded_by: profile?.id || null,
        uploaded_by_name: profile?.full_name || null,
      })

      if (insertError) throw new Error(`PowerPoint link failed: ${getErrorMessage(insertError)}`)
      resetForm()
      setNotice('PowerPoint link added successfully.')
      await load()
      window.dispatchEvent(new Event('vault-resources-changed'))
    } catch (e) {
      setError(getErrorMessage(e, 'Could not add the PowerPoint link'))
    } finally {
      setBusy(false)
    }
  }

  const addVideoLink = async () => {
    const url = videoUrl.trim()
    if (!url) { setError('Paste a video link first.'); return }
    try { new URL(url) } catch { setError('Please enter a valid video URL.'); return }

    setBusy(true)
    setError('')
    setNotice('')
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      await createLinkedVideo({
        title: videoTitle.trim() || 'Video',
        description: description.trim() || null,
        type: 'video',
        productId,
        tags,
        videoCategory,
      }, url)
      resetForm()
      setNotice('Video link added successfully.')
      await load()
      window.dispatchEvent(new Event('vault-resources-changed'))
    } catch (e) {
      setError(getErrorMessage(e, 'Could not add the video link'))
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

  return (
    <div className="px-8 py-6 max-w-[1400px] min-h-full">
      <div className="mb-6">
        <h1 className="font-display text-[22px] font-bold text-[var(--ink)]">{canDelete ? 'Related Products & Files' : 'Upload Files'}</h1>
        <p className="text-[13px] text-[var(--ink-45)] mt-1">{canDelete ? 'Manage the shared library and see who uploaded each file.' : 'Upload files to the shared library. You can view and download files but do not have admin controls.'}</p>
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
              <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="e.g. branding, event, 2026" className="mt-1.5 w-full px-3 py-2.5 rounded-lg border" />
              <span className="block mt-1 text-[10px] text-[var(--ink-45)]">Separate multiple tags with commas</span>
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
                {item.deletedAt ? (isAdmin && <button disabled={busy} onClick={() => restore(item)} className="text-[11px] font-semibold text-emerald-600 hover:underline">Restore</button>) : (canDelete && <button disabled={busy} onClick={() => remove(item)} className="text-[11px] font-semibold text-red-600 hover:underline">Delete</button>)}
              </div>
            })
          })()}
        </div>
      </div>
    </div>
  )
}
