import { createRoot, type Root } from 'react-dom/client'
import AdminConsole from './AdminConsole'

let mounted: HTMLElement | null = null
let root: Root | null = null

function mountAdmin(target: HTMLElement) {
  if (mounted === target && target.querySelector('[data-admin-console="true"]')) return

  root?.unmount()
  mounted = target

  // Admin can be taller than the viewport. Do not clip its content inside the
  // right-pane placeholder; let the application's normal page scrolling handle it.
  target.classList.remove('overflow-hidden', 'self-stretch')
  target.classList.add('flex-1', 'min-w-0', 'overflow-visible')
  target.style.height = 'auto'
  target.style.minHeight = '100%'
  target.style.overflowY = 'visible'
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
