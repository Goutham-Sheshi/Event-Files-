import { createRoot, type Root } from 'react-dom/client'
import AdminConsole from './AdminConsole'
import { getMyProfile } from './authApi'

let mounted: HTMLElement | null = null
let root: Root | null = null
function mountConsole(target: HTMLElement) { if (mounted === target && target.querySelector('[data-admin-console="true"]')) return; root?.unmount(); mounted = target; target.innerHTML=''; target.className='flex-1 min-w-0 min-h-0 self-stretch overflow-y-auto'; root=createRoot(target); root.render(<AdminConsole />) }

export function startAdminBridge() {
  let scanning=false
  const scan=async()=>{ if(scanning)return; scanning=true; try { const existing=document.querySelector<HTMLElement>('[data-admin-console="true"]'); if(existing)return; const denied=Array.from(document.querySelectorAll<HTMLElement>('h1,h2,h3,div')).find(el=>el.textContent?.trim()==='Admin access required'); const legacy=Array.from(document.querySelectorAll<HTMLElement>('div')).find(el=>el.textContent?.trim()==='Admin Console'); const target=denied?.closest('main')||denied?.parentElement?.parentElement||denied?.parentElement||legacy?.closest('main')||legacy; if(!target)return; const profile=await getMyProfile(); if(profile?.role==='admin'||profile?.role==='teammate') mountConsole(target) } finally { scanning=false } }
  const observer=new MutationObserver(()=>queueMicrotask(scan)); observer.observe(document.body,{childList:true,subtree:true}); scan(); window.setTimeout(scan,100); window.setTimeout(scan,500)
}
