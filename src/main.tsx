import React from 'react'
import ReactDOM from 'react-dom/client'
import LiveApp from './LiveApp'
import { startFileViewerBridge } from './fileViewerBridge'
import { startAdminBridge } from './adminBridge'
import './index.css'

// Keep the legacy welcome-name key in sync with the current persisted session.
// LiveApp currently reads this key for the welcome heading, while the rest of
// the application reads sheshi_vault_session. Always overwrite it on startup
// so a previous user's name can never leak into the current user's welcome.
try {
  const session = localStorage.getItem('sheshi_vault_session')
  if (session) {
    const profile = JSON.parse(session)
    const fullName = typeof profile?.full_name === 'string' ? profile.full_name.trim() : ''
    if (fullName) localStorage.setItem('sheshi-vault-user-name', fullName)
    else localStorage.removeItem('sheshi-vault-user-name')
  } else {
    localStorage.removeItem('sheshi-vault-user-name')
  }
} catch {
  localStorage.removeItem('sheshi-vault-user-name')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LiveApp />
  </React.StrictMode>,
)

startFileViewerBridge()
startAdminBridge()
