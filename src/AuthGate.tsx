import { FormEvent, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

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

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
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
    setBusy(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    setMessage(error ? error.message : '')
  }

  async function sendMagicLink() {
    if (!email) return setMessage('Enter your email first.')
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/Event-Files-/' },
    })
    setBusy(false)
    setMessage(error ? error.message : 'Check your email for a secure sign-in link.')
  }

  if (loading) return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',fontFamily:'Inter, sans-serif'}}>Loading Sheshi Vault…</div>
  if (session) return <>{children}</>

  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,fontFamily:'Inter, system-ui, sans-serif',background:'#f8fafc'}}>
    <form onSubmit={signIn} style={{width:'100%',maxWidth:400,background:'#fff',padding:32,borderRadius:16,boxShadow:'0 12px 40px rgba(15,23,42,.12)'}}>
      <div style={{width:42,height:42,borderRadius:12,display:'grid',placeItems:'center',background:'#2563EB',color:'#fff',fontWeight:800,fontSize:20}}>S</div>
      <h1 style={{margin:'20px 0 6px',fontSize:28,color:'#111827'}}>Sheshi Vault</h1>
      <p style={{margin:'0 0 24px',color:'#6b7280'}}>Sign in with your authorized account.</p>
      <label style={{display:'block',fontSize:13,fontWeight:600,marginBottom:6}}>Email</label>
      <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%',boxSizing:'border-box',padding:'12px 14px',border:'1px solid #d1d5db',borderRadius:10,marginBottom:14}} />
      <label style={{display:'block',fontSize:13,fontWeight:600,marginBottom:6}}>Password</label>
      <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%',boxSizing:'border-box',padding:'12px 14px',border:'1px solid #d1d5db',borderRadius:10,marginBottom:16}} />
      <button disabled={busy} type="submit" style={{width:'100%',padding:12,border:0,borderRadius:10,background:'#2563EB',color:'#fff',fontWeight:700,cursor:'pointer'}}>{busy?'Signing in…':'Sign in'}</button>
      <button disabled={busy} type="button" onClick={sendMagicLink} style={{width:'100%',padding:12,border:0,background:'transparent',color:'#2563EB',fontWeight:700,cursor:'pointer',marginTop:8}}>Email me a sign-in link</button>
      {message && <p style={{fontSize:13,color:'#b91c1c',marginTop:12}}>{message}</p>}
    </form>
  </main>
}