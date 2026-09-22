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

interface AuthScreenProps {
  readonly onSuccess: () => void
  readonly onClose?: () => void
  readonly isOpen?: boolean
  readonly initialMode?: AuthMode
}

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-[12px] font-semibold text-[var(--ink-70)] mb-1.5">{label}</label>
    {children}
    {error && <p className="text-red-400 text-[11px] mt-1 font-mono">{error}</p>}
  </div>
)

const inputClass =
  'w-full px-4 py-3 rounded-xl border bg-[var(--surface-2)] text-[var(--ink)] placeholder-[var(--ink-45)] outline-none text-[13px] border-[var(--border)] focus:border-[var(--primary)] transition-colors'

function AuthLayout({ mode, children, onClose }: { mode: AuthMode; children: React.ReactNode; onClose?: () => void }) {
  const title =
    mode === 'login'
      ? 'Welcome Back'
      : mode === 'register'
      ? 'Request Membership'
      : mode === 'forgot'
      ? 'Reset Credentials'
      : 'Set New Password'
  const subtitle =
    mode === 'login'
      ? 'Enter your corporate credentials to access Sheshi Vault'
      : mode === 'register'
      ? 'Fill in your details below for administrative access review'
      : mode === 'forgot'
      ? 'Enter your corporate email address for password recovery'
      : 'Create a new secure password for your account'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md text-[var(--ink)] overflow-y-auto">
      <div className="w-full max-w-[1000px] min-h-[580px] bg-[var(--paper)] rounded-3xl shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8)] border border-[var(--border-2)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 my-auto relative">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg font-bold transition-colors cursor-pointer"
            title="Close dialog"
          >
            ×
          </button>
        )}
        <div className="lg:col-span-5 p-8 lg:p-10 bg-gradient-to-br from-[#151a26] via-[#0d1017] to-[#090a0f] flex flex-col justify-between border-r border-[var(--border)] relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-60 h-60 rounded-full bg-orange-500/15 filter blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-orange-500/25">
                S
              </div>
              <div>
                <h1 className="font-display font-extrabold text-[16px] text-white">Sheshi Vault</h1>
                <p className="text-[9.5px] font-mono tracking-widest text-[var(--primary)] uppercase font-semibold">
                  Intelligence Hub
                </p>
              </div>
            </div>

            <div className="badge-pill mb-3">
              <span className="pulse-dot bg-orange-500" />
              WEEKLY SSO & SECURITY
            </div>

            <h2 className="font-display text-2xl lg:text-3xl font-extrabold text-white leading-tight">
              Enterprise Collateral & Summit Intelligence
            </h2>
            <p className="text-[13px] text-[var(--ink-45)] mt-4 leading-relaxed">
              Curated repository for verified decks, official brand standards, product recordings, and corporate summits.
            </p>

            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-[11.5px] font-mono text-[var(--ink-70)]">
                <span className="text-emerald-400">✓</span> Weekly Monday Session Verification
              </div>
              <div className="flex items-center gap-2 text-[11.5px] font-mono text-[var(--ink-70)]">
                <span className="text-emerald-400">✓</span> Realtime Summit Dispatcher
              </div>
              <div className="flex items-center gap-2 text-[11.5px] font-mono text-[var(--ink-70)]">
                <span className="text-emerald-400">✓</span> Role-Based Asset Governance
              </div>
            </div>
          </div>
          <div className="text-[11px] text-[var(--ink-30)] font-mono relative z-10 pt-6">
            © 2026 Sheshi AI Inc. · All Rights Reserved
          </div>
        </div>

        <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center bg-[var(--paper)]">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)]">{title}</h2>
          <p className="text-[13px] text-[var(--ink-45)] mt-1 mb-6">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

