import React from 'react'
import ReactDOM from 'react-dom/client'
import LiveApp from './LiveApp'
import AuthGate from './AuthGate'
import { startAdminBridge } from './adminBridge'
import { startAdminLabelBridge } from './adminLabelBridge'
import { startFileViewerBridge } from './fileViewerBridge'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthGate>
      <LiveApp />
    </AuthGate>
  </React.StrictMode>,
)

startAdminBridge()
startAdminLabelBridge()
startFileViewerBridge()
