export function startAdminLabelBridge() {
  const scan = () => {
    const titles = Array.from(document.querySelectorAll('h1')) as HTMLElement[]
    titles.forEach(title => {
      if (title.textContent?.trim() !== 'Events') return
      const scope = title.parentElement?.parentElement
      const hasAddButton = Array.from(scope?.querySelectorAll('button') || []).some(button => button.textContent?.trim() === '+ Add Event')
      if (hasAddButton) title.textContent = 'Event Management'
    })
  }
  const observer = new MutationObserver(scan)
  observer.observe(document.body, { childList: true, subtree: true })
  scan()
}
