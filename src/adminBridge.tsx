import { createRoot, type Root } from 'react-dom/client'
import AdminConsole from './AdminConsole'

let mounted: HTMLElement | null = null
let root: Root | null = null

function mountAdmin(target: HTMLElement) {
  if (mounted === target && target.querySelector('[data-admin-console="true"]')) return

  root?.unmount()
  mounted = target

  target.innerHTML = ''
  target.className = 'flex-1 min-w-0 min-h-0 self-stretch overflow-y-auto'
  target.style.height = ''
  target.style.minHeight = ''
  target.style.overflowY = ''

  root = createRoot(target)
  root.render(<AdminConsole />)
}

export function startAdminBridge() {
  const scan = () => {
    const adminConsole = document.querySelector<HTMLElement>('[data-admin-console="true"]')
    if (adminConsole) return

    const denied = Array.from(document.querySelectorAll<HTMLElement>('h1,h2,h3,div'))
      .find(el => el.textContent?.trim() === 'Admin access required')

    if (denied) {
      // Mount into the actual page pane, not the small message wrapper. The old
      // guard is still part of the legacy LiveApp render tree, so replacing the
      // pane itself makes the Admin route deterministic while auth is disabled.
      const pane = denied.closest('main') || denied.parentElement?.parentElement || denied.parentElement
      if (pane) mountAdmin(pane)
      return
    }

    const legacy = Array.from(document.querySelectorAll<HTMLElement>('div'))
      .find(el => el.textContent?.trim() === 'Admin Console')
    if (legacy) mountAdmin(legacy.closest('main') || legacy)
  }

  const observer = new MutationObserver(() => queueMicrotask(scan))
  observer.observe(document.body, { childList: true, subtree: true })

  scan()
  window.setTimeout(scan, 50)
  window.setTimeout(scan, 250)
  window.setTimeout(scan, 1000)
}
