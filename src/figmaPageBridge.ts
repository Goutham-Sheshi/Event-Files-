import { getFigmaResources } from './api';

const ROOT_ID = 'figma-page-browser';
const STYLE_ID = 'figma-page-browser-style';
type FigmaSection = { id: string; title: string; pageName?: string; thumbnail?: string; sourceUrl?: string; };
const naturalCompare = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style'); style.id = STYLE_ID;
  style.textContent = `#${ROOT_ID}{display:grid;grid-template-columns:230px minmax(0,1fr);gap:28px;min-height:520px;padding-bottom:32px}#${ROOT_ID} .fpb-pages{border-right:1px solid var(--line-soft);padding-right:14px;min-width:0}#${ROOT_ID} .fpb-pages-label{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;font-weight:700;letter-spacing:.12em;color:var(--ink-45);margin:2px 0 10px;padding:0 10px}#${ROOT_ID} .fpb-page{width:100%;display:flex;align-items:center;gap:9px;border:0;background:transparent;border-radius:7px;padding:9px 10px;text-align:left;color:var(--ink-70);cursor:pointer;min-width:0;font-size:12.5px}#${ROOT_ID} .fpb-page:hover{background:var(--canvas-deep);color:var(--ink)}#${ROOT_ID} .fpb-page[data-active="true"]{background:var(--primary-soft);color:var(--primary);font-weight:700}#${ROOT_ID} .fpb-page-num{width:18px;flex:0 0 18px;text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;opacity:.65}#${ROOT_ID} .fpb-page-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#${ROOT_ID} .fpb-content{min-width:0}#${ROOT_ID} .fpb-kicker{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;font-weight:700;letter-spacing:.12em;color:var(--ink-45);text-transform:uppercase;margin-bottom:5px}#${ROOT_ID} .fpb-heading{font-family:inherit;font-size:22px;font-weight:700;color:var(--ink);margin:0 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#${ROOT_ID} .fpb-sub{font-size:12px;color:var(--ink-45);margin-bottom:18px}#${ROOT_ID} .fpb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}#${ROOT_ID} .fpb-card{display:flex;flex-direction:column;min-width:0;background:#fff;border:1px solid var(--line-soft);border-radius:12px;overflow:hidden;transition:transform .18s,box-shadow .18s}#${ROOT_ID} .fpb-card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(0,0,0,.08)}#${ROOT_ID} .fpb-preview{height:150px;background:var(--canvas-deep);display:flex;align-items:center;justify-content:center;overflow:hidden}#${ROOT_ID} .fpb-preview img{width:100%;height:100%;object-fit:cover;display:block}#${ROOT_ID} .fpb-placeholder{font-size:11px;color:var(--ink-45)}#${ROOT_ID} .fpb-card-body{padding:12px;display:flex;flex-direction:column;gap:10px;min-width:0}#${ROOT_ID} .fpb-title{font-size:13px;font-weight:650;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#${ROOT_ID} .fpb-open{font-size:11px;font-weight:700;color:var(--primary);text-decoration:none;display:inline-flex;align-items:center;gap:4px;width:max-content}#${ROOT_ID} .fpb-empty{padding:40px 0;color:var(--ink-45);font-size:13px}@media(max-width:900px){#${ROOT_ID}{grid-template-columns:1fr;gap:18px}#${ROOT_ID} .fpb-pages{border-right:0;border-bottom:1px solid var(--line-soft);padding:0 0 12px;display:flex;gap:4px;overflow-x:auto}#${ROOT_ID} .fpb-pages-label{display:none}#${ROOT_ID} .fpb-page{width:auto;flex:0 0 auto;max-width:220px}}`;
  document.head.appendChild(style);
}
function exactText(node: Element) { return node.textContent?.replace(/\s+/g, ' ').trim() || ''; }
function findFigmaHeading() { return Array.from(document.querySelectorAll<HTMLElement>('h1')).find(node => exactText(node) === 'Figma Files') || null; }
function buildBrowser(sections: FigmaSection[]) {
  const root = document.createElement('div'); root.id = ROOT_ID;
  const pagesEl = document.createElement('aside'); pagesEl.className = 'fpb-pages';
  const label = document.createElement('div'); label.className = 'fpb-pages-label'; label.textContent = 'PAGES'; pagesEl.appendChild(label);
  const content = document.createElement('section'); content.className = 'fpb-content'; root.append(pagesEl, content);
  const byPage = new Map<string, FigmaSection[]>();
  sections.forEach(section => { const page = section.pageName || 'Untitled Page'; if (!byPage.has(page)) byPage.set(page, []); byPage.get(page)!.push(section); });
  const pages = Array.from(byPage.keys()).sort(naturalCompare);
  const renderPage = (pageName: string) => {
    content.innerHTML = ''; const pageSections = [...(byPage.get(pageName) || [])].sort((a,b) => naturalCompare(a.title,b.title));
    const kicker = document.createElement('div'); kicker.className='fpb-kicker'; kicker.textContent=`Page · ${pageSections.length} section${pageSections.length===1?'':'s'}`;
    const heading = document.createElement('h2'); heading.className='fpb-heading'; heading.title=pageName; heading.textContent=pageName;
    const sub = document.createElement('div'); sub.className='fpb-sub'; sub.textContent='Final Figma sections only';
    const grid = document.createElement('div'); grid.className='fpb-grid';
    if (!pageSections.length) grid.innerHTML='<div class="fpb-empty">No final sections on this page.</div>';
    pageSections.forEach(section => { const card=document.createElement('article'); card.className='fpb-card'; const preview=document.createElement('div'); preview.className='fpb-preview'; if(section.thumbnail){const img=document.createElement('img');img.src=section.thumbnail;img.alt=section.title;img.loading='lazy';preview.appendChild(img);}else{const ph=document.createElement('span');ph.className='fpb-placeholder';ph.textContent='No preview';preview.appendChild(ph);} const body=document.createElement('div');body.className='fpb-card-body'; const title=document.createElement('div');title.className='fpb-title';title.title=section.title;title.textContent=section.title; const open=document.createElement('a');open.className='fpb-open';open.textContent='Open in Figma ↗';open.href=section.sourceUrl||'#';open.target='_blank';open.rel='noreferrer';body.append(title,open);card.append(preview,body);grid.appendChild(card); });
    content.append(kicker,heading,sub,grid); pagesEl.querySelectorAll<HTMLElement>('.fpb-page').forEach(button => button.dataset.active = button.dataset.page===pageName?'true':'false');
  };
  pages.forEach((pageName,index)=>{const button=document.createElement('button');button.type='button';button.className='fpb-page';button.dataset.page=pageName;const num=document.createElement('span');num.className='fpb-page-num';num.textContent=String(index+1);const name=document.createElement('span');name.className='fpb-page-name';name.title=pageName;name.textContent=pageName;button.append(num,name);button.onclick=()=>renderPage(pageName);pagesEl.appendChild(button);});
  if(pages.length) renderPage(pages[0]); else content.innerHTML='<div class="fpb-empty">No final Figma sections have been synced yet.</div>';
  return root;
}
async function mount() {
  const heading=findFigmaHeading(); if(!heading) return false; const shell=heading.closest('.flex-1') || heading.parentElement?.parentElement; if(!shell) return false; if(document.getElementById(ROOT_ID)) return true;
  const { resources }=await getFigmaResources(); const sections=(resources as any[]).filter(resource=>resource.type==='figma'); const browser=buildBrowser(sections);
  const panel=Array.from(shell.querySelectorAll<HTMLElement>('.flex.items-center.gap-2.mb-5')).find(node=>node.textContent?.includes('All Products')); const grid=panel?.nextElementSibling as HTMLElement|null; if(panel)panel.style.display='none';if(grid)grid.style.display='none';(grid||panel||heading.parentElement)?.insertAdjacentElement('afterend',browser); return true;
}
export function startFigmaPageBridge(){injectStyles();let mounting=false;const boot=async()=>{if(mounting||document.getElementById(ROOT_ID))return;mounting=true;try{await mount();}finally{mounting=false;}};const observer=new MutationObserver(()=>{void boot();});observer.observe(document.body,{childList:true,subtree:true});void boot();}
