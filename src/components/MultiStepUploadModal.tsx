import React, { ChangeEvent, useState } from 'react'
import { products } from '../data'
import type { ContentStatus, ResourceType, VideoCategory } from '../types'
import { checkDuplicateResource, replaceManagedResourceFile, uploadResource, getErrorMessage, type ManagedResource } from '../resourcesApi'

interface MultiStepUploadModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onUploadComplete: () => void
}

const TYPES: ResourceType[] = ['logo', 'brochure', 'video', 'document', 'other']
const VIDEO_CATEGORIES: VideoCategory[] = ['Story', 'Podcast', 'Product', 'People', 'Event', 'Brand', 'Other']

function CloseCrossIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function UploadCloudIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19H9a7 7 0 0 1-6.9-6C1.4 8 5 4 9.5 4c1.2 0 2.3.3 3.3.9C14 2.1 16.8 0 20 0c3.9 0 7 3.1 7 7 0 .5-.1 1-.2 1.5A7 7 0 0 1 17.5 19z" />
      <polyline points="12 12 12 17" />
      <polyline points="9 14 12 11 15 14" />
    </svg>
  )
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let val = bytes / 1024
  let idx = 0
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024
    idx++
  }
  return `${val.toFixed(val >= 10 ? 0 : 1)} ${units[idx]}`
}

