import React,{useEffect,useMemo,useState}from'react'
import{products}from'./data'
import{getManagedResources}from'./resourcesApi'
import{getEvents,type ManagedEvent}from'./eventsApi'
import type{Product,Resource,ResourceType}from'./types'
import AdminConsole from './AdminConsole'
import { getMyProfile, signOut, type VaultProfile } from './authApi'
import AuthScreen, { type AuthMode } from './components/AuthScreen'
import { supabase } from './lib/supabase'
import { triggerDirectDownload } from './utils'
import { openViewer } from './fileViewerBridge'

const Icon=({children}:{children:React.ReactNode})=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
const HomeIcon=()=> <Icon><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22v-8h6v8"/></Icon>
const GridIcon=()=> <Icon><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></Icon>
const DownloadIcon=()=> <Icon><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></Icon>
const CalIcon=()=> <Icon><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></Icon>
const ShieldIcon=()=> <Icon><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></Icon>
const FileIcon=()=> <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></Icon>
const CompanyIcon=()=> <Icon><path d="M4 21V7l8-4 8 4v14"/><path d="M8 21v-5h8v5M8 10h.01M12 10h.01M16 10h.01"/></Icon>
const PanelIcon=({collapsed}:{collapsed:boolean})=> <Icon><rect x="3" y="4" width="18" height="16" rx="2"/><path d={collapsed?'M14 8l4 4-4 4':'M10 8l-4 4 4 4'}/><path d="M9 4v16"/></Icon>
const PlayIcon=()=> <Icon><path d="m8 5 11 7-11 7z"/></Icon>
const Chevron=({open}:{open:boolean})=><span style={{transform:open?'rotate(90deg)':'rotate(0deg)',transition:'transform .15s'}}>›</span>

type View={kind:'home'}|{kind:'product';slug:string}|{kind:'sheshi'}|{kind:'all'}|{kind:'events'}|{kind:'admin'}
const SHESHI_ID='sheshi'
const productOf=(id:string)=>products.find(p=>p.id===id||p.slug===id)
const localDate=(v:string)=>{const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?new Date(+m[1],+m[2]-1,+m[3]):new Date(v)}
const upcoming=(e:ManagedEvent)=>{const d=localDate(e.event_date);d.setHours(0,0,0,0);const n=new Date();n.setHours(0,0,0,0);return d>=n}
const dateText=(v:string)=>localDate(v).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})

