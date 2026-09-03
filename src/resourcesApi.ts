import { supabase } from './lib/supabase'
import { getMyProfile } from './authApi'
import type { ContentStatus, Resource, ResourceType, VideoCategory } from './types'

export type ManagedResource = Resource & { storagePath?:string; created_at?:string; updated_at?:string; uploadedBy?:string; uploadedByName?:string; deletedAt?:string }

export type ResourceInput = {
  title: string;
  description?: string | null;
  type: ResourceType;
  productId: string;
  tags?: string[];
  videoCategory?: VideoCategory;
  contentStatus?: ContentStatus;
  isOfficial?: boolean;
  version?: string;
  parentResourceId?: string;
  featured?: boolean;
}

const STORAGE_BUCKET='event-assets',SIGNED_URL_TTL=60*30,IMAGE_EXT=/\.(png|jpe?g|gif|webp|svg|avif)(?:[?#].*)?$/i,PDF_EXT=/\.pdf(?:[?#].*)?$/i,PDFJS_VERSION='4.10.38';let pdfjsPromise:Promise<any>|null=null
const safeName=(n:string)=>n.toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
const isImageFile=(r:any)=>IMAGE_EXT.test(String(r.source_url||''))||['png','jpg','jpeg','gif','webp','svg','avif'].includes(String(r.file_format||'').toLowerCase())
const isPdfFile=(r:any)=>PDF_EXT.test(String(r.source_url||''))||String(r.file_format||'').toLowerCase()==='pdf'
async function getPdfJs(){if(!pdfjsPromise){const u=`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.mjs`;pdfjsPromise=import(/* @vite-ignore */u).then((p:any)=>{p.GlobalWorkerOptions.workerSrc=`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;return p})}return pdfjsPromise}
async function renderPdfPreview(b:Blob){try{const p=await getPdfJs(),pdf=await p.getDocument({data:new Uint8Array(await b.arrayBuffer())}).promise,page=await pdf.getPage(1),base=page.getViewport({scale:1}),v=page.getViewport({scale:Math.min(2,Math.max(.6,900/Math.max(base.width,base.height)))}),c=document.createElement('canvas');c.width=Math.floor(v.width);c.height=Math.floor(v.height);const x=c.getContext('2d',{alpha:false});if(!x)return null;x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);await page.render({canvasContext:x,viewport:v}).promise;return await new Promise<Blob|null>(r=>c.toBlob(r,'image/png',.9))}catch(e){console.warn('Could not generate PDF preview',e);return null}}
async function uploadPdfPreview(b:Blob,p:string){const q=`${p}.preview.png`,{error}=await supabase.storage.from(STORAGE_BUCKET).upload(q,b,{cacheControl:'31536000',upsert:true,contentType:'image/png'});return error?null:q}
async function signedUrl(p:string|null|undefined){if(!p||/^https?:\/\//i.test(p))return p||undefined;const{data,error}=await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(p,SIGNED_URL_TTL);return error?undefined:data.signedUrl}
export function getErrorMessage(e:unknown,f='Something went wrong'){if(e instanceof Error&&e.message)return e.message;if(e&&typeof e==='object'){const v=e as Record<string,unknown>;for(const k of['message','error_description','error','details','hint'])if(typeof v[k]==='string'&&v[k])return v[k] as string;try{return JSON.stringify(e)}catch{}}return f}
export function generateSharePointVideoThumbnail(title: string, isFolder: boolean = false): string {
  const cleanTitle = (title || 'SharePoint Video').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const badgeText = isFolder ? 'SHAREPOINT FOLDER' : 'SHAREPOINT VIDEO';
  const bgGradA = isFolder ? '#0f172a' : '#090d16';
  const bgGradB = isFolder ? '#1e293b' : '#1e1b4b';
  const accent = isFolder ? '#0284c7' : '#4f46e5';

  const displayTitle = cleanTitle.length > 40 ? cleanTitle.slice(0, 40) + '…' : cleanTitle;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bgGradA}"/>
        <stop offset="100%" stop-color="${bgGradB}"/>
      </linearGradient>
      <linearGradient id="glow" x1="0.8" y1="0.2" x2="0.2" y2="0.8">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#ec4899" stop-opacity="0.15"/>
      </linearGradient>
      <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="50"/>
      </filter>
    </defs>

    <rect width="800" height="400" fill="url(#bg)"/>
    <circle cx="680" cy="80" r="220" fill="url(#glow)" filter="url(#blur)"/>
    <circle cx="100" cy="350" r="180" fill="${accent}" opacity="0.2" filter="url(#blur)"/>

    <path d="M-50 280 Q 250 180 850 320" fill="none" stroke="#ffffff" stroke-opacity="0.06" stroke-width="2"/>
    <path d="M-50 220 Q 350 340 850 180" fill="none" stroke="${accent}" stroke-opacity="0.25" stroke-width="2.5"/>

    <rect x="36" y="32" width="${badgeText.length * 8.5 + 20}" height="26" rx="6" fill="#ffffff" fill-opacity="0.1"/>
    <rect x="36" y="32" width="${badgeText.length * 8.5 + 20}" height="26" rx="6" fill="none" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1"/>
    <text x="46" y="49" fill="#ffffff" fill-opacity="0.9" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" letter-spacing="1.2">${badgeText}</text>

    <text x="400" y="225" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="700" text-anchor="middle" opacity="0.95">${displayTitle}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function getVideoThumbnailUrl(url: string | null | undefined, title?: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();
  const ytMatch = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }
  const vimeoMatch = cleanUrl.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
  }
  const loomMatch = cleanUrl.match(/loom\.com\/(?:share|embed)\/([a-f0-9]{32})/i);
  if (loomMatch && loomMatch[1]) {
    return `https://cdn.loom.com/sessions/thumbnails/${loomMatch[1]}-with-play.gif`;
  }
  const driveMatch = cleanUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w800`;
  }
  const oneDriveResIdMatch = cleanUrl.match(/[?&]resid=([a-zA-Z0-9!_-]+)/i);
  const oneDriveAuthKeyMatch = cleanUrl.match(/[?&]authkey=([a-zA-Z0-9!_-]+)/i);
  if (oneDriveResIdMatch && oneDriveResIdMatch[1]) {
    const resid = oneDriveResIdMatch[1];
    const authkey = oneDriveAuthKeyMatch ? `&authkey=${encodeURIComponent(oneDriveAuthKeyMatch[1])}` : '';
    return `https://onedrive.live.com/tile?resid=${resid}${authkey}&width=800`;
  }
  if (/1drv\.ms|onedrive\.live\.com|sharepoint\.com/i.test(cleanUrl)) {
    const isFolder = /\/:f:\//i.test(cleanUrl);
    return generateSharePointVideoThumbnail(title || 'SharePoint Video', isFolder);
  }
  return null;
}

const mapRow = (r: any, u: string, t?: string): ManagedResource => ({
  id: r.id,
  title: r.title,
  description: r.description || undefined,
  type: r.type as ResourceType,
  productId: r.product_id,
  thumbnail: t,
  sourceUrl: u,
  storagePath: r.storage_path || undefined,
  fileFormat: r.file_format || undefined,
  fileSize: r.file_size || undefined,
  tags: r.tags || [],
  videoCategory: r.video_category as VideoCategory || undefined,
  contentStatus: (r.content_status || 'Active') as ContentStatus,
  isOfficial: r.is_official || r.content_status === 'Official',
  version: r.version || 'v1.0',
  parentResourceId: r.parent_resource_id || undefined,
  viewCount: r.view_count || 0,
  downloadCount: r.download_count || 0,
  featured: r.featured || false,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  uploadedBy: r.uploaded_by || undefined,
  uploadedByName: r.uploaded_by_name || undefined,
  deletedAt: r.deleted_at || undefined,
})

async function hydrateRow(r:any){if(r.storage_path){const u=(await signedUrl(r.storage_path))||'',p=isImageFile(r)?r.storage_path:isPdfFile(r)?`${r.storage_path}.preview.png`:undefined;return mapRow(r,u,p?await signedUrl(p):undefined)}const autoThumb=r.thumbnail||(r.type==='video'?getVideoThumbnailUrl(r.source_url,r.title):isImageFile(r)?r.source_url||undefined:undefined);return mapRow(r,r.source_url||'',autoThumb||undefined)}
async function ensurePdfPreview(r:any){if(!isPdfFile(r)||r.thumbnail||!r.storage_path)return r;try{const{data:f,error}=await supabase.storage.from(STORAGE_BUCKET).download(r.storage_path);if(error||!f)return r;const p=await renderPdfPreview(f);if(!p)return r;const t=await uploadPdfPreview(p,r.storage_path);if(!t)return r;const{error:e}=await supabase.from('vault_resources').update({thumbnail:t}).eq('id',r.id);return e?r:{...r,thumbnail:t}}catch{return r}}
export async function getManagedResources(){const{data,error}=await supabase.from('vault_resources').select('*').order('created_at',{ascending:false});if(error)throw new Error(`Could not load files: ${getErrorMessage(error)}`);return Promise.all((await Promise.all((data||[]).map(ensurePdfPreview))).map(hydrateRow))}
async function uploader(){const p=await getMyProfile();return{uploaded_by:p?.id||null,uploaded_by_name:p?.full_name||null}}
export async function createLinkedVideo(i:ResourceInput,url:string){url=url.trim();if(!url)throw new Error('Please enter a video link');try{new URL(url)}catch{throw new Error('Please enter a valid video URL')}const autoThumb=getVideoThumbnailUrl(url,i.title);const{data,error}=await supabase.from('vault_resources').insert({title:i.title.trim()||'Video',description:i.description||null,type:'video',product_id:i.productId,source_url:url,thumbnail:autoThumb||null,storage_path:null,file_format:'LINK',file_size:null,tags:i.tags||[],video_category:i.videoCategory||'Other',content_status:i.contentStatus||'Active',is_official:i.contentStatus==='Official'||i.isOfficial||false,version:i.version||'v1.0',parent_resource_id:i.parentResourceId||null,featured:i.featured||false,...await uploader()}).select().single();if(error)throw new Error(`Video link failed: ${getErrorMessage(error)}`);return hydrateRow(data)}
export async function uploadResource(i:ResourceInput,f:File){const ext=f.name.includes('.')?f.name.split('.').pop()?.toUpperCase():'FILE',m=new Date().toISOString().slice(0,7),id=i.productId==='sheshi'?'sheshi':i.productId,path=`${id}/${i.type}/${m}/${crypto.randomUUID()}-${safeName(f.name)}`;const{error:ue}=await supabase.storage.from(STORAGE_BUCKET).upload(path,f,{cacheControl:'3600',upsert:false,contentType:f.type||undefined});if(ue)throw new Error(`Storage upload failed: ${getErrorMessage(ue)}`);let thumbnail:string|null=isImageFile({source_url:f.name,file_format:f.type})?path:null;if(!thumbnail&&(PDF_EXT.test(f.name)||f.type==='application/pdf')){const p=await renderPdfPreview(f);if(p)thumbnail=await uploadPdfPreview(p,path)}const{data,error}=await supabase.from('vault_resources').insert({title:i.title||f.name,description:i.description||null,type:i.type,product_id:i.productId,source_url:path,thumbnail,storage_path:path,file_format:ext,file_size:formatFileSize(f.size),tags:i.tags||[],video_category:i.type==='video'?(i.videoCategory||'Other'):null,content_status:i.contentStatus||'Active',is_official:i.contentStatus==='Official'||i.isOfficial||false,version:i.version||'v1.0',parent_resource_id:i.parentResourceId||null,featured:i.featured||false,...await uploader()}).select().single();if(error){await supabase.storage.from(STORAGE_BUCKET).remove([path]);throw new Error(`Database record failed: ${getErrorMessage(error)}`)}return hydrateRow(data)}
export async function updateManagedResourceType(id:string,type:ResourceType){const{error}=await supabase.from('vault_resources').update({type}).eq('id',id);if(error)throw new Error(`Could not update file type: ${getErrorMessage(error)}`)}
export async function updateManagedResourceTags(id:string,tags:string[]){const{error}=await supabase.from('vault_resources').update({tags:tags.map(t=>t.trim()).filter(Boolean)}).eq('id',id);if(error)throw new Error(`Could not update tags: ${getErrorMessage(error)}`)}
export async function updateManagedResourceMeta(id:string,updates:{tags?:string[];description?:string|null;videoCategory?:string|null;contentStatus?:ContentStatus;isOfficial?:boolean;featured?:boolean;version?:string}){const patch:Record<string,unknown>={};if(updates.tags!==undefined)patch.tags=updates.tags.map(t=>t.trim()).filter(Boolean);if(updates.description!==undefined)patch.description=updates.description||null;if(updates.videoCategory!==undefined)patch.video_category=updates.videoCategory||null;if(updates.contentStatus!==undefined){patch.content_status=updates.contentStatus;patch.is_official=updates.contentStatus==='Official'}if(updates.isOfficial!==undefined)patch.is_official=updates.isOfficial;if(updates.featured!==undefined)patch.featured=updates.featured;if(updates.version!==undefined)patch.version=updates.version;const{error}=await supabase.from('vault_resources').update(patch).eq('id',id);if(error)throw new Error(`Could not update resource: ${getErrorMessage(error)}`)}
export async function updateManagedResourceVideoCategory(id:string,videoCategory:VideoCategory){const{error}=await supabase.from('vault_resources').update({video_category:videoCategory}).eq('id',id);if(error)throw new Error(`Could not update video category: ${getErrorMessage(error)}`)}
export async function renameGlobalTag(oldTag:string,newTag:string){const{error}=await supabase.rpc('admin_rename_tag',{old_tag:oldTag,new_tag:newTag});if(error)throw new Error(`Failed to rename tag: ${getErrorMessage(error)}`)}
export async function mergeGlobalTags(sourceTags:string[],targetTag:string){const{error}=await supabase.rpc('admin_merge_tags',{source_tags:sourceTags,target_tag:targetTag});if(error)throw new Error(`Failed to merge tags: ${getErrorMessage(error)}`)}
export async function deleteGlobalTag(targetTag:string){const{error}=await supabase.rpc('admin_delete_tag',{target_tag:targetTag});if(error)throw new Error(`Failed to delete tag: ${getErrorMessage(error)}`)}
export async function deleteManagedResource(r:ManagedResource){
  const{data,error}=await supabase.from('vault_resources').update({deleted_at:new Date().toISOString()}).eq('id',r.id).select('id').maybeSingle()
  if(error)throw new Error(`Could not delete file record: ${getErrorMessage(error)}`)
  if(!data)throw new Error('The file could not be deleted. You may not have permission to remove it, or it may already be gone.')
}

export async function restoreManagedResource(r:ManagedResource){
  const{data,error}=await supabase.from('vault_resources').update({deleted_at:null}).eq('id',r.id).select('id').maybeSingle()
  if(error)throw new Error(`Could not restore file record: ${getErrorMessage(error)}`)
  if(!data)throw new Error('The file could not be restored. You may not have permission, or it may already be gone.')
}

export async function permanentlyDeleteResource(r:ManagedResource):Promise<void>{
  if(r.storagePath){
    await supabase.storage.from(STORAGE_BUCKET).remove([r.storagePath])
  }
  const{error}=await supabase.from('vault_resources').delete().eq('id',r.id)
  if(error)throw new Error(`Could not permanently delete file: ${getErrorMessage(error)}`)
}

export async function checkDuplicateResource(fileName:string,fileSize?:number,title?:string):Promise<ManagedResource|null>{
  const all=await getManagedResources()
  const cleanFileName=fileName.trim().toLowerCase()
  const cleanTitle=(title||fileName.replace(/\.[^.]+$/,'')).trim().toLowerCase()
  const formattedSize=fileSize?formatFileSize(fileSize):undefined

  const exact=all.find(r=>!r.deletedAt&&(r.title.trim().toLowerCase()===cleanTitle||(r.storagePath&&r.storagePath.split('/').pop()?.toLowerCase()===cleanFileName)))
  if(exact)return exact

  if(formattedSize){
    const sizeMatch=all.find(r=>!r.deletedAt&&r.fileSize===formattedSize&&(r.title.toLowerCase().includes(cleanTitle)||cleanTitle.includes(r.title.toLowerCase())))
    if(sizeMatch)return sizeMatch
  }

  return null
}

export async function replaceManagedResourceFile(existingResource:ManagedResource,f:File):Promise<ManagedResource>{
  const ext=f.name.includes('.')?f.name.split('.').pop()?.toUpperCase():'FILE'
  const m=new Date().toISOString().slice(0,7)
  const id=existingResource.productId==='sheshi'?'sheshi':existingResource.productId
  const path=`${id}/${existingResource.type}/${m}/${crypto.randomUUID()}-${safeName(f.name)}`

  const{error:ue}=await supabase.storage.from(STORAGE_BUCKET).upload(path,f,{cacheControl:'3600',upsert:false,contentType:f.type||undefined})
  if(ue)throw new Error(`Storage upload failed: ${getErrorMessage(ue)}`)

  let thumbnail:string|null=isImageFile({source_url:f.name,file_format:f.type})?path:null
  if(!thumbnail&&(PDF_EXT.test(f.name)||f.type==='application/pdf')){
    const p=await renderPdfPreview(f)
    if(p)thumbnail=await uploadPdfPreview(p,path)
  }

  const currentVerStr=existingResource.version||'v1.0'
  const verMatch=currentVerStr.match(/^v?(\d+)(\.(\d+))?$/i)
  let nextVersion='v2.0'
  if(verMatch){
    const major=parseInt(verMatch[1]||'1',10)
    nextVersion=`v${major+1}.0`
  }

  const{data,error}=await supabase.from('vault_resources').update({
    source_url:path,
    thumbnail,
    storage_path:path,
    file_format:ext,
    file_size:formatFileSize(f.size),
    version:nextVersion,
    parent_resource_id:existingResource.id,
    updated_at:new Date().toISOString(),
    ...await uploader()
  }).eq('id',existingResource.id).select().single()

  if(error){
    await supabase.storage.from(STORAGE_BUCKET).remove([path])
    throw new Error(`Failed to update resource record: ${getErrorMessage(error)}`)
  }

  return hydrateRow(data)
}

function formatFileSize(b:number){if(b<1024)return `${b} B`;const u=['KB','MB','GB'];let v=b/1024,n=0;while(v>=1024&&n<u.length-1){v/=1024;n++}return `${v.toFixed(v>=10?0:1)} ${u[n]}`}
