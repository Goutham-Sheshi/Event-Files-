import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { products } from './data'
import type { ResourceType } from './types'
import { createLinkedVideo, deleteManagedResource, getErrorMessage, getManagedResources, uploadResource, type ManagedResource } from './resourcesApi'
import { resourceSchema, type ResourceFormData } from './schemas/resourceSchemas'

const SHESHI_ID = 'sheshi'
const TYPES: { value: ResourceType; label: string }[] = [
  { value: 'logo', label: 'Brand Asset' },
  { value: 'brochure', label: 'Brochure' },
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Document' },
  { value: 'other', label: 'Other' },
]

export default function AdminResources() {
  const [items, setItems] = useState<ManagedResource[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [videoMode, setVideoMode] = useState<'upload' | 'link'>('upload')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<ResourceFormData>({
    resolver: yupResolver(resourceSchema),
    defaultValues: {
      productId: products[0]?.id || SHESHI_ID,
      type: 'document',
      title: '',
      tags: '',
      description: '',
      videoUrl: '',
    },
    mode: 'onTouched',
  })

  const currentType = watch('type') as ResourceType
  const currentProductId = watch('productId')
  const currentTitle = watch('title')
  const currentVideoUrl = watch('videoUrl') || ''

  const load = async () => {
    try { setItems(await getManagedResources()) }
    catch (e) { setError(getErrorMessage(e, 'Failed to load files')) }
  }

  useEffect(() => { load() }, [])

  const grouped = useMemo(() => [
    { product: { id: SHESHI_ID, name: 'Sheshi', color: '#E05A1C', light: '#FCE7DB' }, items: items.filter(item => item.productId === SHESHI_ID) },
    ...products.map(product => ({ product, items: items.filter(item => item.productId === product.id) }))
  ], [items])

  const pickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const next = Array.from(e.target.files || [])
    setFiles(next)
    if (next.length === 1 && !currentTitle) {
      setValue('title', next[0].name.replace(/\.[^.]+$/, ''))
    }
  }

  const onSave = async (data: ResourceFormData) => {
    const isVideoLink = data.type === 'video' && videoMode === 'link'
    if (!data.productId || (isVideoLink ? !data.videoUrl?.trim() : !files.length)) return

    setBusy(true)
    setError('')
    setNotice('')

    try {
      const parsedTags = (data.tags || '').split(',').map(tag => tag.trim()).filter(Boolean)
      if (isVideoLink) {
        await createLinkedVideo(
          {
            title: data.title?.trim() || 'Video',
            description: data.description?.trim() || null,
            type: 'video',
            productId: data.productId,
            tags: parsedTags,
          },
          data.videoUrl?.trim() || ''
        )
        setValue('videoUrl', '')
        setNotice('Video link added and organised under the selected product.')
      } else {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          await uploadResource(
            {
              title: files.length === 1 ? (data.title?.trim() || file.name) : file.name.replace(/\.[^.]+$/, ''),
              description: data.description?.trim() || null,
              type: data.type as ResourceType,
              productId: data.productId,
              tags: parsedTags,
            },
            file
          )
        }
        setNotice(`${files.length} file${files.length > 1 ? 's' : ''} added and organised under the selected product.`)
        setFiles([])
      }
      setValue('title', '')
      setValue('tags', '')
      setValue('description', '')
      await load()
    } catch (err) {
      setError(getErrorMessage(err, isVideoLink ? 'Video link failed' : 'Upload failed'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (item: ManagedResource) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return
    setBusy(true)
    setError('')
    try {
      await deleteManagedResource(item)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Delete failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-8 py-6 max-w-[1400px] min-h-full">
      <div className="mb-6">
        <h1 className="font-display text-[22px] font-bold text-[var(--ink)] tracking-tight">Related Products & Files</h1>
        <p className="text-[13px] text-[var(--ink-45)] mt-1">Organised file uploads with React Hook Form + Yup validation.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[390px_minmax(0,1fr)] gap-6 items-start">
        <form onSubmit={handleSubmit(onSave)} className="bg-white border border-[var(--line-soft)] rounded-2xl p-5 sticky top-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[14px]">Add files</h2>
            <span className="text-[10px] font-mono text-[var(--ink-45)]">LIBRARY</span>
          </div>

          <div className="space-y-3">
            <label className="block text-[12px] font-medium">
              Related Product
              <select
                {...register('productId')}
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-[var(--line-soft)] bg-white outline-none"
              >
                <option value={SHESHI_ID}>Sheshi</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>

            <label className="block text-[12px] font-medium">
              File Type
              <select
                {...register('type')}
                onChange={e => {
                  const next = e.target.value as ResourceType
                  setValue('type', next)
                  if (next !== 'video') setVideoMode('upload')
                }}
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-[var(--line-soft)] bg-white outline-none"
              >
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>

            {currentType === 'video' && (
              <>
                <div>
                  <div className="text-[12px] font-medium mb-1.5">Video Source</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setVideoMode('upload')}
                      className={`rounded-lg border px-3 py-2 text-[11px] font-semibold transition-colors ${videoMode === 'upload' ? 'border-[var(--primary)] bg-[var(--canvas-deep)] text-[var(--primary)]' : 'border-[var(--line-soft)] bg-white'}`}
                    >
                      Upload video
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoMode('link')}
                      className={`rounded-lg border px-3 py-2 text-[11px] font-semibold transition-colors ${videoMode === 'link' ? 'border-[var(--primary)] bg-[var(--canvas-deep)] text-[var(--primary)]' : 'border-[var(--line-soft)] bg-white'}`}
                    >
                      Add video link
                    </button>
                  </div>
                </div>

                <label className="block text-[12px] font-medium">
                  Display Name
                  <input
                    {...register('title')}
                    placeholder="Auto-filled for one file"
                    className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-[var(--line-soft)] outline-none"
                  />
                </label>
              </>
            )}

            <label className="block text-[12px] font-medium">
              Tags
              <input
                {...register('tags')}
                placeholder="logo, sales, 2026"
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-[var(--line-soft)] outline-none"
              />
            </label>

            <label className="block text-[12px] font-medium">
              Description
              <textarea
                {...register('description')}
                rows={2}
                placeholder="Optional context"
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-[var(--line-soft)] outline-none resize-none"
              />
            </label>

            {currentType === 'video' && videoMode === 'link' ? (
              <label className="block text-[12px] font-medium">
                Video URL
                <input
                  type="url"
                  {...register('videoUrl')}
                  placeholder="https://youtube.com/... or any video URL"
                  className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-[var(--line-soft)] outline-none"
                />
              </label>
            ) : (
              <label className="block rounded-xl border-2 border-dashed border-[var(--line)] hover:border-[var(--primary)] transition-colors p-5 text-center cursor-pointer bg-[var(--canvas)]">
                <input
                  type="file"
                  multiple
                  accept={currentType === 'video' ? 'video/*' : undefined}
                  onChange={pickFiles}
                  className="hidden"
                />
                <div className="text-[13px] font-semibold">{currentType === 'video' ? 'Choose video' : 'Choose files'}</div>
                <div className="text-[11px] text-[var(--ink-45)] mt-1">{currentType === 'video' ? 'Select a video file to upload' : 'You can select multiple files at once'}</div>
              </label>
            )}

            {files.length > 0 && (
              <div className="rounded-lg bg-[var(--canvas)] border border-[var(--line-soft)] divide-y divide-[var(--line-soft)]">
                {files.map(file => (
                  <div key={`${file.name}-${file.size}`} className="px-3 py-2 text-[11px] flex justify-between gap-3">
                    <span className="truncate">{file.name}</span>
                    <span className="text-[var(--ink-45)] flex-shrink-0">{(file.size / 1024 / 1024).toFixed(file.size > 10 * 1024 * 1024 ? 0 : 1)} MB</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="mt-3 text-[12px] text-red-600 break-words">⚠️ {error}</div>}
          {notice && <div className="mt-3 text-[12px] text-green-700">✅ {notice}</div>}

          <button
            disabled={busy || (currentType === 'video' && videoMode === 'link' ? !currentVideoUrl.trim() : !files.length)}
            className="mt-5 w-full px-4 py-2.5 rounded-lg bg-[var(--primary)] text-white text-[12px] font-semibold disabled:opacity-40"
          >
            {busy ? (currentType === 'video' && videoMode === 'link' ? 'Adding link…' : 'Uploading…') : currentType === 'video' && videoMode === 'link' ? 'Add Video Link' : `Add ${files.length || ''} File${files.length === 1 ? '' : 's'}`}
          </button>
        </form>

        <div className="space-y-5">
          {grouped.map(({ product, items: productItems }) => (
            <section key={product.id} className="bg-white border border-[var(--line-soft)] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--line-soft)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[12px]" style={{ background: product.light, color: product.color }}>
                    {product.name[0]}
                  </div>
                  <div>
                    <h2 className="font-semibold text-[14px]">{product.name}</h2>
                    <p className="text-[11px] text-[var(--ink-45)]">{productItems.length} managed file{productItems.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full" style={{ background: product.color }} />
              </div>

              {productItems.length === 0 ? (
                <div className="px-5 py-7 text-[12px] text-[var(--ink-45)]">No files added yet.</div>
              ) : (
                <div className="divide-y divide-[var(--line-soft)]">
                  {productItems.map(item => (
                    <div key={item.id} className="px-5 py-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[var(--canvas-deep)] flex items-center justify-center text-[11px] font-bold text-[var(--ink-45)]">
                        {item.fileFormat || 'FILE'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-semibold truncate">{item.title}</div>
                        <div className="text-[11px] text-[var(--ink-45)] mt-0.5">
                          {item.type} · {item.fileSize || '—'}{item.tags?.length ? ` · ${item.tags.join(', ')}` : ''}
                        </div>
                      </div>
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-[var(--primary)]">Open</a>
                      <button disabled={busy} onClick={() => remove(item)} className="text-[11px] font-semibold text-red-600 disabled:opacity-40">Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}