import React from 'react'
import ReactDOM from 'react-dom/client'
import LiveApp from './LiveApp'
import AuthGate from './AuthGate'
import { startFileViewerBridge } from './fileViewerBridge'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthGate>
      <LiveApp />
    </AuthGate>
  </React.StrictMode>,
)

startFileViewerBridge()
