import { createRoot, type Root } from 'react-dom/client'
import AdminConsole from './AdminConsole'

let mounted: HTMLElement | null = null
let root: Root | null = null

function mountAdmin(target: HTMLElement) {
  if (mounted === target && target.querySelector('[data-admin-console="true"]')) return

  root?.unmount()
  mounted = target

  target.classList.remove('overflow-hidden', 'overflow-visible')
  target.classList.add('flex-1', 'min-w-0', 'self-stretch', 'overflow-y-auto')
  target.style.height = ''
  target.style.minHeight = ''
  target.style.overflowY = ''
  target.innerHTML = ''

  root = createRoot(target)
  root.render(<AdminConsole />)
}

export function startAdminBridge() {
  const scan = () => {
    // Legacy placeholder route.
    const placeholder = Array.from(document.querySelectorAll<HTMLElement>('div'))
      .find(el => el.textContent?.trim() === 'Admin Console')
    if (placeholder) {
      mountAdmin(placeholder)
      return
    }

    // Auth has been intentionally disabled for now. If an older route guard
    // still renders the access-denied state, replace that content pane with
    // the admin console instead of leaving a visible but unusable Admin link.
    const deniedHeading = Array.from(document.querySelectorAll<HTMLElement>('h1,h2,h3,div'))
      .find(el => el.textContent?.trim() === 'Admin access required')
    if (deniedHeading?.parentElement) {
      mountAdmin(deniedHeading.parentElement)
    }
  }

  const observer = new MutationObserver(scan)
  observer.observe(document.body, { childList: true, subtree: true })
  scan()
}
