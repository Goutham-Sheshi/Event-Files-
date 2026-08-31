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
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-white border border-[var(--line-soft)] shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--ink)]">Invite Users</h2>
            <p className="text-[12px] text-[var(--ink-45)] mt-1">Share this link with a Sheshi teammate. It opens the registration page directly.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-xl text-[var(--ink-45)]">×</button>
        </div>

        <div className="mt-6">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-45)] mb-2">Registration Link</label>
          <div className="flex gap-2">
            <input readOnly value={inviteUrl} onFocus={e => e.currentTarget.select()} className="min-w-0 flex-1 rounded-xl border border-[var(--line-soft)] bg-[var(--canvas)] px-3 py-3 text-[12px] font-mono text-[var(--ink)] outline-none" />
            <button onClick={copyLink} className="shrink-0 rounded-xl bg-[var(--primary)] px-4 py-3 text-[12px] font-semibold text-white hover:opacity-90">{copied ? 'Copied' : 'Copy Link'}</button>
          </div>
          <p className="text-[11px] text-[var(--ink-45)] mt-2">New registrations remain pending until an admin approves them and assigns Standard User or Advanced User access.</p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => window.open(inviteUrl, '_blank', 'noopener,noreferrer')} className="px-4 py-2.5 rounded-lg border border-[var(--line-soft)] text-[12px] font-semibold">Open Registration</button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-[var(--line-soft)] text-[12px] font-semibold">Done</button>
        </div>
      </div>
    </div>
  )
}
