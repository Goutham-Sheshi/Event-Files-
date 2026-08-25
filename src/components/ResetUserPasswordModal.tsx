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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-2xl border border-[var(--line-soft)] overflow-hidden flex flex-col p-7 relative">
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[var(--canvas-deep)] hover:bg-[var(--line-soft)] text-[var(--ink-45)] hover:text-[var(--ink)] flex items-center justify-center font-bold text-sm transition-colors"
        >
          ✕
        </button>

        <div className="mb-5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-lg mb-3">
            🔑
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight text-[var(--ink)]">
            Reset Password for User
          </h2>
          <p className="text-[12.5px] text-[var(--ink-45)] mt-1">
            Setting new password for <strong className="text-[var(--ink)]">{user.full_name || user.email}</strong> ({user.email}).
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12.5px] font-medium animate-shake">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[var(--ink-70)] mb-1">
              New Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showNewPassword ? 'text' : 'password'}
                {...register('newPassword')}
                placeholder="••••••••"
                className={`w-full px-4 py-3 pr-12 rounded-xl border bg-[var(--canvas-deep)] outline-none text-[13px] transition-colors ${errors.newPassword ? 'border-red-500 focus:border-red-500' : 'border-[var(--line)] focus:border-[var(--primary)]'}`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3.5 text-[var(--ink-45)] hover:text-[var(--ink)] p-1 transition-colors cursor-pointer"
              >
                {showNewPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-[11.5px] text-red-600 font-medium">
                ⚠️ {errors.newPassword.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[var(--ink-70)] mb-1">
              Confirm Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                placeholder="••••••••"
                className={`w-full px-4 py-3 pr-12 rounded-xl border bg-[var(--canvas-deep)] outline-none text-[13px] transition-colors ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-[var(--line)] focus:border-[var(--primary)]'}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3.5 text-[var(--ink-45)] hover:text-[var(--ink)] p-1 transition-colors cursor-pointer"
              >
                {showConfirmPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-[11.5px] text-red-600 font-medium">
                ⚠️ {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[var(--line-soft)] text-[12.5px] font-semibold hover:bg-[var(--canvas-deep)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:opacity-95 text-white font-semibold text-[12.5px] shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Updating...' : 'Set User Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