export default function MultiStepUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
}: MultiStepUploadModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [files, setFiles] = useState<File[]>([])
  const [productId, setProductId] = useState('sheshi')
  const [type, setType] = useState<ResourceType>('document')
  const [videoCategory, setVideoCategory] = useState<VideoCategory>('Story')
  const [contentStatus, setContentStatus] = useState<ContentStatus>('Active')
  const [versionInput, setVersionInput] = useState('v1.0')
  const [description, setDescription] = useState('')
  const [tagsInput, setTagsInput] = useState('')

  const [duplicateMatch, setDuplicateMatch] = useState<ManagedResource | null>(null)
  const [busy, setBusy] = useState(false)
  const [progressMsg, setProgressMsg] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handlePickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleRemoveFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const resetAndClose = () => {
    setStep(1)
    setFiles([])
    setDescription('')
    setTagsInput('')
    setError('')
    setProgressMsg('')
    setDuplicateMatch(null)
    onClose()
  }

  const handleNextToReview = async () => {
    setError('')
    if (files.length === 1) {
      const target = files[0]
      const duplicate = await checkDuplicateResource(target.name, target.size, target.name.replace(/\.[^.]+$/, ''))
      if (duplicate) {
        setDuplicateMatch(duplicate)
      } else {
        setDuplicateMatch(null)
      }
    } else {
      setDuplicateMatch(null)
    }
    setStep(4)
  }

  const executeUpload = async (replaceExisting?: boolean) => {
    setBusy(true)
    setError('')
    setStep(5)

    try {
      if (replaceExisting && duplicateMatch && files.length === 1) {
        setProgressMsg(`Replacing "${duplicateMatch.title}" with new file version...`)
        await replaceManagedResourceFile(duplicateMatch, files[0])
      } else {
        const count = files.length
        const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
        let current = 0

        for (const file of files) {
          current++
          setProgressMsg(`Uploading file ${current} of ${count}: ${file.name}...`)
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
      }

      onUploadComplete()
      window.dispatchEvent(new Event('vault-resources-changed'))
      setTimeout(() => {
        resetAndClose()
      }, 1200)
    } catch (e) {
      setError(getErrorMessage(e, 'Upload failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget && !busy) resetAndClose() }}
    >
      <div className="bg-[#12151e] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#191d29]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center font-bold">
              <UploadCloudIcon />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-white">Guided Asset Uploader</h2>
              <p className="text-[11px] text-slate-400">Step {step} of 4: Organize and publish corporate digital assets</p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={resetAndClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <CloseCrossIcon />
          </button>
        </div>

        {/* Step Progress Stepper */}
        <div className="flex border-b border-white/5 bg-[#0e1017]">
          {[
            { num: 1, label: '1. Select' },
            { num: 2, label: '2. Type' },
            { num: 3, label: '3. Metadata' },
            { num: 4, label: '4. Review' },
          ].map(s => (
            <div
              key={s.num}
              className={`flex-1 py-2 px-3 text-[11px] font-semibold text-center border-b-2 transition-colors ${step === s.num ? 'border-orange-500 text-orange-400 bg-orange-500/5' : step > s.num ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500'}`}
            >
              {s.label}
            </div>
          ))}
        </div>

        <div className="p-6 space-y-5 flex-1 min-h-[300px]">
          {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] font-medium">{error}</div>}

          {/* STEP 1: Select Files */}
          {step === 1 && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-white/15 hover:border-orange-500/50 bg-[#161a26] hover:bg-[#1a1f2e] transition-all rounded-2xl p-8 text-center cursor-pointer block">
                <input type="file" multiple onChange={handlePickFiles} className="hidden" />
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto mb-3">
                  <UploadCloudIcon />
                </div>
                <div className="text-[14px] font-bold text-white">Click or drag & drop files to upload</div>
                <p className="text-[12px] text-slate-400 mt-1">Supports Documents, PDFs, Images, Logos, and Video files</p>
              </label>

              {files.length > 0 && (
                <div className="space-y-2 bg-[#0e1017] p-3 rounded-xl border border-white/5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex justify-between">
                    <span>Selected Files ({files.length})</span>
                    <button type="button" onClick={() => setFiles([])} className="text-red-400 hover:underline">Clear</button>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {files.map((f, i) => (
                      <div key={`${f.name}-${f.size}`} className="flex items-center justify-between p-2 rounded-lg bg-[#191d29] border border-white/5 text-[12px]">
                        <div className="min-w-0 truncate">
                          <span className="font-semibold text-white block truncate">{f.name}</span>
                          <span className="text-[10px] text-slate-400">{formatBytes(f.size)}</span>
                        </div>
                        <button type="button" onClick={() => handleRemoveFile(i)} className="w-5 h-5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center justify-center font-bold">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Organize Product & Type */}
          {step === 2 && (
            <div className="space-y-4">
              <label className="block text-[12px] font-semibold text-slate-300">
                Target Product Hub
                <select value={productId} onChange={e => setProductId(e.target.value)} className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#161a26] text-white">
                  <option value="sheshi">Sheshi (Company-Wide)</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-[12px] font-semibold text-slate-300">
                  Resource Type
                  <select value={type} onChange={e => setType(e.target.value as ResourceType)} className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#161a26] text-white">
                    {TYPES.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </label>

                <label className="block text-[12px] font-semibold text-slate-300">
                  Content Governance Status
                  <select value={contentStatus} onChange={e => setContentStatus(e.target.value as ContentStatus)} className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#161a26] text-white font-semibold">
                    <option value="Active">Active</option>
                    <option value="Official">Official ✓</option>
                    <option value="Archived">Archived</option>
                    <option value="Deprecated">Deprecated ⚠️</option>
                  </select>
                </label>
              </div>

              {type === 'video' && (
                <label className="block text-[12px] font-semibold text-slate-300">
                  Video Category
                  <select value={videoCategory} onChange={e => setVideoCategory(e.target.value as VideoCategory)} className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#161a26] text-white">
                    {VIDEO_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}

          {/* STEP 3: Details & Tags */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <label className="col-span-2 block text-[12px] font-semibold text-slate-300">
                  Tags (comma separated)
                  <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="e.g. Story, Event, Brand, 2026" className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#161a26] text-white" />
                </label>

                <label className="block text-[12px] font-semibold text-slate-300">
                  Version
                  <input value={versionInput} onChange={e => setVersionInput(e.target.value)} placeholder="v1.0" className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#161a26] text-white font-mono font-semibold" />
                </label>
              </div>

              <label className="block text-[12px] font-semibold text-slate-300">
                Description & Notes
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Add context or notes for team members..." className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#161a26] text-white resize-y" />
              </label>
            </div>
          )}

          {/* STEP 4: Review & Duplicate Detection */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-[14px] font-bold text-white">Review Upload Summary</h3>
              <div className="bg-[#0e1017] p-4 rounded-xl border border-white/10 space-y-2 text-[12.5px]">
                <div>Batch Size: <strong className="text-white">{files.length} file{files.length === 1 ? '' : 's'}</strong></div>
                <div>Product Target: <strong className="text-orange-400 uppercase font-mono">{productId}</strong></div>
                <div>Type & Status: <strong className="text-white">{type} · {contentStatus} ({versionInput})</strong></div>
              </div>

              {duplicateMatch && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 space-y-2 text-[12px]">
                  <div className="font-bold flex items-center gap-2">⚠️ Duplicate Asset Match Detected</div>
                  <div>An existing file <strong>"{duplicateMatch.title}"</strong> ({duplicateMatch.version || 'v1.0'}) matches your upload.</div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Uploading Progress */}
          {step === 5 && (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-3 border-orange-500 border-t-transparent animate-spin mx-auto" />
              <div className="text-[14px] font-bold text-white">{progressMsg}</div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        {step < 5 && (
          <div className="px-6 py-4 border-t border-white/10 bg-[#191d29] flex items-center justify-between">
            <button
              type="button"
              disabled={step === 1 || busy}
              onClick={() => setStep(prev => (prev - 1) as any)}
              className="px-4 py-2 rounded-xl border border-white/10 text-[12px] font-semibold text-slate-300 disabled:opacity-30 cursor-pointer"
            >
              ← Back
            </button>

            {step < 3 ? (
              <button
                type="button"
                disabled={files.length === 0}
                onClick={() => setStep(prev => (prev + 1) as any)}
                className="px-5 py-2 rounded-xl bg-orange-500 text-white text-[12px] font-semibold disabled:opacity-40 cursor-pointer"
              >
                Next →
              </button>
            ) : step === 3 ? (
              <button
                type="button"
                onClick={handleNextToReview}
                className="px-5 py-2 rounded-xl bg-orange-500 text-white text-[12px] font-semibold cursor-pointer"
              >
                Review Upload →
              </button>
            ) : (
              <div className="flex gap-2">
                {duplicateMatch && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => executeUpload(true)}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-[12px] font-semibold cursor-pointer"
                  >
                    Replace Existing File
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => executeUpload(false)}
                  className="px-5 py-2 rounded-xl bg-orange-500 text-white text-[12px] font-semibold cursor-pointer"
                >
                  Start Upload ({files.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
