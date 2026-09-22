import { useMemo, useState } from 'react'

export default function InviteUsersModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const inviteUrl = useMemo(() => {
    const url = new URL(window.location.href)
    url.search = '?register=1'
    url.hash = ''
    return url.toString()
  }, [])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-3xl bg-[var(--paper)] border border-[var(--border-2)] shadow-[0_30px_70px_rgba(0,0,0,0.6)] p-7 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle top indicator glow */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500/80 via-indigo-500/80 to-teal-400/80" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono text-[10.5px] font-semibold tracking-wider uppercase mb-2">
              Access Governance
            </div>
            <h2 className="text-xl font-bold font-display tracking-tight text-[var(--ink)]">
              Invite Team Members
            </h2>
            <p className="text-[12.5px] text-[var(--ink-45)] mt-1">
              Share this registration link with your Sheshi teammate to grant them access onboarding.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--ink-45)] hover:text-[var(--ink)] flex items-center justify-center transition-colors border border-[var(--border-1)]"
          >
            ✕
          </button>
        </div>

        <div className="mt-6">
          <label className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-45)] mb-2">
            Registration URL
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-xl border border-[var(--border-2)] bg-[var(--canvas)] px-3.5 py-2.5 text-[12px] font-mono text-[var(--ink)] outline-none focus:border-orange-500/50 transition-colors"
            />
            <button
              onClick={copyLink}
              className="shrink-0 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_4px_12px_rgba(249,115,22,0.25)] transition-all cursor-pointer"
            >
              {copied ? '✓ Copied' : 'Copy Link'}
            </button>
          </div>
          <p className="font-mono text-[11px] text-[var(--ink-45)] mt-2.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Registrations require administrator approval before granting access.
          </p>
        </div>

        <div className="mt-7 pt-4 border-t border-[var(--border-1)] flex justify-end gap-2.5">
          <button
            onClick={() => window.open(inviteUrl, '_blank', 'noopener,noreferrer')}
            className="px-4 py-2 rounded-xl border border-[var(--border-1)] hover:bg-[var(--surface-1)] text-[12px] font-semibold text-[var(--ink)] transition-colors cursor-pointer"
          >
            Open Registration ↗
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[12px] font-semibold text-[var(--ink)] transition-colors cursor-pointer border border-[var(--border-2)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
