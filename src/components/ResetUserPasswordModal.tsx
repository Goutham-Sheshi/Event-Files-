import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import type { VaultProfile } from '../authApi'
import { adminResetPasswordSchema, type AdminResetPasswordFormData } from '../schemas/userSchemas'
import { adminResetUserPassword } from '../userManagementApi'

interface ResetUserPasswordModalProps {
  user: VaultProfile
  onClose: () => void
  onSuccess: () => void
}

export default function ResetUserPasswordModal({ user, onClose, onSuccess }: ResetUserPasswordModalProps) {
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<AdminResetPasswordFormData>({
    resolver: yupResolver(adminResetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  })

  const onSubmit = async (data: AdminResetPasswordFormData) => {
    setBusy(true)
    setError(null)
    try {
      await adminResetUserPassword(user.id, user.email, data.newPassword)
      onSuccess()
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password for user')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[460px] bg-[var(--paper)] rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.6)] border border-[var(--border-2)] overflow-hidden flex flex-col p-7 relative">
        {/* Glowing top line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500/80 via-orange-500/80 to-rose-500/80" />

        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-5 right-5 w-8 h-8 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--ink-45)] hover:text-[var(--ink)] flex items-center justify-center border border-[var(--border-1)] text-sm transition-colors"
        >
          ✕
        </button>

        <div className="mb-5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[10.5px] font-semibold tracking-wider uppercase mb-3">
            Credential Governance
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight text-[var(--ink)]">
            Reset Password for Member
          </h2>
          <p className="text-[12.5px] text-[var(--ink-45)] mt-1 leading-relaxed">
            Direct override for <strong className="text-[var(--ink)]">{user.full_name || user.email}</strong> (<span className="font-mono text-[11px] text-orange-400">{user.email}</span>).
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12.5px] font-medium animate-shake flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-70)] mb-1.5">
              New Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showNewPassword ? 'text' : 'password'}
                {...register('newPassword')}
                placeholder="••••••••"
                className={`w-full px-4 py-2.5 pr-12 rounded-xl border bg-[var(--canvas)] outline-none text-[13px] font-mono transition-colors ${errors.newPassword ? 'border-red-500 focus:border-red-500' : 'border-[var(--border-2)] focus:border-orange-500/50'}`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 text-[var(--ink-45)] hover:text-[var(--ink)] p-1 transition-colors cursor-pointer"
              >
                {showNewPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1 font-mono text-[11px] text-red-400 font-medium">
                ⚠️ {errors.newPassword.message}
              </p>
            )}
          </div>

          <div>
            <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-70)] mb-1.5">
              Confirm Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                placeholder="••••••••"
                className={`w-full px-4 py-2.5 pr-12 rounded-xl border bg-[var(--canvas)] outline-none text-[13px] font-mono transition-colors ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-[var(--border-2)] focus:border-orange-500/50'}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 text-[var(--ink-45)] hover:text-[var(--ink)] p-1 transition-colors cursor-pointer"
              >
                {showConfirmPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 font-mono text-[11px] text-red-400 font-medium">
                ⚠️ {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-[var(--border-1)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--border-1)] text-[12px] font-semibold text-[var(--ink-70)] hover:text-[var(--ink)] hover:bg-[var(--surface-1)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-white font-bold text-[12px] tracking-wide shadow-[0_4px_12px_rgba(249,115,22,0.25)] transition-all disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Updating...' : 'Set User Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
