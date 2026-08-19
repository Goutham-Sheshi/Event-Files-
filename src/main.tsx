import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const applyVaultBranding = () => {
  document.querySelectorAll('span').forEach((element) => {
    if (element.textContent?.trim() !== 'BrandHub') return

    element.textContent = 'Sheshi Vault'

    const logoContainer = element.previousElementSibling as HTMLElement | null
    if (logoContainer && !logoContainer.querySelector('img')) {
      logoContainer.innerHTML = ''
      logoContainer.style.background = 'transparent'
      logoContainer.style.borderRadius = '0'
      logoContainer.innerHTML = '<img src="/favicon.svg" alt="Sheshi" style="width:32px;height:32px;object-fit:contain;display:block" />'
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
