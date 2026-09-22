import React, { useEffect, useState } from 'react'
import { getMyProfile, getRegisteredAccounts, type VaultProfile } from './authApi'
import type { UserRole } from './types'
import ResetUserPasswordModal from './components/ResetUserPasswordModal'
import { deleteUserProfile, getAllProfiles, updateUserRole, updateUserStatus } from './userManagementApi'

const roleLabel = (role: UserRole) =>
  role === 'admin' ? 'Admin' : role === 'advanced' || role === 'teammate' ? 'Advanced User' : 'Standard User'

const isAdvanced = (role: UserRole) => role === 'advanced' || role === 'teammate'

function AdvancedBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[9.5px] font-mono font-bold uppercase tracking-wider text-amber-400">
      ADVANCED
    </span>
  )
}

export default function AdminUsers() {
  const [users, setUsers] = useState<VaultProfile[]>([])
  const [currentUser, setCurrentUser] = useState<VaultProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedUserForReset, setSelectedUserForReset] = useState<VaultProfile | null>(null)
  const [selectedUser, setSelectedUser] = useState<VaultProfile | null>(null)

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      setUsers(await getAllProfiles())
      getRegisteredAccounts()
    } catch (e: any) {
      setError(e?.message || 'Failed to load user directory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getMyProfile().then(setCurrentUser)
    loadUsers()
  }, [])

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id)
    setError(null)
    try {
      await fn()
      await loadUsers()
    } catch (e: any) {
      setError(e?.message || 'Action update failed')
    } finally {
      setBusyId(null)
    }
  }

  const isSelf = (u: VaultProfile) =>
    !!currentUser && (u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase())

  const changeRole = async (u: VaultProfile, role: UserRole) => {
    await run(u.id, async () => {
      await updateUserRole(u.id, role, u.email)
      setNotice(`${u.full_name || u.email} access role updated to ${roleLabel(role)}.`)
      setSelectedUser({ ...u, role })
    })
  }

  const approve = (u: VaultProfile) =>
    run(u.id, async () => {
      await updateUserStatus(u.id, 'approved', u.email)
      setNotice(`Approved access for ${u.full_name || u.email}.`)
      setSelectedUser({ ...u, status: 'approved' })
    })

  const reject = (u: VaultProfile) =>
    run(u.id, async () => {
      await updateUserStatus(u.id, 'rejected', u.email)
      setNotice(`Rejected access for ${u.full_name || u.email}.`)
      setSelectedUser({ ...u, status: 'rejected' })
    })

  const remove = (u: VaultProfile) => {
    if (window.confirm(`Permanently remove member ${u.full_name || u.email}?`))
      run(u.id, async () => {
        await deleteUserProfile(u.id, u.email)
        setNotice(`Removed ${u.full_name || u.email}.`)
        setSelectedUser(null)
      })
  }

  if (loading)
    return (
      <div className="p-16 text-center text-[13px] font-mono text-[var(--ink-45)]">
        Synchronizing member credentials & authorizations…
      </div>
    )

  return (
    <div className="flex-1 self-stretch w-full overflow-y-auto bg-[var(--canvas)]">
      <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-6">
        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
          <div>
            <div className="badge-pill mb-1">
              <span className="pulse-dot bg-blue-500" />
              DIRECTORY & AUTHORIZATION
            </div>
            <h1 className="font-display text-[24px] font-extrabold tracking-tight heading-gradient">
              Member Directory & Access Roles
            </h1>
            <p className="text-[13px] text-[var(--ink-45)] mt-0.5">
              Click any team member to view permissions, adjust roles, or approve membership.
            </p>
          </div>
          <button
            onClick={loadUsers}
            className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] hover:bg-[var(--surface-2)] text-[12px] font-semibold text-[var(--ink)] cursor-pointer transition-colors"
          >
            Refresh Directory
          </button>
        </div>

        {notice && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[12.5px] flex items-center gap-2 font-mono">
            <span>✓</span>
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-[12.5px] flex items-center gap-2 font-mono">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* 21st.dev Members Table */}
        <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-2xl overflow-hidden backdrop-blur-md shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[var(--surface-2)] border-b border-[var(--border)] text-[11px] font-mono text-[var(--ink-45)] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Member Name</th>
                  <th className="px-5 py-3.5">Corporate Email</th>
                  <th className="px-5 py-3.5">Role Level</th>
                  <th className="px-5 py-3.5">Approval Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[12.5px]">
                {users.map((u) => {
                  const self = isSelf(u)
                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className="cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
                    >
                      <td className="px-5 py-4 font-semibold text-[var(--ink)]">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span>{u.full_name || 'Member'}</span>
                          {self && (
                            <span className="badge-pill bg-blue-500/20 text-blue-400 border-blue-500/30 text-[9px] py-0 px-1.5 font-bold">
                              YOU
                            </span>
                          )}
                          {isAdvanced(u.role) && <AdvancedBadge />}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-[12px] text-[var(--ink-70)]">
                        {u.email}
                      </td>
                      <td className="px-5 py-4">
                        <span className="badge-pill text-[10px] font-semibold">
                          {roleLabel(u.role)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                            u.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : u.status === 'rejected'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background:
                                u.status === 'approved' ? '#10b981' : u.status === 'rejected' ? '#ef4444' : '#f59e0b',
                            }}
                          />
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 21st.dev Member Details Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-[var(--paper)] border border-[var(--border)] shadow-2xl p-7 max-h-[90vh] overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-[var(--border)]">
              <div>
                <h2 className="text-lg font-bold text-[var(--ink)] font-display">Member Access Dossier</h2>
                <p className="text-[12px] text-[var(--ink-45)] mt-0.5">Manage permissions and corporate credentials.</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-xl text-[var(--ink-45)] hover:text-[var(--ink)] cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-sm font-mono">
              <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
                <div className="text-[10px] uppercase tracking-wider text-[var(--ink-45)] font-bold">Member Name</div>
                <div className="mt-1 flex items-center gap-2 flex-wrap font-sans">
                  <span className="font-bold text-base text-[var(--ink)]">{selectedUser.full_name || 'Member'}</span>
                  {isAdvanced(selectedUser.role) && <AdvancedBadge />}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
                <div className="text-[10px] uppercase tracking-wider text-[var(--ink-45)] font-bold">Email Address</div>
                <div className="text-[13px] text-[var(--ink)] mt-1 font-mono">{selectedUser.email}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--ink-45)] font-bold">Status</div>
                  <div className="font-bold mt-1 text-[var(--ink)] capitalize font-sans">{selectedUser.status}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--ink-45)] font-bold">Current Role</div>
                  <div className="font-bold mt-1 text-[var(--ink)] font-sans">{roleLabel(selectedUser.role)}</div>
                </div>
              </div>
            </div>

            {!isSelf(selectedUser) && selectedUser.status === 'approved' ? (
              <div className="pt-4 border-t border-[var(--border)] space-y-2">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--ink-45)]">
                  Access Authorization
                </div>
                <select
                  value={isAdvanced(selectedUser.role) ? 'advanced' : 'standard'}
                  disabled={busyId === selectedUser.id}
                  onChange={(e) => changeRole(selectedUser, e.target.value as UserRole)}
                  className="w-full rounded-xl border border-[var(--border)] px-3.5 py-2.5 bg-[var(--surface)] text-xs text-[var(--ink)] outline-none cursor-pointer"
                >
                  <option value="standard">Standard User — View & Download Access</option>
                  <option value="advanced">Advanced User — View, Download & Asset Upload Access</option>
                </select>
                <p className="text-[11px] text-[var(--ink-45)]">
                  Elevates this member to upload collateral directly to products and events.
                </p>
              </div>
            ) : !isSelf(selectedUser) ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[12px] text-amber-300">
                Approve this member first to enable role modifications.
              </div>
            ) : null}

            <div className="pt-4 border-t border-[var(--border)] space-y-2.5">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--ink-45)]">
                Account Actions
              </div>
              <div className="flex flex-wrap gap-2">
                {!isSelf(selectedUser) && selectedUser.status !== 'approved' && (
                  <button
                    disabled={busyId === selectedUser.id}
                    onClick={() => approve(selectedUser)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 cursor-pointer transition-colors"
                  >
                    Approve Member
                  </button>
                )}
                {!isSelf(selectedUser) && selectedUser.status !== 'rejected' && (
                  <button
                    disabled={busyId === selectedUser.id}
                    onClick={() => reject(selectedUser)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 cursor-pointer transition-colors"
                  >
                    Reject Access
                  </button>
                )}
                <button
                  onClick={() => setSelectedUserForReset(selectedUser)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--ink)] cursor-pointer transition-colors"
                >
                  Reset Password
                </button>
                {!isSelf(selectedUser) && (
                  <button
                    disabled={busyId === selectedUser.id}
                    onClick={() => remove(selectedUser)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-300 bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 cursor-pointer transition-colors"
                  >
                    Delete Account
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--border)]">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--ink-70)] hover:bg-[var(--surface-2)] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedUserForReset && (
        <ResetUserPasswordModal
          user={selectedUserForReset}
          onClose={() => setSelectedUserForReset(null)}
          onSuccess={() => {
            setNotice(`Password reset for ${selectedUserForReset.full_name || selectedUserForReset.email}.`)
            setSelectedUserForReset(null)
            loadUsers()
          }}
        />
      )}
    </div>
  )
}
