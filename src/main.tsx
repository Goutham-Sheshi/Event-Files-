import React from 'react'
import ReactDOM from 'react-dom/client'
import LiveApp from './LiveApp'
import { startFileViewerBridge } from './fileViewerBridge'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LiveApp />
  </React.StrictMode>,
)

startFileViewerBridge()
