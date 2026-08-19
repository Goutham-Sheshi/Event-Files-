import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const applyVaultBranding = () => {
  document.querySelectorAll('span').forEach((element) => {
    if (element.textContent?.trim() !== 'BrandHub' && element.textContent?.trim() !== 'Sheshi Vault') return

    element.textContent = 'Sheshi Vault'
    element.style.fontSize = '30px'
    element.style.fontWeight = '700'
    element.style.lineHeight = '44px'

    const icon = element.previousElementSibling as HTMLElement | null
    if (icon) {
      icon.innerHTML = 'S'
      icon.style.background = '#242a31'
      icon.style.color = '#ffffff'
      icon.style.borderRadius = '10px'
      icon.style.display = 'flex'
      icon.style.alignItems = 'center'
      icon.style.justifyContent = 'center'
      icon.style.fontSize = '20px'
      icon.style.fontWeight = '700'
      icon.style.width = '44px'
      icon.style.height = '44px'
      icon.style.flex = '0 0 44px'
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
