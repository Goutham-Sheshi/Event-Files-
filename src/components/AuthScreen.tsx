import React, { useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
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
  readonly initialMode?: AuthMode
}

function BrandHeroPanel() {
  return (
    <div className="lg:col-span-5 p-8 lg:p-10 bg-gradient-to-br from-[#1c2232] to-[#0f121a] flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#E05A1C]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E05A1C] to-orange-400 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-[#E05A1C]/30">
            S
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white">Sheshi Vault</h1>
            <p className="text-[10px] font-mono tracking-wider text-orange-400 uppercase">BRAND & EVENT HUB</p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white leading-tight">
            Enterprise Asset & Event Intelligence
          </h2>
          <p className="text-[13px] text-slate-400 leading-relaxed">
            Secure digital asset management, brand guidelines, and corporate event coordination across all Sheshi product suites.
          </p>
        </div>
      </div>

      <div className="space-y-3 py-6">
        <div className="flex items-center gap-3 text-[12.5px] text-slate-300">
          <div className="w-5 h-5 rounded-md bg-[#E05A1C]/20 text-orange-400 flex items-center justify-center font-bold text-xs">✓</div>
          <span>Centralized Logo, Brochure & Photo Library</span>
        </div>
        <div className="flex items-center gap-3 text-[12.5px] text-slate-300">
          <div className="w-5 h-5 rounded-md bg-[#E05A1C]/20 text-orange-400 flex items-center justify-center font-bold text-xs">✓</div>
          <span>Summits, Roadshows & Live Event Schedules</span>
        </div>
        <div className="flex items-center gap-3 text-[12.5px] text-slate-300">
          <div className="w-5 h-5 rounded-md bg-[#E05A1C]/20 text-orange-400 flex items-center justify-center font-bold text-xs">✓</div>
          <span>Restricted `<code className="text-orange-300 font-mono">@sheshi.ai</code>` Corporate Domain Security</span>
        </div>
      </div>

      <div className="pt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>© 2026 Sheshi AI Inc.</span>
        <span>React Hook Form + Yup Validated</span>
      </div>
    </div>
  )
}

interface LoginFormViewProps {
  readonly form: UseFormReturn<LoginFormData>
  readonly busy: boolean
  readonly showPassword: boolean
  readonly setShowPassword: (val: boolean) => void
  readonly onSubmit: (data: LoginFormData) => void
  readonly onForgotClick: () => void
}

