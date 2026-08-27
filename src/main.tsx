import React from 'react'
import ReactDOM from 'react-dom/client'
import LiveApp from './LiveApp'
import { startFileViewerBridge } from './fileViewerBridge'
import { startAdminBridge } from './adminBridge'
import './index.css'

// LiveApp still reads this legacy key for the welcome heading. Resolve the
// current user's name from either the app session or the persisted Supabase
// session before React renders, so an older user's name can never be reused.
function resolveCurrentUserName(): string {
  try {
    const appSession = localStorage.getItem('sheshi_vault_session')
    if (appSession) {
      const profile = JSON.parse(appSession)
      if (typeof profile?.full_name === 'string' && profile.full_name.trim()) {
        return profile.full_name.trim()
      }
    }

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith('sb-')) continue

      const raw = localStorage.getItem(key)
      if (!raw) continue

      try {
        const data = JSON.parse(raw)
        const user = data?.currentSession?.user || data?.user
        const fullName = user?.user_metadata?.full_name
        if (typeof fullName === 'string' && fullName.trim()) {
          return fullName.trim()
        }
      } catch {
        // Ignore unrelated Supabase/local storage values.
      }
    }
  } catch {
    // Fall through and clear any stale legacy value below.
  }

  return ''
}

const currentUserName = resolveCurrentUserName()
if (currentUserName) {
  localStorage.setItem('sheshi-vault-user-name', currentUserName)
} else {
  localStorage.removeItem('sheshi-vault-user-name')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LiveApp />
  </React.StrictMode>,
)

startFileViewerBridge()
startAdminBridge()
