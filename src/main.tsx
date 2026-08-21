import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AuthGate from './AuthGate'
import { startAdminBridge } from './adminBridge'
import { startAdminLabelBridge } from './adminLabelBridge'
import { startEventViewsBridge } from './eventViewsBridge'
import { startFileViewerBridge } from './fileViewerBridge'
import { startFigmaPageBridge } from './figmaPageBridge'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </React.StrictMode>,
)

startAdminBridge()
startAdminLabelBridge()
startEventViewsBridge()
startFileViewerBridge()
startFigmaPageBridge()
