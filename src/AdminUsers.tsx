import { FormEvent, useEffect, useState } from 'react'
import { vaultUserAdmin } from './authApi'

type VaultUser = {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'user'
  status: 'pending' | 'approved' | 'rejected'
  must_change_password: boolean
  created_at: string
}

export default function AdminUsers() {
  const [users, setUsers] = useState<VaultUser[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await vaultUserAdmin('list')
      setUsers(data.users || [])
    } catch {
      setMessage('Could not load users.')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function createUser(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setMessage('')
    try {
      await vaultUserAdmin('create', { email, fullName, password })
      setEmail(''); setFullName(''); setPassword('')
      setMessage('User created. They will be required to change the temporary password on first login.')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create user.')
    } finally { setBusy(false) }
  }

  async function updateStatus(userId: string, action: 'approve'|'reject') {
    setBusy(true); setMessage('')
    try {
      await vaultUserAdmin(action, { userId })
      await load()
    } catch {
      setMessage('Could not update the user.')
    } finally { setBusy(false) }
  }

  return <div className="px-8 py-6 max-w-[1200px]">
    <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
      <section className="rounded-2xl border border-[var(--line-soft)] bg-white p-5 h-fit">
        <div className="text-[16px] font-semibold mb-1">Add User</div>
        <p className="text-[12px] text-[var(--ink-45)] mb-5">Create an approved Sheshi Vault user. The temporary password is never stored in your app database.</p>
        <form onSubmit={createUser} className="space-y-3">
          <input required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Full name" className="w-full rounded-lg border px-3 py-2.5 text-[13px]" />
          <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@sheshi.ai" className="w-full rounded-lg border px-3 py-2.5 text-[13px]" />
          <input required type="password" minLength={12} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Temporary password (12+ characters)" className="w-full rounded-lg border px-3 py-2.5 text-[13px]" />
          <button disabled={busy} className="w-full rounded-lg bg-[var(--primary)] text-white py-2.5 text-[12px] font-semibold">{busy?'Working…':'Create User'}</button>
        </form>
        {message&&<p className="text-[11px] mt-3 text-[var(--ink-70)]">{message}</p>}
      </section>

      <section className="rounded-2xl border border-[var(--line-soft)] bg-white overflow-hidden">
        <div className="p-5 border-b border-[var(--line-soft)] flex items-center justify-between gap-3">
          <div><div className="text-[16px] font-semibold">User Requests</div><div className="text-[11px] text-[var(--ink-45)] mt-1">Approve or reject pending access requests.</div></div>
          <button onClick={load} className="text-[11px] font-semibold text-[var(--primary)]">Refresh</button>
        </div>
        {loading?<div className="p-8 text-[13px] text-[var(--ink-45)]">Loading users…</div>:<div className="divide-y divide-[var(--line-soft)]">
          {users.map(user=><div key={user.id} className="p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px]"><div className="text-[13px] font-semibold">{user.full_name||'Unnamed User'}</div><div className="text-[11px] text-[var(--ink-45)] mt-1">{user.email}</div></div>
            <span className="px-2 py-1 rounded-full text-[10px] font-semibold border border-[var(--line-soft)]">{user.role==='admin'?'Admin':'User'}</span>
            <span className="px-2 py-1 rounded-full text-[10px] font-semibold" style={{background:user.status==='approved'?'#E7F6EC':user.status==='pending'?'#FFF3D6':'#FDE8E8',color:user.status==='approved'?'#267343':user.status==='pending'?'#946200':'#B42318'}}>{user.status}</span>
            {user.status==='pending'&&<div className="flex gap-2"><button disabled={busy} onClick={()=>updateStatus(user.id,'approve')} className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-[11px] font-semibold">Approve</button><button disabled={busy} onClick={()=>updateStatus(user.id,'reject')} className="px-3 py-1.5 rounded-lg border border-[var(--line-soft)] text-[11px] font-semibold">Reject</button></div>}
            {user.must_change_password&&<span className="text-[10px] text-[var(--ink-45)]">Password change required</span>}
          </div>)}
          {!users.length&&<div className="p-8 text-[13px] text-[var(--ink-45)]">No users yet.</div>}
        </div>}
      </section>
    </div>
  </div>
}