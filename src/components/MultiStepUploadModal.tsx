import React, { ChangeEvent, useState } from 'react'
import { products } from '../data'
import type { ContentStatus, ResourceType, VideoCategory } from '../types'
import {
  checkDuplicateResource,
  replaceManagedResourceFile,
  uploadResource,
  getErrorMessage,
  type ManagedResource,
} from '../resourcesApi'

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
    setFiles((prev) => prev.filter((_, i) => i !== idx))
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
        const tags = tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
        let current = 0

        for (const file of files) {
          current++
          setProgressMsg(`Uploading file ${current} of ${count}: ${file.name}...`)
          await uploadResource(
            {
              title: file.name.replace(/\.[^.]+$/, ''),
              description: description.trim() || null,
              type,
              productId,
              tags,
              videoCategory: type === 'video' ? videoCategory : undefined,
              contentStatus,
              version: versionInput,
            },
            file
          )
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
      className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) resetAndClose()
      }}
    >
      <div className="bg-[var(--paper)] border border-[var(--border-2)] rounded-3xl w-full max-w-2xl shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col text-[var(--ink)] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-7 py-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-card)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-[var(--primary)] flex items-center justify-center font-bold border border-orange-500/20">
              <UploadCloudIcon />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[var(--ink)] font-display">Guided Asset Publishing</h2>
              <p className="text-[11.5px] text-[var(--ink-45)]">
                Step {step} of 4: Standardize, tag, and publish collateral
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={resetAndClose}
            className="w-8 h-8 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--ink-70)] flex items-center justify-center transition-colors cursor-pointer border border-[var(--border)]"
          >
            <CloseCrossIcon />
          </button>
        </div>

        {/* Step Progress Stepper */}
        <div className="flex border-b border-[var(--border)] bg-[var(--canvas-deep)]">
          {[
            { num: 1, label: '1. Select Files' },
            { num: 2, label: '2. Product Suite' },
            { num: 3, label: '3. Metadata' },
            { num: 4, label: '4. Verification' },
          ].map((s) => (
            <div
              key={s.num}
              className={`flex-1 py-2.5 px-3 text-[11px] font-mono font-semibold text-center border-b-2 transition-all ${
                step === s.num
                  ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary-soft)]'
                  : step > s.num
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-[var(--ink-30)]'
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>

        <div className="p-7 space-y-5 flex-1 min-h-[300px]">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-[12px] font-mono">
              ⚠️ {error}
            </div>
          )}

          {/* STEP 1: Select Files */}
          {step === 1 && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-all rounded-3xl p-9 text-center cursor-pointer block group">
                <input type="file" multiple onChange={handlePickFiles} className="hidden" />
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-[var(--primary)] flex items-center justify-center mx-auto mb-3.5 border border-orange-500/20 group-hover:scale-110 transition-transform">
                  <UploadCloudIcon />
                </div>
                <div className="text-[15px] font-bold text-[var(--ink)] font-display">
                  Click or drag files into dropzone
                </div>
                <p className="text-[12px] text-[var(--ink-45)] mt-1 font-mono">
                  Supported formats: PPTX, PDF, MP4, PNG, SVG, DOCX
                </p>
              </label>

              {files.length > 0 && (
                <div className="space-y-2 bg-[var(--surface-2)] p-4 rounded-2xl border border-[var(--border)]">
                  <div className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[var(--ink-45)] flex justify-between">
                    <span>Ready in Queue ({files.length})</span>
                    <button type="button" onClick={() => setFiles([])} className="text-red-400 hover:underline cursor-pointer">
                      Clear Queue
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {files.map((f, i) => (
                      <div
                        key={`${f.name}-${f.size}`}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[12px]"
                      >
                        <div className="min-w-0 truncate">
                          <span className="font-semibold text-[var(--ink)] block truncate">{f.name}</span>
                          <span className="text-[10px] font-mono text-[var(--ink-45)]">{formatBytes(f.size)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(i)}
                          className="w-5 h-5 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center justify-center font-bold cursor-pointer"
                        >
                          ×
                        </button>
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
              <label className="block text-[12px] font-semibold text-[var(--ink-70)]">
                Target Product Division
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-xs outline-none"
                >
                  <option value="sheshi">Sheshi (Company-Wide Hub)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-[12px] font-semibold text-[var(--ink-70)]">
                  Resource Classification
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ResourceType)}
                    className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-xs outline-none"
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t[0].toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-[12px] font-semibold text-[var(--ink-70)]">
                  Governance Status
                  <select
                    value={contentStatus}
                    onChange={(e) => setContentStatus(e.target.value as ContentStatus)}
                    className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-xs outline-none font-semibold"
                  >
                    <option value="Active">Active</option>
                    <option value="Official">Official ✓</option>
                    <option value="Archived">Archived</option>
                    <option value="Deprecated">Deprecated ⚠️</option>
                  </select>
                </label>
              </div>

              {type === 'video' && (
                <label className="block text-[12px] font-semibold text-[var(--ink-70)]">
                  Video Category
                  <select
                    value={videoCategory}
                    onChange={(e) => setVideoCategory(e.target.value as VideoCategory)}
                    className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-xs outline-none"
                  >
                    {VIDEO_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          {/* STEP 3: Details & Tags */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <label className="col-span-2 block text-[12px] font-semibold text-[var(--ink-70)]">
                  Tags (comma separated)
                  <input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. Story, Event, Brand, 2026"
                    className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-xs outline-none"
                  />
                </label>

                <label className="block text-[12px] font-semibold text-[var(--ink-70)]">
                  Version
                  <input
                    value={versionInput}
                    onChange={(e) => setVersionInput(e.target.value)}
                    placeholder="v1.0"
                    className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-xs font-mono font-semibold outline-none"
                  />
                </label>
              </div>

              <label className="block text-[12px] font-semibold text-[var(--ink-70)]">
                Description & Notes
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Provide context or guidance for team members..."
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-xs outline-none resize-y"
                />
              </label>
            </div>
          )}

          {/* STEP 4: Review & Duplicate Detection */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-[14.5px] font-bold text-[var(--ink)] font-display">Review Publishing Parameters</h3>
              <div className="bg-[var(--surface-2)] p-4 rounded-2xl border border-[var(--border)] space-y-2 text-[12.5px] font-mono">
                <div>
                  Batch Size: <strong className="text-[var(--ink)]">{files.length} file{files.length === 1 ? '' : 's'}</strong>
                </div>
                <div>
                  Target Division: <strong className="text-[var(--primary)] uppercase">{productId}</strong>
                </div>
                <div>
                  Type & Governance: <strong className="text-[var(--ink)]">{type} · {contentStatus} ({versionInput})</strong>
                </div>
              </div>

              {duplicateMatch && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-2 text-[12px]">
                  <div className="font-bold flex items-center gap-2">⚠️ Duplicate Asset Match Detected</div>
                  <div>
                    An existing file <strong>"{duplicateMatch.title}"</strong> ({duplicateMatch.version || 'v1.0'}) matches your upload.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Uploading Progress */}
          {step === 5 && (
            <div className="py-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-3 border-[var(--primary)] border-t-transparent animate-spin mx-auto" />
              <div className="text-[14px] font-bold text-[var(--ink)] font-mono">{progressMsg}</div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        {step < 5 && (
          <div className="px-7 py-4 border-t border-[var(--border)] bg-[var(--surface-card)] flex items-center justify-between">
            <button
              type="button"
              disabled={step === 1 || busy}
              onClick={() => setStep((prev) => (prev - 1) as any)}
              className="px-4 py-2 rounded-xl border border-[var(--border)] text-[12px] font-semibold text-[var(--ink-70)] hover:bg-[var(--surface-2)] disabled:opacity-30 cursor-pointer"
            >
              ← Back
            </button>

            {step < 3 ? (
              <button
                type="button"
                disabled={files.length === 0}
                onClick={() => setStep((prev) => (prev + 1) as any)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-[12px] font-semibold disabled:opacity-40 cursor-pointer shadow-md shadow-orange-500/20"
              >
                Next →
              </button>
            ) : step === 3 ? (
              <button
                type="button"
                onClick={handleNextToReview}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-[12px] font-semibold cursor-pointer shadow-md shadow-orange-500/20"
              >
                Review Upload →
              </button>
            ) : (
              <div className="flex gap-2.5">
                {duplicateMatch && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => executeUpload(true)}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-[12px] font-semibold cursor-pointer shadow-sm"
                  >
                    Replace Existing
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => executeUpload(false)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-[12px] font-semibold cursor-pointer shadow-md shadow-orange-500/20"
                >
                  Publish Asset{files.length === 1 ? '' : 's'} ({files.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
