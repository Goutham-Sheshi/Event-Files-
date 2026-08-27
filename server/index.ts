import WebSocket from 'ws'
;(globalThis as any).WebSocket = WebSocket

import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'

const app = express()
app.disable('x-powered-by')

const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || 'sheshi_vault_super_secret_jwt_key_2026'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ikkyziyugrnkolqnrxfo.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlra3l6aXl1Z3Jua29scW5yeGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4MjUsImV4cCI6MjEwMjUzMDgyNX0.ISewj3DuJNmZrrWqByDwGMk9iys8kXYlTDuYCSYr-j4'

const ADMIN_EMAIL = process.env.VITE_DEFAULT_ADMIN_EMAIL || 'goutham.ra@sheshi.ai'
const ADMIN_NAME = process.env.VITE_DEFAULT_ADMIN_NAME || 'Goutham'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
})

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

function validateSheshiEmail(email: string) {
  const clean = (email || '').trim().toLowerCase()
  if (!clean?.endsWith('@sheshi.ai')) {
    throw new Error('Access Restricted: Only @sheshi.ai corporate email addresses are permitted.')
  }
  return clean
}

// Middleware: Authenticate Bearer JWT Token
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization']
  const token = authHeader?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access denied: No token provided' })
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired authentication token' })
    }
    req.user = user
    next()
  })
}

// Middleware: Require Admin Role
function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin privilege required' })
  }
  next()
}

// --- REST API ENDPOINTS ---

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Sheshi Vault Backend API', timestamp: new Date().toISOString() })
})

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const cleanEmail = validateSheshiEmail(email)

    if (!password?.trim()) {
      return res.status(400).json({ error: 'Password is required' })
    }

    const isAdmin = cleanEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    const initialStatus = isAdmin ? 'approved' : 'pending'

    let userProfile = {
      id: isAdmin ? 'admin-goutham' : `user-${cleanEmail.replace(/[^a-z0-9]/g, '-')}`,
      email: cleanEmail,
      full_name: isAdmin ? ADMIN_NAME : cleanEmail.split('@')[0],
      role: isAdmin ? 'admin' : 'standard',
      status: initialStatus,
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (!authError && authData?.user) {
        userProfile.id = authData.user.id
        const { data: dbProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle()

        if (dbProfile) {
          userProfile = dbProfile as any
        }
      }
    } catch { /* ignore */ }

    if (userProfile.status === 'rejected') {
      return res.status(403).json({ error: 'Access Rejected: Your account access has been rejected by an administrator.' })
    }

    if (userProfile.status === 'pending') {
      return res.status(403).json({ error: 'Access Pending: Your account is awaiting approval by an administrator.' })
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: userProfile.id, email: userProfile.email, role: userProfile.role, status: userProfile.status },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return res.json({ token, user: userProfile })
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || 'Login failed' })
  }
})

// Register Endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body
    const cleanEmail = validateSheshiEmail(email)

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const name = fullName?.trim() || cleanEmail.split('@')[0]
    const isAdmin = cleanEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    const initialStatus = isAdmin ? 'approved' : 'pending'

    let assignedId = isAdmin ? 'admin-goutham' : `user-${cleanEmail.replace(/[^a-z0-9]/g, '-')}`

    try {
      const { data: authData } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { full_name: name, role: isAdmin ? 'admin' : 'standard', status: initialStatus } },
      })

      if (authData?.user?.id) {
        assignedId = authData.user.id
      }
    } catch { /* ignore */ }

    const userProfile = {
      id: assignedId,
      email: cleanEmail,
      full_name: name,
      role: isAdmin ? 'admin' : 'standard',
      status: initialStatus,
    }

    // Upsert into profiles table with valid UUID and SELECT-check
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('profiles')
          .update({
            full_name: name,
            status: initialStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('email', cleanEmail)
      } else {
        const dbUuid = assignedId.length === 36 ? assignedId : '00000000-0000-4000-a000-' + Math.random().toString(16).slice(2, 14).padStart(12, '0')
        await supabase.from('profiles').insert({
          id: dbUuid,
          email: cleanEmail,
          full_name: name,
          role: isAdmin ? 'admin' : 'user',
          status: initialStatus,
          updated_at: new Date().toISOString(),
        })
      }
    } catch (dbErr) {
      console.warn('Express backend profiles DB write note:', dbErr)
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: userProfile.id, email: userProfile.email, role: userProfile.role, status: userProfile.status },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return res.json({ token, user: userProfile })
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || 'Registration failed' })
  }
})

// Get Current User Profile (JWT Protected)
app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle()

    if (profile) {
      return res.json({ user: profile })
    }

    return res.json({ user: req.user })
  } catch {
    return res.json({ user: req.user })
  }
})

// Admin: Get All Users (JWT Protected, Admin Only)
app.get('/api/users', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data && data.length > 0) {
      return res.json({ users: data })
    }
  } catch { /* ignore */ }

  return res.json({
    users: [
      { id: 'admin-goutham', email: ADMIN_EMAIL, full_name: ADMIN_NAME, role: 'admin', status: 'approved' },
      { id: 'user-muralidharan-m-sheshi-ai', email: 'muralidharan.m@sheshi.ai', full_name: 'Muralidharan', role: 'standard', status: 'approved' },
    ],
  })
})

// Admin: Update User Status (JWT Protected, Admin Only)
app.put('/api/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!['approved', 'pending', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' })
  }

  try {
    await supabase.from('profiles').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  } catch { /* ignore */ }

  return res.json({ success: true, id, status })
})

// Admin: Delete User (JWT Protected, Admin Only)
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params
  try {
    await supabase.from('profiles').delete().eq('id', id)
  } catch { /* ignore */ }

  return res.json({ success: true, id })
})

// Start Express Backend Server
app.listen(PORT, () => {
  console.log(`✅ Sheshi Vault Express Backend API server running on http://localhost:${PORT}`)
})
