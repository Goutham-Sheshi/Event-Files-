import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { forgotPassword, resetPassword, signIn, signUp } from '../authApi'
import {
  forgotSchema,
  loginSchema,
  registerSchema,
  resetSchema,
  type ForgotFormData,
  type LoginFormData,
  type RegisterFormData,
  type ResetFormData,
} from '../schemas/authSchemas'

export type AuthMode = 'login' | 'register' | 'forgot' | 'reset'

interface AuthModalProps {
  initialMode?: AuthMode
  onSuccess: () => void
  onClose?: () => void
}

export default function AuthModal({ initialMode = 'login', onSuccess, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // React Hook Form for Login
  const loginForm = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  })

  // React Hook Form for Register
  const registerForm = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '' },
    mode: 'onTouched',
  })

  // React Hook Form for Forgot Password
  const forgotForm = useForm<ForgotFormData>({
    resolver: yupResolver(forgotSchema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  })

  // React Hook Form for Reset Password
  const resetForm = useForm<ResetFormData>({
    resolver: yupResolver(resetSchema),
    defaultValues: { password: '' },
    mode: 'onTouched',
  })

  const handleLoginSubmit = async (data: LoginFormData) => {
    setBusy(true)
    setApiError(null)
    setNotice(null)
    try {
      await signIn(data.email, data.password)
      onSuccess()
    } catch (err: any) {
      setApiError(err?.message || 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  const handleRegisterSubmit = async (data: RegisterFormData) => {
    setBusy(true)
    setApiError(null)
    setNotice(null)
    try {
      const res = await signUp(data.email, data.password, data.fullName)
      if (res?.session) {
        onSuccess()
      } else {
        setNotice('Registration submitted successfully! Your account is pending approval by an administrator.')
        setMode('login')
      }
    } catch (err: any) {
      setApiError(err?.message || 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  const handleForgotSubmit = async (data: ForgotFormData) => {
    setBusy(true)
    setApiError(null)
    setNotice(null)
    try {
      await forgotPassword(data.email)
      setNotice(`Password reset initialized for ${data.email}. Please set your new password below.`)
      setMode('reset')
    } catch (err: any) {
      setApiError(err?.message || 'Password reset failed')
    } finally {
      setBusy(false)
    }
  }

  const handleResetSubmit = async (data: ResetFormData) => {
    setBusy(true)
    setApiError(null)
    setNotice(null)
    try {
      await resetPassword(data.password)
      setNotice('Password updated successfully! You can now sign in.')
      setMode('login')
    } catch (err: any) {
      setApiError(err?.message || 'Password update failed')
    } finally {
      setBusy(false)
    }
  }

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setApiError(null)
    setNotice(null)
    loginForm.reset()
    registerForm.reset()
    forgotForm.reset()
    resetForm.reset()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={e => { if (e.target === e.currentTarget && onClose) onClose() }}
    >
      <div className="w-full max-w-[420px] bg-white rounded-3xl shadow-2xl border border-[var(--line-soft)] overflow-hidden flex flex-col p-8 transition-all relative">
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[var(--canvas-deep)] hover:bg-[var(--line-soft)] text-[var(--ink-45)] hover:text-[var(--ink)] flex items-center justify-center font-bold text-sm transition-colors"
          >
            ✕
          </button>
        )}

        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[var(--primary)] to-orange-400 text-white font-bold text-xl flex items-center justify-center mx-auto shadow-md mb-3">
            S
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)]">
            {mode === 'login' && 'Sign in to Sheshi Vault'}
            {mode === 'register' && 'Request Account Access'}
            {mode === 'forgot' && 'Reset your password'}
            {mode === 'reset' && 'Set new password'}
          </h2>
          <p className="text-[13px] text-[var(--ink-45)] mt-1">
            {mode === 'login' && 'Enter your @sheshi.ai credentials to access files & events'}
            {mode === 'register' && 'Create your corporate account with your @sheshi.ai email'}
            {mode === 'forgot' && 'We will send a reset link to your @sheshi.ai email'}
            {mode === 'reset' && 'Type your new password to complete recovery'}
          </p>
        </div>

        {/* Alerts */}
        {apiError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12.5px] font-medium break-words animate-shake">
            ⚠️ {apiError}
          </div>
        )}

        {notice && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12.5px] font-medium break-words animate-fadeIn">
            ✅ {notice}
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[var(--ink-70)] mb-1">
                Email Address
              </label>
              <input
                type="email"
                {...loginForm.register('email')}
                placeholder="name@sheshi.ai"
                className={`w-full px-4 py-3 rounded-xl border bg-[var(--canvas-deep)] outline-none text-[13px] transition-colors ${loginForm.formState.errors.email ? 'border-red-500 focus:border-red-500' : 'border-[var(--line)] focus:border-[var(--primary)]'}`}
              />
              {loginForm.formState.errors.email && (
                <p className="mt-1 text-[11.5px] text-red-600 font-medium">
                  ⚠️ {loginForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[12px] font-semibold text-[var(--ink-70)]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-[11px] font-semibold text-[var(--primary)] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...loginForm.register('password')}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 pr-12 rounded-xl border bg-[var(--canvas-deep)] outline-none text-[13px] transition-colors ${loginForm.formState.errors.password ? 'border-red-500 focus:border-red-500' : 'border-[var(--line)] focus:border-[var(--primary)]'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-[var(--ink-45)] hover:text-[var(--ink)] transition-colors p-1 flex items-center justify-center cursor-pointer"
                >
                  {showPassword ? (
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
              {loginForm.formState.errors.password && (
                <p className="mt-1 text-[11.5px] text-red-600 font-medium">
                  ⚠️ {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 px-4 rounded-xl bg-[var(--primary)] hover:opacity-95 text-white font-semibold text-[13px] shadow-md transition-all disabled:opacity-50 mt-2 cursor-pointer"
            >
              {busy ? 'Processing...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[var(--ink-70)] mb-1">
                Full Name
              </label>
              <input
                type="text"
                {...registerForm.register('fullName')}
                placeholder="e.g. Goutham"
                className={`w-full px-4 py-3 rounded-xl border bg-[var(--canvas-deep)] outline-none text-[13px] transition-colors ${registerForm.formState.errors.fullName ? 'border-red-500 focus:border-red-500' : 'border-[var(--line)] focus:border-[var(--primary)]'}`}
              />
              {registerForm.formState.errors.fullName && (
                <p className="mt-1 text-[11.5px] text-red-600 font-medium">
                  ⚠️ {registerForm.formState.errors.fullName.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[var(--ink-70)] mb-1">
                Email Address
              </label>
              <input
                type="email"
                {...registerForm.register('email')}
                placeholder="name@sheshi.ai"
                className={`w-full px-4 py-3 rounded-xl border bg-[var(--canvas-deep)] outline-none text-[13px] transition-colors ${registerForm.formState.errors.email ? 'border-red-500 focus:border-red-500' : 'border-[var(--line)] focus:border-[var(--primary)]'}`}
              />
              {registerForm.formState.errors.email && (
                <p className="mt-1 text-[11.5px] text-red-600 font-medium">
                  ⚠️ {registerForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[var(--ink-70)] mb-1">
                Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...registerForm.register('password')}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 pr-12 rounded-xl border bg-[var(--canvas-deep)] outline-none text-[13px] transition-colors ${registerForm.formState.errors.password ? 'border-red-500 focus:border-red-500' : 'border-[var(--line)] focus:border-[var(--primary)]'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-[var(--ink-45)] hover:text-[var(--ink)] transition-colors p-1 flex items-center justify-center cursor-pointer"
                >
                  {showPassword ? (
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
              {registerForm.formState.errors.password && (
                <p className="mt-1 text-[11.5px] text-red-600 font-medium">
                  ⚠️ {registerForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 px-4 rounded-xl bg-[var(--primary)] hover:opacity-95 text-white font-semibold text-[13px] shadow-md transition-all disabled:opacity-50 mt-2 cursor-pointer"
            >
              {busy ? 'Processing...' : 'Create Account'}
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {mode === 'forgot' && (
          <form onSubmit={forgotForm.handleSubmit(handleForgotSubmit)} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[var(--ink-70)] mb-1">
                Email Address
              </label>
              <input
                type="email"
                {...forgotForm.register('email')}
                placeholder="name@sheshi.ai"
                className={`w-full px-4 py-3 rounded-xl border bg-[var(--canvas-deep)] outline-none text-[13px] transition-colors ${forgotForm.formState.errors.email ? 'border-red-500 focus:border-red-500' : 'border-[var(--line)] focus:border-[var(--primary)]'}`}
              />
              {forgotForm.formState.errors.email && (
                <p className="mt-1 text-[11.5px] text-red-600 font-medium">
                  ⚠️ {forgotForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 px-4 rounded-xl bg-[var(--primary)] hover:opacity-95 text-white font-semibold text-[13px] shadow-md transition-all disabled:opacity-50 mt-2 cursor-pointer"
            >
              {busy ? 'Processing...' : 'Send Reset Instructions'}
            </button>
          </form>
        )}

        {/* RESET PASSWORD FORM */}
        {mode === 'reset' && (
          <form onSubmit={resetForm.handleSubmit(handleResetSubmit)} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[var(--ink-70)] mb-1">
                New Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...resetForm.register('password')}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 pr-12 rounded-xl border bg-[var(--canvas-deep)] outline-none text-[13px] transition-colors ${resetForm.formState.errors.password ? 'border-red-500 focus:border-red-500' : 'border-[var(--line)] focus:border-[var(--primary)]'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-[var(--ink-45)] hover:text-[var(--ink)] transition-colors p-1 flex items-center justify-center cursor-pointer"
                >
                  {showPassword ? (
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
              {resetForm.formState.errors.password && (
                <p className="mt-1 text-[11.5px] text-red-600 font-medium">
                  ⚠️ {resetForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 px-4 rounded-xl bg-[var(--primary)] hover:opacity-95 text-white font-semibold text-[13px] shadow-md transition-all disabled:opacity-50 mt-2 cursor-pointer"
            >
              {busy ? 'Processing...' : 'Update Password'}
            </button>
          </form>
        )}

        {/* Footer Navigation */}
        <div className="mt-6 pt-4 border-t border-[var(--line-soft)] text-center text-[12px] text-[var(--ink-45)]">
          {mode === 'login' && (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="font-semibold text-[var(--primary)] hover:underline"
              >
                Register / Request access
              </button>
            </span>
          )}

          {mode === 'register' && (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="font-semibold text-[var(--primary)] hover:underline"
              >
                Sign In
              </button>
            </span>
          )}

          {(mode === 'forgot' || mode === 'reset') && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="font-semibold text-[var(--primary)] hover:underline"
            >
              ← Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