function LoginFormView({ form, busy, showPassword, setShowPassword, onSubmit, onForgotClick }: LoginFormViewProps) {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="login_email" className="block text-[12px] font-semibold text-slate-300 mb-1.5">
          Email Address
        </label>
        <input
          id="login_email"
          type="email"
          {...form.register('email')}
          placeholder="name@sheshi.ai"
          className={`w-full px-4 py-3 rounded-xl border bg-[#1a1d26] text-white placeholder-slate-500 outline-none text-[13px] transition-colors ${form.formState.errors.email ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-[#E05A1C]'}`}
        />
        {form.formState.errors.email && (
          <p className="mt-1 text-[11.5px] text-red-400 font-medium">
            ⚠️ {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label htmlFor="login_password" className="block text-[12px] font-semibold text-slate-300">
            Password
          </label>
          <button
            type="button"
            onClick={onForgotClick}
            className="text-[11.5px] font-semibold text-orange-400 hover:text-orange-300 hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative flex items-center">
          <input
            id="login_password"
            type={showPassword ? 'text' : 'password'}
            {...form.register('password')}
            placeholder="••••••••"
            className={`w-full px-4 py-3 pr-12 rounded-xl border bg-[#1a1d26] text-white placeholder-slate-500 outline-none text-[13px] transition-colors ${form.formState.errors.password ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-[#E05A1C]'}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3.5 text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
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
        {form.formState.errors.password && (
          <p className="mt-1 text-[11.5px] text-red-400 font-medium">
            ⚠️ {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#E05A1C] to-orange-500 hover:from-[#c44d16] hover:to-orange-600 text-white font-semibold text-sm shadow-lg shadow-[#E05A1C]/25 transition-all disabled:opacity-50 cursor-pointer mt-2"
      >
        {busy ? 'Signing In...' : 'Sign In to Vault'}
      </button>
    </form>
  )
}

interface RegisterFormViewProps {
  readonly form: UseFormReturn<RegisterFormData>
  readonly busy: boolean
  readonly showPassword: boolean
  readonly setShowPassword: (val: boolean) => void
  readonly onSubmit: (data: RegisterFormData) => void
}

function RegisterFormView({ form, busy, showPassword, setShowPassword, onSubmit }: RegisterFormViewProps) {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="reg_fullname" className="block text-[12px] font-semibold text-slate-300 mb-1.5">
          Full Name
        </label>
        <input
          id="reg_fullname"
          type="text"
          {...form.register('fullName')}
          placeholder="Muralidharan"
          className={`w-full px-4 py-3 rounded-xl border bg-[#1a1d26] text-white placeholder-slate-500 outline-none text-[13px] transition-colors ${form.formState.errors.fullName ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-[#E05A1C]'}`}
        />
        {form.formState.errors.fullName && (
          <p className="mt-1 text-[11.5px] text-red-400 font-medium">
            ⚠️ {form.formState.errors.fullName.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="reg_email" className="block text-[12px] font-semibold text-slate-300 mb-1.5">
          Email Address
        </label>
        <input
          id="reg_email"
          type="email"
          {...form.register('email')}
          placeholder="muralidharan.m@sheshi.ai"
          className={`w-full px-4 py-3 rounded-xl border bg-[#1a1d26] text-white placeholder-slate-500 outline-none text-[13px] transition-colors ${form.formState.errors.email ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-[#E05A1C]'}`}
        />
        {form.formState.errors.email && (
          <p className="mt-1 text-[11.5px] text-red-400 font-medium">
            ⚠️ {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="reg_password" className="block text-[12px] font-semibold text-slate-300 mb-1.5">
          Password
        </label>
        <div className="relative flex items-center">
          <input
            id="reg_password"
            type={showPassword ? 'text' : 'password'}
            {...form.register('password')}
            placeholder="••••••••"
            className={`w-full px-4 py-3 pr-12 rounded-xl border bg-[#1a1d26] text-white placeholder-slate-500 outline-none text-[13px] transition-colors ${form.formState.errors.password ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-[#E05A1C]'}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3.5 text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
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
        {form.formState.errors.password && (
          <p className="mt-1 text-[11.5px] text-red-400 font-medium">
            ⚠️ {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#E05A1C] to-orange-500 hover:from-[#c44d16] hover:to-orange-600 text-white font-semibold text-sm shadow-lg shadow-[#E05A1C]/25 transition-all disabled:opacity-50 cursor-pointer mt-2"
      >
        {busy ? 'Submitting Registration...' : 'Submit Registration'}
      </button>
    </form>
  )
}

interface ForgotFormViewProps {
  readonly form: UseFormReturn<ForgotFormData>
  readonly busy: boolean
  readonly onSubmit: (data: ForgotFormData) => void
  readonly onBackClick: () => void
}

function ForgotFormView({ form, busy, onSubmit, onBackClick }: ForgotFormViewProps) {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="forgot_email" className="block text-[12px] font-semibold text-slate-300 mb-1.5">
          Email Address
        </label>
        <input
          id="forgot_email"
          type="email"
          {...form.register('email')}
          placeholder="goutham.ra@sheshi.ai"
          className={`w-full px-4 py-3 rounded-xl border bg-[#1a1d26] text-white placeholder-slate-500 outline-none text-[13px] transition-colors ${form.formState.errors.email ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-[#E05A1C]'}`}
        />
        {form.formState.errors.email && (
          <p className="mt-1 text-[11.5px] text-red-400 font-medium">
            ⚠️ {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#E05A1C] to-orange-500 hover:from-[#c44d16] hover:to-orange-600 text-white font-semibold text-sm shadow-lg shadow-[#E05A1C]/25 transition-all disabled:opacity-50 cursor-pointer mt-2"
      >
        {busy ? 'Processing...' : 'Send Password Reset Email'}
      </button>

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onBackClick}
          className="text-[12px] font-semibold text-orange-400 hover:text-orange-300"
        >
          ← Back to Sign In
        </button>
      </div>
    </form>
  )
}

interface ResetFormViewProps {
  readonly form: UseFormReturn<ResetFormData>
  readonly busy: boolean
  readonly showPassword: boolean
  readonly setShowPassword: (val: boolean) => void
  readonly onSubmit: (data: ResetFormData) => void
  readonly onBackClick: () => void
}

function ResetFormView({ form, busy, showPassword, setShowPassword, onSubmit, onBackClick }: ResetFormViewProps) {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="reset_password" className="block text-[12px] font-semibold text-slate-300 mb-1.5">
          New Password
        </label>
        <div className="relative flex items-center">
          <input
            id="reset_password"
            type={showPassword ? 'text' : 'password'}
            {...form.register('password')}
            placeholder="••••••••"
            className={`w-full px-4 py-3 pr-12 rounded-xl border bg-[#1a1d26] text-white placeholder-slate-500 outline-none text-[13px] transition-colors ${form.formState.errors.password ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-[#E05A1C]'}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3.5 text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
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
        {form.formState.errors.password && (
          <p className="mt-1 text-[11.5px] text-red-400 font-medium">
            ⚠️ {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#E05A1C] to-orange-500 hover:from-[#c44d16] hover:to-orange-600 text-white font-semibold text-sm shadow-lg shadow-[#E05A1C]/25 transition-all disabled:opacity-50 cursor-pointer mt-2"
      >
        {busy ? 'Updating Password...' : 'Update & Set Password'}
      </button>

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onBackClick}
          className="text-[12px] font-semibold text-orange-400 hover:text-orange-300"
        >
          ← Back to Sign In
        </button>
      </div>
    </form>
  )
}

export default function AuthScreen({ onSuccess, initialMode = 'login' }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const loginForm = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  })

  const registerForm = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '' },
    mode: 'onTouched',
  })

  const forgotForm = useForm<ForgotFormData>({
    resolver: yupResolver(forgotSchema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  })

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
    setShowPassword(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0c10] text-slate-100 overflow-y-auto">
      <div className="w-full max-w-[1000px] min-h-[580px] bg-[#12151e] rounded-3xl shadow-2xl border border-white/10 overflow-hidden grid grid-cols-1 lg:grid-cols-12 my-auto">
        <BrandHeroPanel />

        <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center bg-[#12151e] relative">
          {(mode === 'login' || mode === 'register') && (
            <div className="flex items-center justify-center p-1 rounded-2xl bg-[#1a1d26] border border-white/5 w-fit mx-auto mb-8">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`px-6 py-2 rounded-xl text-[12.5px] font-semibold transition-all cursor-pointer ${mode === 'login' ? 'bg-gradient-to-r from-[#E05A1C] to-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`px-6 py-2 rounded-xl text-[12.5px] font-semibold transition-all cursor-pointer ${mode === 'register' ? 'bg-gradient-to-r from-[#E05A1C] to-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                Register
              </button>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'register' && 'Create Your Sheshi Account'}
              {mode === 'forgot' && 'Reset Password'}
              {mode === 'reset' && 'Set New Password'}
            </h2>
            <p className="text-[13px] text-slate-400 mt-1">
              {mode === 'login' && 'Enter your corporate credentials to access the vault'}
              {mode === 'register' && 'Fill in details below to request member access'}
              {mode === 'forgot' && 'Enter your corporate email address for password reset'}
              {mode === 'reset' && 'Create a new secure password for your account'}
            </p>
          </div>

          {notice && (
            <div className="mb-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[12.5px] font-medium flex items-center gap-3">
              <span className="text-lg">✅</span>
              <span>{notice}</span>
            </div>
          )}

          {apiError && (
            <div className="mb-5 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-[12.5px] font-medium flex items-center gap-3">
              <span className="text-lg">⚠️</span>
              <span>{apiError}</span>
            </div>
          )}

          {mode === 'login' && (
            <LoginFormView
              form={loginForm}
              busy={busy}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              onSubmit={handleLoginSubmit}
              onForgotClick={() => switchMode('forgot')}
            />
          )}

          {mode === 'register' && (
            <RegisterFormView
              form={registerForm}
              busy={busy}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              onSubmit={handleRegisterSubmit}
            />
          )}

          {mode === 'forgot' && (
            <ForgotFormView
              form={forgotForm}
              busy={busy}
              onSubmit={handleForgotSubmit}
              onBackClick={() => switchMode('login')}
            />
          )}

          {mode === 'reset' && (
            <ResetFormView
              form={resetForm}
              busy={busy}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              onSubmit={handleResetSubmit}
              onBackClick={() => switchMode('login')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
