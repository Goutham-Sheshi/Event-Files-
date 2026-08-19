import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const applyVaultBranding = () => {
  document.querySelectorAll('span').forEach((element) => {
    if (element.textContent?.trim() !== 'BrandHub') return

    element.textContent = 'Sheshi Vault'

    const icon = element.previousElementSibling as HTMLElement | null
    if (icon) {
      icon.innerHTML = 'S'
      icon.style.background = '#242a31'
      icon.style.color = '#ffffff'
      icon.style.borderRadius = '12px'
      icon.style.display = 'flex'
      icon.style.alignItems = 'center'
      icon.style.justifyContent = 'center'
      icon.style.fontSize = '26px'
      icon.style.fontWeight = '700'
      icon.style.width = '58px'
      icon.style.height = '58px'
      icon.style.flex = '0 0 58px'
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

applyVaultBranding()
new MutationObserver(applyVaultBranding).observe(document.body, {
  childList: true,
  subtree: true,
})
