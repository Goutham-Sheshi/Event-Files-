import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { forgotPassword, resetPassword, signIn, signUp } from '../authApi'
import { forgotSchema, loginSchema, registerSchema, resetSchema, type ForgotFormData, type LoginFormData, type RegisterFormData, type ResetFormData } from '../schemas/authSchemas'

export type AuthMode = 'login' | 'register' | 'forgot' | 'reset'

interface AuthScreenProps {
  readonly onSuccess: () => void
  readonly onClose?: () => void
  readonly isOpen?: boolean
  readonly initialMode?: AuthMode
}

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-[12px] font-semibold text-slate-300 mb-1.5">{label}</label>
    {children}
    {error && <p className="text-red-400 text-[11px] mt-1 font-medium">{error}</p>}
  </div>
)

const inputClass = 'w-full px-4 py-3 rounded-xl border bg-[#1a1d26] text-white placeholder-slate-500 outline-none text-[13px] border-white/10 focus:border-[#E05A1C]'

function AuthLayout({ mode, children, onClose }: { mode: AuthMode; children: React.ReactNode; onClose?: () => void }) {
  const title = mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Create Your Sheshi Account' : mode === 'forgot' ? 'Reset Password' : 'Set New Password'
  const subtitle = mode === 'login' ? 'Enter your corporate credentials to access the vault' : mode === 'register' ? 'Fill in your details below to request member access' : mode === 'forgot' ? 'Enter your corporate email address for password reset' : 'Create a new secure password for your account'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0c10]/90 backdrop-blur-md text-slate-100 overflow-y-auto">
      <div className="w-full max-w-[1000px] min-h-[580px] bg-[#12151e] rounded-3xl shadow-2xl border border-white/10 overflow-hidden grid grid-cols-1 lg:grid-cols-12 my-auto relative">
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
        <div className="lg:col-span-5 p-8 lg:p-10 bg-gradient-to-br from-[#1c2232] to-[#0f121a] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E05A1C] to-orange-400 flex items-center justify-center text-white font-bold text-lg">S</div>
              <div>
                <h1 className="font-bold text-base">Sheshi Vault</h1>
                <p className="text-[10px] font-mono tracking-wider text-orange-400 uppercase">Brand & Event Hub</p>
              </div>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold">Enterprise Asset & Event Intelligence</h2>
            <p className="text-[13px] text-slate-400 mt-4">Secure digital asset management, brand guidelines, and corporate event coordination across all Sheshi product suites.</p>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">© 2026 Sheshi AI Inc.</div>
        </div>
        <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center">
          <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
          <p className="text-[13px] text-slate-400 mt-1 mb-6">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

export default function AuthScreen({ onSuccess, onClose, isOpen = true, initialMode = 'login' }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(() => new URLSearchParams(window.location.search).get('register') === '1' ? 'register' : initialMode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const login = useForm<LoginFormData>({ resolver: yupResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const register = useForm<RegisterFormData>({ resolver: yupResolver(registerSchema), defaultValues: { fullName: '', email: '', password: '' } })
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
        <div className="flex p-1 rounded-2xl bg-[#1a1d26] border border-white/5 w-fit mb-8">
          <button type="button" onClick={() => switchMode('login')} className={`px-6 py-2 rounded-xl text-[12px] font-semibold cursor-pointer ${mode === 'login' ? 'bg-orange-500 text-white' : 'text-slate-400'}`}>Sign In</button>
          <button type="button" onClick={() => switchMode('register')} className={`px-6 py-2 rounded-xl text-[12px] font-semibold cursor-pointer ${mode === 'register' ? 'bg-orange-500 text-white' : 'text-slate-400'}`}>Register</button>
        </div>
      )}

      {notice && <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm">{notice}</div>}
      {error && <div className="mb-4 p-3 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium">{error}</div>}

      {mode === 'login' && (
        <form onSubmit={login.handleSubmit(d => run(async () => { await signIn(d.email, d.password); onSuccess() }), handleFormError)} className="space-y-4">
          <Field label="Email Address" error={login.formState.errors.email?.message}>
            <input {...login.register('email')} type="email" placeholder="name@sheshi.ai" className={inputClass} />
          </Field>
          <Field label="Password" error={login.formState.errors.password?.message}>
            <input {...login.register('password')} type="password" placeholder="••••••••" className={inputClass} />
          </Field>
          <button type="button" onClick={() => switchMode('forgot')} className="text-orange-400 text-xs cursor-pointer hover:underline">Forgot password?</button>
          <button type="submit" disabled={busy} className="w-full py-3.5 rounded-xl bg-orange-500 text-white font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer">
            {busy ? 'Signing In...' : 'Sign In to Vault'}
          </button>
        </form>
      )}

      {mode === 'register' && (
        <form onSubmit={register.handleSubmit(d => run(async () => { const r = await signUp(d.email, d.password, d.fullName); if (r?.session) onSuccess(); else { setNotice('Registration submitted successfully! Your account is pending approval by an administrator.'); setMode('login') } }), handleFormError)} className="space-y-4">
          <Field label="Full Name" error={register.formState.errors.fullName?.message}>
            <input {...register.register('fullName')} placeholder="Your full name" className={inputClass} />
          </Field>
          <Field label="Email Address" error={register.formState.errors.email?.message}>
            <input {...register.register('email')} type="email" placeholder="name@sheshi.ai" className={inputClass} />
          </Field>
          <Field label="Password" error={register.formState.errors.password?.message}>
            <input {...register.register('password')} type="password" placeholder="••••••••" className={inputClass} />
          </Field>
          <button type="submit" disabled={busy} className="w-full py-3.5 rounded-xl bg-orange-500 text-white font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer">
            {busy ? 'Submitting...' : 'Submit Registration'}
          </button>
        </form>
      )}

      {mode === 'forgot' && (
        <form onSubmit={forgot.handleSubmit(d => run(async () => { await forgotPassword(d.email); setNotice(`Password reset initialized for ${d.email}. Please set your new password below.`); setMode('reset') }), handleFormError)} className="space-y-4">
          <Field label="Email Address" error={forgot.formState.errors.email?.message}>
            <input {...forgot.register('email')} type="email" placeholder="name@sheshi.ai" className={inputClass} />
          </Field>
          <button type="submit" disabled={busy} className="w-full py-3.5 rounded-xl bg-orange-500 text-white font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer">
            Send Password Reset Email
          </button>
          <button type="button" onClick={() => switchMode('login')} className="text-orange-400 text-xs cursor-pointer hover:underline">
            ← Back to Sign In
          </button>
        </form>
      )}

      {mode === 'reset' && (
        <form onSubmit={reset.handleSubmit(d => run(async () => { await resetPassword(d.password); setNotice('Password updated successfully! You can now sign in.'); setMode('login') }), handleFormError)} className="space-y-4">
          <Field label="New Password" error={reset.formState.errors.password?.message}>
            <input {...reset.register('password')} type="password" placeholder="••••••••" className={inputClass} />
          </Field>
          <button type="submit" disabled={busy} className="w-full py-3.5 rounded-xl bg-orange-500 text-white font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer">
            Update & Set Password
          </button>
          <button type="button" onClick={() => switchMode('login')} className="text-orange-400 text-xs cursor-pointer hover:underline">
            ← Back to Sign In
          </button>
        </form>
      )}
    </AuthLayout>
  )
}