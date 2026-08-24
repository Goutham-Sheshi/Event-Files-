import { FormEvent, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { getMyProfile, type VaultProfile, vaultUserAdmin } from './authApi'

const toFirstName = (value: string) => {
  const first = value.trim().split(/\s+/)[0] || ''
  return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : ''
}

const getDisplayName = (session: Session | null) => {
  const metadata = session?.user?.user_metadata || {}
  const candidate = metadata.full_name || metadata.name || metadata.display_name || metadata.user_name
  if (typeof candidate === 'string' && candidate.trim()) return toFirstName(candidate)
  const email = session?.user?.email
  return email ? toFirstName(email.split('@')[0]) : ''
}

const fieldStyle = { width:'100%', boxSizing:'border-box' as const, padding:'12px 14px', border:'1px solid #d1d5db', borderRadius:10, marginBottom:14 }
const buttonStyle = { width:'100%', padding:12, border:0, borderRadius:10, background:'#E05A1C', color:'#fff', fontWeight:700, cursor:'pointer' as const }

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<VaultProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'sign-in'|'request'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadProfile() {
    const next = await getMyProfile()
    setProfile(next)
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session) await loadProfile()
      else setLoading(false)
    })
    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) await loadProfile()
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    const name = getDisplayName(session)
    if (name) window.localStorage.setItem('sheshi-vault-user-name', name)
  }, [session])

  async function signIn(event: FormEvent) {
    event.preventDefault()
    if (!/^[^\s@]+@sheshi\.ai$/i.test(email.trim())) return setMessage('Only @sheshi.ai email addresses are eligible.')
    setBusy(true); setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    setBusy(false)
    setMessage(error ? 'Could not sign in with those details.' : '')
  }

  async function requestAccess(event: FormEvent) {
    event.preventDefault()
    if (!/^[^\s@]+@sheshi\.ai$/i.test(email.trim())) return setMessage('Only @sheshi.ai email addresses are eligible.')
    if (password.length < 12) return setMessage('Use a password with at least 12 characters.')
    setBusy(true); setMessage('')
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName.trim() } },
    })
    if (!error) await supabase.auth.signOut()
    setBusy(false)
    setMessage(error ? 'Could not submit your access request.' : 'Your access request has been submitted for admin approval.')
  }

  async function changeInitialPassword(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setMessage('')
    try {
      await vaultUserAdmin('complete_initial_password_change', { password: newPassword })
      setNewPassword('')
      await loadProfile()
    } catch {
      setMessage('Could not update your password. Use at least 12 characters and try again.')
    } finally { setBusy(false) }
  }

  if (loading) return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',fontFamily:'Inter, sans-serif'}}>Loading Sheshi Vault…</div>

  if (session && profile?.status === 'approved' && profile.must_change_password) {
    return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,fontFamily:'Inter, system-ui, sans-serif',background:'#f8fafc'}}>
      <form onSubmit={changeInitialPassword} style={{width:'100%',maxWidth:400,background:'#fff',padding:32,borderRadius:16,boxShadow:'0 12px 40px rgba(15,23,42,.12)'}}>
        <h1 style={{margin:'0 0 8px',fontSize:28,color:'#111827'}}>Set your password</h1>
        <p style={{margin:'0 0 24px',color:'#6b7280'}}>You must replace the temporary password before accessing Sheshi Vault.</p>
        <input type="password" required minLength={12} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="New password" style={fieldStyle} />
        <button disabled={busy} type="submit" style={buttonStyle}>{busy?'Updating…':'Set password and continue'}</button>
        {message && <p style={{fontSize:13,color:'#b91c1c',marginTop:12}}>{message}</p>}
      </form>
    </main>
  }

  if (session && profile?.status === 'pending') {
    return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,fontFamily:'Inter, system-ui, sans-serif',background:'#f8fafc'}}>
      <div style={{width:'100%',maxWidth:400,background:'#fff',padding:32,borderRadius:16,boxShadow:'0 12px 40px rgba(15,23,42,.12)'}}>
        <h1 style={{margin:'0 0 8px',fontSize:28,color:'#111827'}}>Access pending</h1>
        <p style={{margin:0,color:'#6b7280'}}>Your Sheshi Vault access request is waiting for admin approval.</p>
        <button onClick={()=>supabase.auth.signOut()} style={{...buttonStyle,marginTop:24}}>Sign out</button>
      </div>
    </main>
  }

  if (session && profile?.status === 'rejected') {
    return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,fontFamily:'Inter, system-ui, sans-serif',background:'#f8fafc'}}>
      <div style={{width:'100%',maxWidth:400,background:'#fff',padding:32,borderRadius:16,boxShadow:'0 12px 40px rgba(15,23,42,.12)'}}>
        <h1 style={{margin:'0 0 8px',fontSize:28,color:'#111827'}}>Access unavailable</h1>
        <p style={{margin:0,color:'#6b7280'}}>This account has not been approved for Sheshi Vault.</p>
        <button onClick={()=>supabase.auth.signOut()} style={{...buttonStyle,marginTop:24}}>Sign out</button>
      </div>
    </main>
  }

  if (session && profile?.status === 'approved') return <>{children}</>

  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,fontFamily:'Inter, system-ui, sans-serif',background:'#f8fafc'}}>
    <form onSubmit={mode==='sign-in'?signIn:requestAccess} style={{width:'100%',maxWidth:400,background:'#fff',padding:32,borderRadius:16,boxShadow:'0 12px 40px rgba(15,23,42,.12)'}}>
      <div style={{width:42,height:42,borderRadius:12,display:'grid',placeItems:'center',background:'#E05A1C',color:'#fff',fontWeight:800,fontSize:20}}>S</div>
      <h1 style={{margin:'20px 0 6px',fontSize:28,color:'#111827'}}>Sheshi Vault</h1>
      <p style={{margin:'0 0 24px',color:'#6b7280'}}>{mode==='sign-in'?'Sign in with your approved @sheshi.ai account.':'Request access with your @sheshi.ai account.'}</p>
      {mode==='request' && <><label style={{display:'block',fontSize:13,fontWeight:600,marginBottom:6}}>Name</label><input value={fullName} onChange={e=>setFullName(e.target.value)} style={fieldStyle}/></>}
      <label style={{display:'block',fontSize:13,fontWeight:600,marginBottom:6}}>Sheshi email</label>
      <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} style={fieldStyle} />
      <label style={{display:'block',fontSize:13,fontWeight:600,marginBottom:6}}>Password</label>
      <input type="password" required minLength={mode==='request'?12:1} value={password} onChange={e=>setPassword(e.target.value)} style={{...fieldStyle,marginBottom:16}} />
      <button disabled={busy} type="submit" style={buttonStyle}>{busy?(mode==='sign-in'?'Signing in…':'Submitting…'):(mode==='sign-in'?'Sign in':'Request access')}</button>
      <button type="button" onClick={()=>{setMode(mode==='sign-in'?'request':'sign-in');setMessage('')}} style={{width:'100%',padding:12,border:0,background:'transparent',color:'#E05A1C',fontWeight:700,cursor:'pointer',marginTop:8}}>{mode==='sign-in'?'Need access? Request approval':'Already approved? Sign in'}</button>
      {message && <p style={{fontSize:13,color:message.includes('submitted')?'#166534':'#b91c1c',marginTop:12}}>{message}</p>}
    </form>
  </main>
}