function ProductBadge({product}:{product?:Product}){if(!product)return null;return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{background:product.light,color:product.color}}><span className="w-1.5 h-1.5 rounded-full" style={{background:product.color}}/>{product.name}</span>}
function ResourceCard({resource}:{resource:Resource}){const p=resource.productId===SHESHI_ID?{id:SHESHI_ID,name:'Sheshi',slug:'sheshi',color:'#ff5500',light:'#3a2214',description:'Shared Sheshi resources'} as Product:productOf(resource.productId);const isVideo=resource.type==='video';const tags=(resource.tags||[]).filter(Boolean).slice(0,3);return <div data-resource-id={resource.id} data-resource-tags={JSON.stringify(resource.tags||[])} data-resource-type={resource.type} className="group bg-white border border-[var(--line-soft)] rounded-xl overflow-hidden flex flex-col hover:shadow-lg transition-shadow cursor-pointer" onClick={()=>{if(resource.sourceUrl){openViewer(resource.sourceUrl,resource.title,resource.id,(resource.tags||[]),resource.type)}}}><div className="h-40 bg-[var(--canvas-deep)] flex items-center justify-center overflow-hidden relative">{resource.thumbnail?<img src={resource.thumbnail} alt={resource.title} className="w-full h-full object-cover object-left object-top" loading="lazy" onError={e=>{e.currentTarget.style.display='none'}}/>:<FileIcon/>}{isVideo&&<div className="absolute inset-0 flex items-center justify-center bg-black/10"><span className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center"><PlayIcon/></span></div>}{resource.fileFormat&&<span className="absolute top-2 right-2 bg-black/50 text-white rounded px-2 py-1 text-[9px] font-mono font-bold uppercase">{resource.fileFormat}</span>}</div><div className="p-3.5 flex flex-col gap-2 flex-1"><div className="line-clamp-2 text-[20px] leading-[1.15] font-semibold min-h-[46px]">{resource.title}</div>{tags.length>0&&<div className="flex flex-wrap gap-1.5">{tags.map(tag=><span key={tag} className="resource-tag">{tag}</span>)}</div>}<div className="flex items-center gap-2"><ProductBadge product={p}/>{resource.fileSize&&<span className="text-[10px] text-[var(--ink-45)]">{resource.fileSize}</span>}</div><div className="mt-auto flex justify-between items-center text-[11px]"><span className="text-[var(--ink-45)]">{resource.viewCount||0} views</span>{resource.sourceUrl&&<button onClick={(e)=>{e.stopPropagation();if(isVideo){window.open(resource.sourceUrl!,'_blank','noreferrer')}else{triggerDirectDownload(resource.sourceUrl!,resource.title)}}} className="font-semibold text-[var(--ink)] hover:underline border-0 bg-transparent p-0 cursor-pointer">{isVideo?'Open Video':'Download'}</button>}</div></div></div>}
function ResourceGrid({items}:{items:Resource[]}){return items.length?<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">{items.map(x=><ResourceCard key={x.id} resource={x}/>)}</div>:<div className="py-14 text-center text-[13px] text-[var(--ink-45)]">No files here yet.</div>}
function eventFallback(event:ManagedEvent,product?:Product){const a=product?.color||'#ff5500';const b=product?.light||'#222c3a';const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="#0f1319"/></linearGradient><filter id="f"><feGaussianBlur stdDeviation="70"/></filter></defs><rect width="1200" height="700" fill="url(#g)"/><circle cx="920" cy="110" r="240" fill="${b}" opacity=".38" filter="url(#f)"/><circle cx="210" cy="650" r="210" fill="#fff" opacity=".09"/><path d="M700 0C970 120 900 470 1200 610V0Z" fill="#fff" opacity=".06"/><path d="M0 510C250 410 420 590 690 500S980 350 1200 460" fill="none" stroke="#fff" stroke-opacity=".24" stroke-width="2"/><text x="72" y="635" fill="#fff" fill-opacity=".68" font-family="Arial,sans-serif" font-size="20" letter-spacing="4">SHESHI EVENT</text></svg>`;return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg)}
function EventCard({event,hero}:{event:ManagedEvent;hero?:boolean}){const p=productOf(event.product_id||'');const meta=[event.location,event.event_type].filter(Boolean).join(' · ');const[fallback,setFallback]=useState(!event.banner);const src=fallback?eventFallback(event,p):event.banner||eventFallback(event,p);if(hero)return <div className="relative min-h-[240px] rounded-2xl overflow-hidden text-white shadow-sm"><img src={src} className="absolute inset-0 w-full h-full object-cover" alt="" onError={()=>setFallback(true)}/><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/5"/><div className="relative h-full min-h-[240px] p-6 flex flex-col justify-between"><ProductBadge product={p}/><div><div className="font-display text-[clamp(22px,2.2vw,34px)] font-bold leading-tight">{event.title}</div><div className="text-[12px] text-white/75 mt-2">{dateText(event.event_date)}{meta?` · ${meta}`:''}</div></div></div></div>;return <div className="bg-white border border-[var(--line-soft)] rounded-xl overflow-hidden h-full flex flex-col"><img src={src} className="w-full h-36 object-cover" alt="" onError={()=>setFallback(true)}/><div className="p-4 flex-1"><ProductBadge product={p}/><div className="font-semibold text-[14px] mt-2">{event.title}</div><div className="text-[11px] text-[var(--ink-45)] mt-1">{dateText(event.event_date)}{meta?` · ${meta}`:''}</div></div></div>}
function Home({resources,events,onProduct,onSheshi}:{resources:Resource[];events:ManagedEvent[];onProduct:(s:string)=>void;onSheshi:()=>void}){const[name,setName]=useState('');useEffect(()=>setName(localStorage.getItem('sheshi-vault-user-name')||''),[]);const next=events.filter(upcoming).sort((a,b)=>localDate(a.event_date).getTime()-localDate(b.event_date).getTime());const sheshiResources=resources.filter(r=>r.productId===SHESHI_ID);const latest=[...resources].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,5);return <main className="flex-1 overflow-y-auto"><div className="px-8 py-6 max-w-[1400px] space-y-9"><div><div className="text-[11px] font-mono text-[var(--ink-45)] uppercase tracking-wider">{new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}</div><h1 className="font-display welcome-title mt-2">Welcome back{ name&&<> <em>{name}</em></>}</h1></div><section><h2 className="section-heading mb-4">Upcoming</h2>{next.length?<div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><div className="lg:col-span-2"><EventCard event={next[0]} hero/></div><div className="flex flex-col gap-3">{next.slice(1,3).map(e=><EventCard key={e.id} event={e}/>)}</div></div>:<div className="text-[13px] text-[var(--ink-45)] py-6">No upcoming events.</div>}</section><section><div className="flex items-end justify-between gap-4 mb-4"><h2 className="section-heading flex-1">Sheshi</h2>{sheshiResources.length>0&&<button onClick={onSheshi} className="text-[11px] font-semibold text-[var(--primary)] whitespace-nowrap">View all</button>}</div>{sheshiResources.length?<ResourceGrid items={sheshiResources.slice(0,5)}/>:<button onClick={onSheshi} className="w-full text-left rounded-xl border border-[var(--line-soft)] bg-white p-5 text-[13px] text-[var(--ink-45)] hover:shadow-sm">Company files, CEO material, Sheshi information and other shared resources.</button>}</section><section><h2 className="section-heading mb-4">Products</h2><div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{products.map(p=><button key={p.id} onClick={()=>onProduct(p.slug)} className="text-left rounded-xl border border-[var(--line-soft)] p-4 transition-all hover:shadow-md hover:-translate-y-0.5" style={{background:`linear-gradient(135deg,${p.light} 0%,${p.light} 62%,${p.color}18 100%)`,borderColor:`${p.color}35`}}><div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold mb-2" style={{background:p.light,color:p.color,boxShadow:`0 0 0 1px ${p.color}18`}}>{p.name[0]}</div><div className="font-semibold text-[13px]">{p.name}</div><div className="text-[11px] text-[var(--ink-45)] mt-1">{resources.filter(r=>r.productId===p.id||r.productId===p.slug).length} files</div></button>)}</div></section><section className="pb-8"><h2 className="section-heading mb-4">Latest Resources</h2><ResourceGrid items={latest}/></section></div></main>}
function SearchIcon(){return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>}
function ListIcon(){return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>}
function GridViewIcon(){return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>}
function SortIcon(){return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>}

function ResourceListRow({resource}:{resource:Resource}){
  const p=resource.productId===SHESHI_ID?{id:SHESHI_ID,name:'Sheshi',slug:'sheshi',color:'#ff5500',light:'#3a2214',description:'Shared Sheshi resources'} as Product:productOf(resource.productId);
  const isVideo=resource.type==='video';
  const tags=(resource.tags||[]).filter(Boolean).slice(0,3);

  return (
    <div
      className="group bg-white border border-[var(--line-soft)] rounded-xl p-3.5 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer"
      onClick={()=>{if(resource.sourceUrl){openViewer(resource.sourceUrl,resource.title,resource.id,(resource.tags||[]),resource.type)}}}
    >
      <div className="w-12 h-12 rounded-lg bg-[var(--canvas-deep)] flex items-center justify-center overflow-hidden flex-shrink-0 relative border border-[var(--line-soft)]">
        {resource.thumbnail?(
          <img src={resource.thumbnail} alt={resource.title} className="w-full h-full object-cover object-left-top" loading="lazy" onError={e=>{e.currentTarget.style.display='none'}}/>
        ):(
          <FileIcon/>
        )}
        {isVideo&&(
          <span className="absolute inset-0 bg-black/20 flex items-center justify-center text-white">
            <PlayIcon/>
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[14px] text-[var(--ink)] truncate group-hover:text-[var(--primary)] transition-colors">{resource.title}</span>
          {resource.fileFormat&&(
            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border border-slate-200">{resource.fileFormat}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <ProductBadge product={p}/>
          {tags.map(tag=><span key={tag} className="resource-tag">{tag}</span>)}
        </div>
      </div>

      <div className="flex items-center gap-4 text-[12px] flex-shrink-0">
        {resource.fileSize&&<span className="text-[var(--ink-45)] hidden sm:inline">{resource.fileSize}</span>}
        <span className="text-[var(--ink-45)] hidden md:inline">{resource.viewCount||0} views</span>
        {resource.sourceUrl&&(
          <button
            onClick={(e)=>{
              e.stopPropagation();
              if(isVideo){window.open(resource.sourceUrl!,'_blank','noreferrer')}else{triggerDirectDownload(resource.sourceUrl!,resource.title)}
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-[var(--primary)] hover:text-white text-[12px] font-semibold text-[var(--ink-70)] transition-all border border-slate-200 cursor-pointer"
          >
            {isVideo?'Open Video':'Download'}
          </button>
        )}
      </div>
    </div>
  )
}

function SmartResourceExplorer({items}:{items:Resource[]}){
  const [searchQuery,setSearchQuery]=useState('')
  const [activeType,setActiveType]=useState<string>('all')
  const [sortBy,setSortBy]=useState<'newest'|'oldest'|'name'|'views'>('newest')
  const [viewMode,setViewMode]=useState<'grid'|'list'>('grid')

  const typeLabels:Record<string,string>={
    all:'All Files',
    logo:'Logos & Brand Assets',
    brochure:'Brochures',
    video:'Videos',
    document:'Documents',
    other:'Other Files'
  }

  const typeCounts=useMemo(()=>{
    const counts:Record<string,number>={all:items.length,logo:0,brochure:0,video:0,document:0,other:0}
    items.forEach(r=>{
      if(counts[r.type]!==undefined)counts[r.type]++
      else counts.other++
    })
    return counts
  },[items])

  const filteredItems=useMemo(()=>{
    return items.filter(r=>{
      if(activeType!=='all'&&r.type!==activeType)return false
      if(searchQuery.trim()){
        const q=searchQuery.toLowerCase().trim()
        const matchTitle=r.title.toLowerCase().includes(q)
        const matchFormat=(r.fileFormat||'').toLowerCase().includes(q)
        const matchDesc=(r.description||'').toLowerCase().includes(q)
        const matchTags=(r.tags||[]).some(t=>t.toLowerCase().includes(q))
        if(!matchTitle&&!matchFormat&&!matchDesc&&!matchTags)return false
      }
      return true
    })
  },[items,activeType,searchQuery])

  const sortedItems=useMemo(()=>{
    return [...filteredItems].sort((a,b)=>{
      if(sortBy==='newest')return String(b.createdAt||'').localeCompare(String(a.createdAt||''))
      if(sortBy==='oldest')return String(a.createdAt||'').localeCompare(String(b.createdAt||''))
      if(sortBy==='name')return a.title.localeCompare(b.title)
      if(sortBy==='views')return(b.viewCount||0)-(a.viewCount||0)
      return 0
    })
  },[filteredItems,sortBy])

  const availableTypes=['all','logo','brochure','video','document','other'].filter(
    t=>t==='all'||typeCounts[t]>0
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3 rounded-2xl border border-[var(--line-soft)] shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-45)]">
            <SearchIcon/>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={e=>setSearchQuery(e.target.value)}
            placeholder="Search files by name, tags, or format..."
            className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-[var(--line-soft)] rounded-xl text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-45)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:bg-white transition-all"
          />
          {searchQuery&&(
            <button
              onClick={()=>setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-45)] hover:text-[var(--ink)] text-[12px] font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 justify-between md:justify-end">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-[var(--line-soft)] rounded-xl px-3 py-1.5 text-[12px] text-[var(--ink-70)]">
            <SortIcon/>
            <select
              value={sortBy}
              onChange={e=>setSortBy(e.target.value as any)}
              className="bg-transparent border-0 font-medium text-[var(--ink)] focus:outline-none cursor-pointer pr-1"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Title (A-Z)</option>
              <option value="views">Most Viewed</option>
            </select>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-[var(--line-soft)]">
            <button
              onClick={()=>setViewMode('grid')}
              title="Grid View"
              className={`p-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                viewMode==='grid'?'bg-white text-[var(--ink)] shadow-sm':'text-[var(--ink-45)] hover:text-[var(--ink)]'
              }`}
            >
              <GridViewIcon/>
            </button>
            <button
              onClick={()=>setViewMode('list')}
              title="Dashboard List View"
              className={`p-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                viewMode==='list'?'bg-white text-[var(--ink)] shadow-sm':'text-[var(--ink-45)] hover:text-[var(--ink)]'
              }`}
            >
              <ListIcon/>
            </button>
          </div>
        </div>
      </div>

      {items.length>0&&availableTypes.length>1&&(
        <div className="flex items-center gap-2 flex-wrap">
          {availableTypes.map(typeKey=>{
            const isActive=activeType===typeKey
            return (
              <button
                key={typeKey}
                onClick={()=>setActiveType(typeKey)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ?'bg-[var(--primary)] text-white shadow-sm'
                    :'bg-white border border-[var(--line-soft)] text-[var(--ink-70)] hover:bg-slate-50'
                }`}
              >
                <span>{typeLabels[typeKey]}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive?'bg-white/20 text-white':'bg-slate-100 text-[var(--ink-45)]'
                  }`}
                >
                  {typeCounts[typeKey]}
                </span>
              </button>
            )
          })}

          {(activeType!=='all'||searchQuery)&&(
            <button
              onClick={()=>{
                setActiveType('all')
                setSearchQuery('')
              }}
              className="text-[12px] font-semibold text-red-600 hover:underline px-2 py-1 ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {sortedItems.length>0?(
        viewMode==='grid'?(
          <ResourceGrid items={sortedItems}/>
        ):(
          <div className="flex flex-col gap-2.5">
            {sortedItems.map(item=>(
              <ResourceListRow key={item.id} resource={item}/>
            ))}
          </div>
        )
      ):(
        <div className="py-14 text-center bg-white rounded-2xl border border-[var(--line-soft)] p-8">
          <div className="text-[15px] font-semibold text-[var(--ink)] mb-1">No matching files found</div>
          <div className="text-[13px] text-[var(--ink-45)]">
            {searchQuery
              ?`No files match your search query "${searchQuery}".`
              :'No files are available for the selected type.'}
          </div>
          {(searchQuery||activeType!=='all')&&(
            <button
              onClick={()=>{
                setSearchQuery('')
                setActiveType('all')
              }}
              className="mt-4 px-4 py-2 bg-[var(--primary)] text-white rounded-xl text-[12px] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function SheshiPage({resources}:{resources:Resource[]}){
  const items=resources.filter(r=>r.productId===SHESHI_ID||r.productId==='sheshi');
  return <main className="flex-1 overflow-y-auto">
    <div className="px-8 py-6 max-w-[1400px]">
      <div className="mb-8 pb-6 border-b border-[var(--line-soft)]">
        <div className="text-[11px] font-mono text-[var(--ink-45)] uppercase tracking-wider">Company Library</div>
        <h1 className="font-display text-[clamp(36px,5vw,72px)] font-bold leading-none mt-2">Sheshi</h1>
        <p className="text-[13px] text-[var(--ink-45)] mt-3">CEO materials, company information, photography, messages and shared Sheshi resources.</p>
      </div>
      <div className="pb-8">
        <SmartResourceExplorer items={items}/>
      </div>
    </div>
  </main>
}
function ProductPage({product,resources}:{product:Product;resources:Resource[]}){
  const items = resources.filter(r => r.productId === product.id || r.productId === product.slug);
  return <main className="flex-1 overflow-y-auto">
    <div className="px-8 py-6 max-w-[1400px]">
      <div className="flex gap-4 items-center mb-8 pb-6 border-b border-[var(--line-soft)]">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold" style={{background:product.light,color:product.color}}>{product.name[0]}</div>
        <div>
          <h1 className="font-display text-[24px] font-bold">{product.name}</h1>
          <p className="text-[13px] text-[var(--ink-45)]">{product.description}</p>
        </div>
      </div>
      <div className="pb-8">
        <SmartResourceExplorer items={items}/>
      </div>
    </div>
  </main>
}
function AllResources({resources}:{resources:Resource[]}){
  const [product,setProduct]=useState('');
  const items=product?resources.filter(r=>r.productId===product||productOf(r.productId)?.slug===product||productOf(r.productId)?.id===product):resources;
  return <main className="flex-1 overflow-y-auto">
    <div className="px-8 py-6 max-w-[1400px]">
      <h1 className="font-display text-[22px] font-bold mb-5">All Resources</h1>
      <div className="flex gap-2 flex-wrap mb-5">
        <button onClick={()=>setProduct('')} className={`px-3 py-1.5 rounded-full text-[12px] cursor-pointer ${!product?'bg-[var(--primary)] text-white':'bg-white border border-[var(--line-soft)]'}`}>All Products</button>
        {products.map(p=><button key={p.id} onClick={()=>setProduct(p.id)} className={`px-3 py-1.5 rounded-full text-[12px] cursor-pointer ${product===p.id?'text-white':'bg-white border border-[var(--line-soft)]'}`} style={product===p.id?{background:p.color}:undefined}>{p.name}</button>)}
      </div>
      <SmartResourceExplorer items={items}/>
    </div>
  </main>
}
function Events({events}:{events:ManagedEvent[]}){const future=events.filter(upcoming).sort((a,b)=>localDate(a.event_date).getTime()-localDate(b.event_date).getTime());const past=events.filter(e=>!upcoming(e)).sort((a,b)=>localDate(b.event_date).getTime()-localDate(a.event_date).getTime());return <main className="flex-1 overflow-y-auto"><div className="px-8 py-6 max-w-[1400px] space-y-8"><h1 className="font-display text-[22px] font-bold">Events</h1><section><h2 className="section-heading mb-4">Upcoming</h2>{future.length?<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{future.map(e=><EventCard key={e.id} event={e}/>)}</div>:<div className="py-10 text-[13px] text-[var(--ink-45)]">No upcoming events.</div>}</section>{past.length>0&&<section><h2 className="section-heading mb-4">Past</h2><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">{past.map(e=><EventCard key={e.id} event={e}/>)}</div></section>}</div></main>}
function Sidebar({view,onView,isAdmin,profile,onSignOut,onOpenAuth}:{view:View;onView:(v:View)=>void;isAdmin:boolean;profile:VaultProfile|null;onSignOut:()=>void;onOpenAuth:(mode:AuthMode)=>void}){const[open,setOpen]=useState(true);const[collapsed,setCollapsed]=useState(false);const nav=(active:boolean)=>'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] '+(active?'bg-[var(--primary)] text-white':'text-[var(--ink-70)]');const label=(text:string)=>!collapsed&&<span>{text}</span>;const isAdvanced = profile ? (profile.role === 'advanced' || profile.role === 'teammate') && profile.status === 'approved' : false;return <aside className={(collapsed?'w-[64px]':'w-[236px]')+' flex-shrink-0 flex flex-col bg-white border-r border-[var(--line)] transition-all duration-200'}><div className={'h-16 flex items-center '+(collapsed?'justify-center px-2':'justify-between px-4')+' border-b border-[var(--line-soft)]'}><span className={'font-display '+(collapsed?'hidden':'text-[19px]')+' font-bold tracking-[-.02em]'}>Sheshi Vault</span><button onClick={()=>setCollapsed(!collapsed)} aria-label={collapsed?'Expand sidebar':'Collapse sidebar'} title={collapsed?'Expand sidebar':'Collapse sidebar'} className="w-8 h-8 rounded-md flex items-center justify-center text-[var(--ink-45)] hover:bg-[var(--canvas-deep)]"><PanelIcon collapsed={collapsed}/></button></div><nav className={'flex-1 overflow-y-auto '+(collapsed?'px-2':'px-2.5')+' py-3'}><button title="Home" onClick={()=>onView({kind:'home'})} className={nav(view.kind==='home')}><HomeIcon/>{label('Home')}</button><button title="Sheshi" onClick={()=>onView({kind:'sheshi'})} className={nav(view.kind==='sheshi')}><CompanyIcon/>{label('Sheshi')}</button><button title="Products" onClick={()=>{if(collapsed)setCollapsed(false);setOpen(!open)}} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-[var(--ink-70)]"><GridIcon/>{!collapsed&&<><span className="flex-1 text-left">Products</span><Chevron open={open}/></>}</button>{open&&!collapsed&&<div className="ml-3 pl-3 border-l border-[var(--line-soft)]">{products.map(p=><button key={p.id} onClick={()=>onView({kind:'product',slug:p.slug})} className={'w-full flex gap-2 px-2.5 py-1.5 text-left rounded-md text-[12.5px] '+(view.kind==='product'&&view.slug===p.slug?'font-semibold':'text-[var(--ink-45)]')}><span className="w-1.5 h-1.5 rounded-full mt-1.5" style={{background:p.color}}/>{p.name}</button>)}</div>}<button title="Events" onClick={()=>onView({kind:'events'})} className={nav(view.kind==='events')}><CalIcon/>{label('Events')}</button><button title="All Resources" onClick={()=>onView({kind:'all'})} className={nav(view.kind==='all')}><DownloadIcon/>{label('All Resources')}</button>{isAdmin&&<div className="mt-2 pt-2 border-t border-[var(--line-soft)]"><button title="Admin" onClick={()=>onView({kind:'admin'})} className={nav(view.kind==='admin')}><ShieldIcon/>{label('Admin')}</button></div>}{isAdvanced&&!isAdmin&&<div className="mt-2 pt-2 border-t border-[var(--line-soft)]"><button title="Upload Files" onClick={()=>onView({kind:'admin'})} className={nav(view.kind==='admin')}><ShieldIcon/>{label('Upload Files')}</button></div>}</nav><div className="p-3 border-t border-[var(--line-soft)]">{profile?<div className="flex flex-col gap-2">{!collapsed&&<div className="px-1"><div className="text-[12.5px] font-semibold text-[var(--ink)] truncate">{profile.full_name||profile.email}</div><div className="text-[11px] text-[var(--ink-45)] truncate flex items-center justify-between mt-0.5"><span>{profile.email}</span>{profile.role!=='teammate'&&<span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase ${profile.role==='admin'?'bg-amber-100 text-amber-800':'bg-gray-100 text-gray-700'}`}>{profile.role}</span>}</div></div>}<button onClick={onSignOut} className="w-full py-1.5 px-3 rounded-lg border border-[var(--line-soft)] text-[12px] font-semibold text-red-600 hover:bg-red-50 transition-colors">Sign Out</button></div>:<div className="flex flex-col gap-2">{!collapsed&&<div className="text-[11px] text-[var(--ink-45)] px-1">Sign in to access admin features and private resources.</div>}<button onClick={()=>onOpenAuth('login')} className="w-full py-2 px-3 rounded-lg bg-[var(--primary)] text-white text-[12px] font-semibold hover:opacity-90 transition-opacity">Sign In / Register</button></div>}</div></aside>}
export default function LiveApp(){const[view,setView]=useState<View>({kind:'home'});const[resources,setResources]=useState<Resource[]>([]);const[events,setEvents]=useState<ManagedEvent[]>([]);const[profile,setProfile]=useState<VaultProfile|null>(null);const[isAdmin,setIsAdmin]=useState(false);const[authLoading,setAuthLoading]=useState(true);const[dbError,setDbError]=useState<string|null>(null);const[showAuthModal,setShowAuthModal]=useState(false);const[authMode,setAuthMode]=useState<AuthMode>('login');const fetchProfile=async()=>{try{const p=await getMyProfile();setProfile(p);setIsAdmin(p?.role==='admin'&&p?.status==='approved')}finally{setAuthLoading(false)}};useEffect(()=>{if(window.location.hash.includes('reset-password')){setAuthMode('reset');setShowAuthModal(true)}const loadResources=()=>getManagedResources().then(res=>{setResources(res);setDbError(null)}).catch((err)=>{setResources([]);const msg=String(err?.message||err);if(msg.includes('permission denied')){setDbError('Supabase Database Permission Error: Table access is denied for the anon role.')}});loadResources();getEvents().then(setEvents).catch(()=>setEvents([]));fetchProfile();const{data:authListener}=supabase.auth.onAuthStateChange((event)=>{fetchProfile();loadResources();if(event==='PASSWORD_RECOVERY'){setAuthMode('reset');setShowAuthModal(true)}});window.addEventListener('vault-resources-changed',loadResources);return()=>{authListener.subscription.unsubscribe();window.removeEventListener('vault-resources-changed',loadResources)}},[]);const isAdvanced = profile ? (profile.role === 'advanced' || profile.role === 'teammate') && profile.status === 'approved' : false;useEffect(()=>{if(view.kind==='admin'&&!isAdmin&&!isAdvanced)setView({kind:'home'})},[view,isAdmin,isAdvanced]);const product=view.kind==='product'?products.find(p=>p.slug===view.slug):undefined;if(authLoading){return <div className="flex h-screen w-screen items-center justify-center bg-[var(--canvas)]"><div className="w-8 h-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin"/></div>}if(!profile){return <div className="flex h-screen w-screen items-center justify-center bg-[var(--canvas)] overflow-hidden relative"><AuthScreen initialMode={authMode} onSuccess={()=>{fetchProfile();setView({kind:'home'})}}/></div>}return <div className="flex h-screen bg-[var(--canvas)] overflow-hidden"><Sidebar view={view} onView={setView} isAdmin={isAdmin} profile={profile} onSignOut={async()=>{await signOut();setProfile(null);setIsAdmin(false);setView({kind:'home'})}} onOpenAuth={(mode)=>{setAuthMode(mode);setShowAuthModal(true)}}/><div className="flex-1 flex flex-col min-w-0 overflow-hidden">{dbError&&<div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 px-6 py-2.5 text-[12px] flex items-center justify-between font-medium z-50 flex-shrink-0"><span>⚠️ {dbError} Run the SQL script below in your Supabase SQL Editor to grant table access.</span><a href="https://supabase.com/dashboard/project/ikkyziyugrnkolqnrxfo/sql/new" target="_blank" rel="noreferrer" className="underline font-semibold ml-4 hover:text-amber-950">Open Supabase SQL Editor</a></div>}<div className="flex-1 flex min-h-0 overflow-hidden">{view.kind==='home'?<Home resources={resources} events={events} onProduct={slug=>setView({kind:'product',slug})} onSheshi={()=>setView({kind:'sheshi'})}/>:view.kind==='sheshi'?<SheshiPage resources={resources}/>:view.kind==='product'&&product?<ProductPage product={product} resources={resources}/>:view.kind==='all'?<AllResources resources={resources}/>:view.kind==='events'?<Events events={events}/>:view.kind==='admin'&&(isAdmin||isAdvanced)?<AdminConsole/>:<Home resources={resources} events={events} onProduct={slug=>setView({kind:'product',slug})} onSheshi={()=>setView({kind:'sheshi'})}/>}</div></div>{showAuthModal&&<AuthScreen initialMode={authMode} onSuccess={()=>{setShowAuthModal(false);fetchProfile()}}/>}</div>}