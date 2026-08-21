import { createRoot, type Root } from 'react-dom/client'
import AdminConsole from './AdminConsole'

let mounted: HTMLElement | null = null
let root: Root | null = null

function mountAdmin(target: HTMLElement) {
  if (target.querySelector('[data-admin-console="true"]')) return
  root?.unmount()
  mounted = target
  target.innerHTML = ''
  root = createRoot(target)
  root.render(<AdminConsole />)
}

export function startAdminBridge() {
  const scan = () => {
    const placeholder = Array.from(document.querySelectorAll('div')).find(el => el.textContent?.trim() === 'Admin Console') as HTMLElement | undefined
    if (!placeholder) return
    const host = placeholder.parentElement?.parentElement
    if (host) mountAdmin(host)
  }
  const observer = new MutationObserver(scan)
  observer.observe(document.body, { childList: true, subtree: true })
  scan()
}
