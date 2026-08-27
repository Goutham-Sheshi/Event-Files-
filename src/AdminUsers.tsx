import React, { useEffect, useState } from 'react'
import { getMyProfile, getRegisteredAccounts, type VaultProfile } from './authApi'
import ResetUserPasswordModal from './components/ResetUserPasswordModal'
import { deleteUserProfile, getAllProfiles, updateUserStatus } from './userManagementApi'

export default function AdminUsers() {
  const [users, setUsers] = useState<VaultProfile[]>([])
  const [currentUser, setCurrentUser] = useState<VaultProfile | null>(null)
  const [registeredAccounts, setRegisteredAccounts] = useState<Record<string, any>>({})
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedUserForReset, setSelectedUserForReset] = useState<VaultProfile | null>(null)

  const togglePasswordReveal = (userId: string) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }))
  }

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllProfiles()
      setUsers(data)
      const accounts = getRegisteredAccounts()
      setRegisteredAccounts(accounts)
    } catch (err: any) {
      setError(err?.message || 'Failed to load user list')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getMyProfile().then(setCurrentUser)
    loadUsers()
  }, [])

  const handleApprove = async (user: VaultProfile) => {
    setBusyId(user.id)
    setError(null)
    try {
      await updateUserStatus(user.id, 'approved', user.email)
      setNotice(`User "${user.full_name || user.email}" has been approved.`)
      await loadUsers()
    } catch (err: any) {
      setError(err?.message || 'Failed to approve user')
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async (user: VaultProfile) => {
    setBusyId(user.id)
    setError(null)
    try {
      await updateUserStatus(user.id, 'rejected', user.email)
      setNotice(`User "${user.full_name || user.email}" status changed to rejected.`)
      await loadUsers()
    } catch (err: any) {
      setError(err?.message || 'Failed to reject user')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (user: VaultProfile) => {
    setBusyId(user.id)
    setError(null)
    try {
      await deleteUserProfile(user.id, user.email)
      setNotice(`User "${user.full_name || user.email}" has been deleted.`)
      await loadUsers()
    } catch (err: any) {
      setError(err?.message || 'Failed to delete user')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-[13px] text-[var(--ink-45)]">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin mr-3" />
        Loading user list...
      </div>
    )
  }

  return (
    <div className="flex-1 self-stretch w-full overflow-y-auto">
      <div className="px-8 py-6 max-w-[1400px]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-[22px] font-bold text-[var(--ink)] tracking-tight">
              User Management & Access Control
            </h1>
            <p className="text-[13px] text-[var(--ink-45)] mt-1">
              Admin control panel to review users, approve/reject access, delete accounts, and reset passwords.
            </p>
          </div>
          <button
            onClick={loadUsers}
            className="px-3.5 py-1.5 rounded-lg border border-[var(--line-soft)] bg-white text-[12px] font-semibold text-[var(--ink-70)] hover:bg-[var(--canvas-deep)] transition-colors"
          >
            🔄 Refresh List
          </button>
        </div>

        {/* Banners */}
        {notice && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12.5px] font-medium flex items-center justify-between animate-fadeIn">
            <span>✅ {notice}</span>
            <button onClick={() => setNotice(null)} className="text-emerald-600 font-bold ml-4">✕</button>
          </div>
        )}

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12.5px] font-medium flex items-center justify-between animate-shake">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-red-600 font-bold ml-4">✕</button>
          </div>
        )}

        {/* User Table */}
        <div className="bg-white border border-[var(--line-soft)] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[var(--canvas)] border-b border-[var(--line-soft)] text-[11px] text-[var(--ink-45)] uppercase tracking-wider font-mono">
                <tr>
                  <th className="px-5 py-3.5">User Name</th>
                  <th className="px-5 py-3.5">Email Address</th>
                  <th className="px-5 py-3.5">Password</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line-soft)] text-[12.5px]">
                {users.map(u => {
                  const isBusy = busyId === u.id
                  const isSelf = currentUser && (
                    u.id === currentUser.id ||
                    u.email.toLowerCase() === currentUser.email.toLowerCase()
                  )

                  return (
                    <tr key={u.id} className="hover:bg-[var(--canvas)]/50 transition-colors">
                      <td className="px-5 py-4 font-semibold text-[var(--ink)]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--primary)] to-amber-400 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                            {(u.full_name || u.email)[0].toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1.5">
                              {u.full_name || 'User'}
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                                  You
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[var(--ink-70)] font-mono text-[12px]">
                        {u.email}
                      </td>
                      <td className="px-5 py-4 font-mono text-[12.5px]">
                        {(() => {
                          const accountData = registeredAccounts[u.email.toLowerCase()]
                          const plainPassword = accountData?.password
                          if (!plainPassword) {
                            return <span className="text-[var(--ink-45)] italic">N/A (DB Auth)</span>
                          }
                          const isRevealed = !!revealedPasswords[u.id]
                          return (
                            <div className="flex items-center gap-1.5">
                              <span>{isRevealed ? plainPassword : '••••••••'}</span>
                              <button
                                onClick={() => togglePasswordReveal(u.id)}
                                className="text-[var(--ink-45)] hover:text-[var(--ink-70)] focus:outline-none p-1 cursor-pointer text-[14px]"
                                title={isRevealed ? "Hide password" : "Show password"}
                              >
                                {isRevealed ? '🙈' : '👁️'}
                              </button>
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${u.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : u.status === 'rejected' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {/* Approve Action (Hidden for Self) */}
                          {!isSelf && u.status !== 'approved' && (
                            <button
                              disabled={isBusy}
                              onClick={() => handleApprove(u)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11.5px] border border-emerald-200 transition-colors disabled:opacity-50"
                              title="Approve User"
                            >
                              ✓ Approve
                            </button>
                          )}

                          {/* Reject Action (Hidden for Self) */}
                          {!isSelf && u.status !== 'rejected' && (
                            <button
                              disabled={isBusy}
                              onClick={() => handleReject(u)}
                              className="px-2.5 py-1 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-800 font-semibold text-[11.5px] border border-yellow-200 transition-colors disabled:opacity-50"
                              title="Reject User"
                            >
                              🚫 Reject
                            </button>
                          )}

                          {/* Reset Password Action */}
                          <button
                            disabled={isBusy}
                            onClick={() => setSelectedUserForReset(u)}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11.5px] shadow-xs border border-slate-700 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                            title="Reset User Password"
                          >
                            <span className="text-[12px]">🔑</span>
                            <span className="text-white font-semibold">Reset Password</span>
                          </button>

                          {/* Delete Action (Hidden for Self) */}
                          {!isSelf && (
                            <button
                              disabled={isBusy}
                              onClick={() => handleDelete(u)}
                              className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-[11.5px] border border-red-200 transition-colors disabled:opacity-50"
                              title="Delete User Account"
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="py-14 text-center text-[13px] text-[var(--ink-45)]">
              No registered user profiles found.
            </div>
          )}
        </div>
      </div>

      {/* Reset Password Modal Popup */}
      {selectedUserForReset && (
        <ResetUserPasswordModal
          user={selectedUserForReset}
          onClose={() => setSelectedUserForReset(null)}
          onSuccess={() => {
            setNotice(`Password for user "${selectedUserForReset.full_name || selectedUserForReset.email}" updated successfully.`)
            setSelectedUserForReset(null)
            loadUsers()
          }}
        />
      )}
    </div>
  )
}
