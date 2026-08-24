import { createRoot, type Root } from 'react-dom/client'
import AdminConsole from './AdminConsole'

let mounted: HTMLElement | null = null
let root: Root | null = null

function mountAdmin(target: HTMLElement) {
  if (mounted === target && target.querySelector('[data-admin-console="true"]')) return

  root?.unmount()
  mounted = target
  target.classList.add('flex-1', 'min-w-0', 'self-stretch', 'overflow-hidden')
  target.innerHTML = ''
  root = createRoot(target)
  root.render(<AdminConsole />)
}

export function startAdminBridge() {
  const scan = () => {
    const placeholder = Array.from(document.querySelectorAll<HTMLElement>('div'))
      .find(el => el.textContent?.trim() === 'Admin Console')

    if (placeholder) mountAdmin(placeholder)
  }

  const observer = new MutationObserver(scan)
  observer.observe(document.body, { childList: true, subtree: true })
  scan()
}