export default function AuthScreen({ onSuccess, onClose, isOpen = true, initialMode = 'login' }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(() =>
    new URLSearchParams(window.location.search).get('register') === '1' ? 'register' : initialMode
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const login = useForm<LoginFormData>({ resolver: yupResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const register = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  })
  const forgot = useForm<ForgotFormData>({ resolver: yupResolver(forgotSchema), defaultValues: { email: '' } })
  const reset = useForm<ResetFormData>({ resolver: yupResolver(resetSchema), defaultValues: { password: '' } })

  if (isOpen === false) return null

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await fn()
    } catch (e: any) {
      setError(e?.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const switchMode = (m: AuthMode) => {
    setMode(m)
    setError(null)
    setNotice(null)
  }

  const handleFormError = (errors: any) => {
    const firstErrorKey = Object.keys(errors)[0]
    if (firstErrorKey && errors[firstErrorKey]?.message) {
      setError(errors[firstErrorKey].message)
    }
  }

  return (
    <AuthLayout mode={mode} onClose={onClose}>
      {(mode === 'login' || mode === 'register') && (
        <div className="flex p-1 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] w-fit mb-8">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`px-6 py-2 rounded-xl text-[12px] font-semibold cursor-pointer transition-all ${
              mode === 'login' ? 'bg-[var(--primary)] text-white shadow-md shadow-orange-500/20' : 'text-[var(--ink-45)]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`px-6 py-2 rounded-xl text-[12px] font-semibold cursor-pointer transition-all ${
              mode === 'register' ? 'bg-[var(--primary)] text-white shadow-md shadow-orange-500/20' : 'text-[var(--ink-45)]'
            }`}
          >
            Register
          </button>
        </div>
      )}

      {notice && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
          ✓ {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-mono">
          ⚠️ {error}
        </div>
      )}

      {mode === 'login' && (
        <form
          onSubmit={login.handleSubmit(
            (d) =>
              run(async () => {
                await signIn(d.email, d.password)
                onSuccess()
              }),
            handleFormError
          )}
          className="space-y-4"
        >
          <Field label="Corporate Email Address" error={login.formState.errors.email?.message}>
            <input {...login.register('email')} type="email" placeholder="name@sheshi.ai" className={inputClass} />
          </Field>
          <Field label="Security Password" error={login.formState.errors.password?.message}>
            <input {...login.register('password')} type="password" placeholder="••••••••" className={inputClass} />
          </Field>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="text-[var(--primary)] text-xs cursor-pointer hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold transition-all shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer text-sm"
          >
            {busy ? 'Authenticating...' : 'Sign In to Vault'}
          </button>
        </form>
      )}

      {mode === 'register' && (
        <form
          onSubmit={register.handleSubmit(
            (d) =>
              run(async () => {
                const r = await signUp(d.email, d.password, d.fullName)
                if (r?.session) onSuccess()
                else {
                  setNotice('Registration submitted! Your membership is pending administrator review.')
                  setMode('login')
                }
              }),
            handleFormError
          )}
          className="space-y-4"
        >
          <Field label="Full Name" error={register.formState.errors.fullName?.message}>
            <input {...register.register('fullName')} placeholder="e.g. Anand Sharma" className={inputClass} />
          </Field>
          <Field label="Corporate Email Address" error={register.formState.errors.email?.message}>
            <input {...register.register('email')} type="email" placeholder="name@sheshi.ai" className={inputClass} />
          </Field>
          <Field label="Create Password" error={register.formState.errors.password?.message}>
            <input {...register.register('password')} type="password" placeholder="••••••••" className={inputClass} />
          </Field>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold transition-all shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer text-sm"
          >
            {busy ? 'Submitting Request...' : 'Submit Member Registration'}
          </button>
        </form>
      )}

      {mode === 'forgot' && (
        <form
          onSubmit={forgot.handleSubmit(
            (d) =>
              run(async () => {
                await forgotPassword(d.email)
                setNotice(`Password reset initialized for ${d.email}. Please set your new password below.`)
                setMode('reset')
              }),
            handleFormError
          )}
          className="space-y-4"
        >
          <Field label="Email Address" error={forgot.formState.errors.email?.message}>
            <input {...forgot.register('email')} type="email" placeholder="name@sheshi.ai" className={inputClass} />
          </Field>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold transition-all shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer text-sm"
          >
            Send Password Reset Link
          </button>
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="text-[var(--primary)] text-xs cursor-pointer hover:underline block text-center"
          >
            ← Back to Sign In
          </button>
        </form>
      )}

      {mode === 'reset' && (
        <form
          onSubmit={reset.handleSubmit(
            (d) =>
              run(async () => {
                await resetPassword(d.password)
                setNotice('Password updated successfully! You can now sign in.')
                setMode('login')
              }),
            handleFormError
          )}
          className="space-y-4"
        >
          <Field label="New Password" error={reset.formState.errors.password?.message}>
            <input {...reset.register('password')} type="password" placeholder="••••••••" className={inputClass} />
          </Field>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold transition-all shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer text-sm"
          >
            Update & Set Password
          </button>
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="text-[var(--primary)] text-xs cursor-pointer hover:underline block text-center"
          >
            ← Back to Sign In
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
