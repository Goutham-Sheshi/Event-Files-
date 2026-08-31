(()=>{
  const SESSION_KEY='sheshi_vault_session';
  const SUPABASE_URL='https://ikkyziyugrnkolqnrxfo.supabase.co';
  const ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlra3l6aXl1Z3Jua29scW5yeGZvIiwiaWF0IjoxNzg2OTU0ODI1LCJleHAiOjIxMDI1MzA4MjV9.ISewj3DuJNmZrrWqByDwGMk9iys8kXYlTDuYCSYr-j4';
  const products=[['sheshi','Sheshi'],['p-quanta','Quanta'],['p-catalyx','Catalyx'],['p-fr','FR'],['p-consultease','Consultease']];
  const fileTypes=['logo','brochure','video','document','ppt','other'];
  const PPT_EXT=/\.(ppt|pptx|pps|ppsx|pot|potx|pptm|ppsm)(?:[?#].*)?$/i;
  const icon='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5M5 21h14"/><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>';
  let uploadNav=null, modal=null;

  const profile=()=>{try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}};
  const approved=()=>profile()?.status==='approved';
  const token=()=>{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';if(!k.startsWith('sb-'))continue;try{const v=JSON.parse(localStorage.getItem(k)||'{}');if(v.access_token)return v.access_token;if(v.currentSession?.access_token)return v.currentSession.access_token}catch{}}return''};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function api(path,options={}){
    const r=await fetch(`${SUPABASE_URL}${path}`,{...options,headers:{apikey:ANON_KEY,Authorization:`Bearer ${token()}`,'Content-Type':'application/json',...(options.headers||{})}});
    const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
    if(!r.ok)throw new Error(data?.message||data?.hint||data?.details||text||`Request failed (${r.status})`);
    return data;
  }

  function closeModal(){modal?.remove();modal=null;document.body.style.overflow='';}
  function openModal(title,body){
    closeModal();document.body.style.overflow='hidden';
    modal=document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(15,18,24,.72);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:24px;font-family:Inter,system-ui,sans-serif';
    const panel=document.createElement('div');
    panel.style.cssText='width:min(650px,96vw);max-height:90vh;overflow:auto;background:var(--paper,#fff);border:1px solid var(--line-soft,#ddd);border-radius:18px;box-shadow:0 28px 80px rgba(0,0,0,.6);color:var(--ink,#111)';
    panel.innerHTML=`<div style="padding:18px 20px;border-bottom:1px solid var(--line-soft);display:flex;align-items:center;justify-content:space-between;gap:16px"><div style="font-size:15px;font-weight:700">${esc(title)}</div><button type="button" data-close style="border:0;background:var(--line,#eee);color:var(--ink);border-radius:8px;width:34px;height:34px;font-size:22px;cursor:pointer">×</button></div><div style="padding:20px">${body}</div>`;
    modal.appendChild(panel);modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('[data-close]'))closeModal()});document.body.appendChild(modal);return panel;
  }

  function officeViewer(url){if(/view\.officeapps\.live\.com\/op\//i.test(url))return url;return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;}
  function viewPowerPoint(title,url,description=''){
    const direct=PPT_EXT.test(url)&&!/(onedrive\.live\.com|1drv\.ms|sharepoint\.com)/i.test(url);
    const panel=openModal('PowerPoint',`<div style="display:flex;flex-direction:column;gap:16px"><div style="display:flex;align-items:center;gap:12px"><div style="width:44px;height:44px;border-radius:10px;background:#e74c3c;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px">PPT</div><div><div style="font-size:14px;font-weight:700">${esc(title)}</div><div style="font-size:11px;color:var(--ink-45);margin-top:3px">PowerPoint presentation</div></div></div>${description?`<div style="border:1px solid var(--line-soft);background:var(--canvas-deep);border-radius:10px;padding:13px;font-size:12px;line-height:1.55"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-45);margin-bottom:5px">Description</div>${esc(description)}</div>`:''}<div style="font-size:12px;line-height:1.5;color:var(--ink-45)">${direct?'This presentation will open through Microsoft Office Online.':'This shared link will open the presentation in PowerPoint for the web using its existing permissions.'}</div><div style="display:flex;justify-content:flex-end;gap:8px"><button type="button" data-close style="border:1px solid var(--line-soft);background:transparent;color:var(--ink);border-radius:8px;padding:9px 14px;font-size:12px;font-weight:650;cursor:pointer">Cancel</button><button type="button" data-view style="border:0;background:var(--primary);color:#fff;border-radius:8px;padding:9px 16px;font-size:12px;font-weight:700;cursor:pointer">View PowerPoint</button></div></div>`);
    panel.querySelector('[data-view]').onclick=()=>{window.open(direct?officeViewer(url):url,'_blank','noopener,noreferrer');closeModal()};
  }

  async function openPptCard(card){
    const id=card.getAttribute('data-resource-id');if(!id)return;
    try{const rows=await api(`/rest/v1/vault_resources?id=eq.${encodeURIComponent(id)}&select=title,description,source_url`);const r=rows?.[0];if(!r?.source_url)throw new Error('PowerPoint link is unavailable.');viewPowerPoint(r.title||'PowerPoint',r.source_url,r.description||'')}
    catch(e){openModal('PowerPoint',`<div style="font-size:13px;line-height:1.5">${esc(e.message||'Could not open this PowerPoint link.')}</div>`)}
  }

  function isPptCard(card){
    if(!card||card.getAttribute('data-resource-type')!=='document')return false;
    return [...card.querySelectorAll('span')].some(x=>/^(PPT LINK|PPT)$/i.test((x.textContent||'').trim()))||/PowerPoint/i.test(card.textContent||'');
  }
  function installPptViewer(){
    if(document.documentElement.dataset.pptViewerReady)return;
    document.documentElement.dataset.pptViewerReady='true';
    document.addEventListener('click',e=>{const target=e.target;const card=target?.closest?.('[data-resource-id][data-resource-type]');if(!card||!isPptCard(card)||target.closest('button,a'))return;e.preventDefault();e.stopPropagation();openPptCard(card)},true);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
  }

  function findNav(){return [...document.querySelectorAll('aside button,aside a')].find(x=>/^all resources$/i.test((x.textContent||'').trim()))||null;}
  function addNav(){
    if(!approved()||uploadNav?.isConnected)return;
    const all=findNav();if(!all)return;
    uploadNav=document.createElement('button');uploadNav.id='advanced-upload-nav';uploadNav.type='button';uploadNav.title='Upload Files';uploadNav.innerHTML=icon+'<span>Upload Files</span>';uploadNav.style.cssText=all.style.cssText||'';uploadNav.className=all.className;uploadNav.setAttribute('aria-label','Upload Files');uploadNav.onclick=e=>{e.preventDefault();openUpload()};all.parentElement?.insertBefore(uploadNav,all.nextSibling);
  }

  function productOptions(){return products.map(([id,name])=>`<option value="${id}">${name}</option>`).join('');}
  function baseFields(){return `<label style="font-size:12px;font-weight:650">Related Product<select id="up-product" style="display:block;width:100%;margin-top:6px;padding:10px;border:1px solid var(--border,#ccc);border-radius:9px;background:var(--paper);color:var(--ink)">${productOptions()}</select></label><label style="font-size:12px;font-weight:650">Tags <span style="font-weight:400;color:var(--ink-45)">(optional)</span><input id="up-tags" placeholder="e.g. sales, investor, 2026" style="display:block;box-sizing:border-box;width:100%;margin-top:6px;padding:10px;border:1px solid var(--border,#ccc);border-radius:9px;background:var(--paper);color:var(--ink)"></label><label style="font-size:12px;font-weight:650">Description <span style="font-weight:400;color:var(--ink-45)">(optional)</span><textarea id="up-description" rows="3" placeholder="Add a short description" style="display:block;box-sizing:border-box;width:100%;margin-top:6px;padding:10px;border:1px solid var(--border,#ccc);border-radius:9px;background:var(--paper);color:var(--ink);resize:vertical"></textarea>`}
  function openUpload(){
    const body=`<div style="display:flex;flex-direction:column;gap:14px">${baseFields()}<label style="font-size:12px;font-weight:650">File Type<select id="up-type" style="display:block;width:100%;margin-top:6px;padding:10px;border:1px solid var(--border,#ccc);border-radius:9px;background:var(--paper);color:var(--ink)">${['logo','brochure','video','document','ppt','other'].map(t=>`<option value="${t}">${t==='ppt'?'PowerPoint (PPT)':t[0].toUpperCase()+t.slice(1)}</option>`).join('')}</select></label><div id="up-ppt-link" style="display:none"><label style="font-size:12px;font-weight:650">PowerPoint Link<input id="up-url" type="url" placeholder="Paste the PowerPoint / OneDrive / SharePoint link" style="display:block;box-sizing:border-box;width:100%;margin-top:6px;padding:10px;border:1px solid var(--border,#ccc);border-radius:9px;background:var(--paper);color:var(--ink)"></label></div><div id="up-file-picker"><label style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:120px;border:2px dashed var(--line-soft);border-radius:11px;cursor:pointer"><strong>Choose files</strong><span id="up-count" style="margin-top:6px;font-size:11px;color:var(--ink-45)">Multiple files supported</span><input id="up-files" type="file" multiple style="display:none"></label></div><div id="up-status" style="font-size:12px;color:var(--ink-45)"></div><button id="up-submit" style="width:100%;padding:11px;border:0;border-radius:9px;background:var(--primary);color:#fff;font-weight:700;cursor:pointer">Upload Files</button></div>`;
    const panel=openModal('Add files',body);const type=panel.querySelector('#up-type'),pptLink=panel.querySelector('#up-ppt-link'),picker=panel.querySelector('#up-file-picker'),url=panel.querySelector('#up-url'),files=panel.querySelector('#up-files'),count=panel.querySelector('#up-count');
    const syncType=()=>{const isPpt=type.value==='ppt';pptLink.style.display=isPpt?'block':'none';picker.style.display=isPpt?'none':'block';panel.querySelector('#up-submit').textContent=isPpt?'Add PowerPoint':'Upload Files';if(!isPpt)url.value='';};
    type.onchange=syncType;syncType();files.onchange=()=>count.textContent=files.files?.length?`${files.files.length} file${files.files.length===1?'':'s'} selected`:'Multiple files supported';panel.querySelector('#up-submit').onclick=()=>type.value==='ppt'?addPptLink(panel):uploadFiles(panel);
  }

  async function addPptLink(panel){
    const product=panel.querySelector('#up-product').value,url=panel.querySelector('#up-url').value.trim(),tags=panel.querySelector('#up-tags').value.split(',').map(x=>x.trim()).filter(Boolean),description=panel.querySelector('#up-description').value.trim(),status=panel.querySelector('#up-status'),button=panel.querySelector('#up-submit');
    if(!url||!/^https?:\/\//i.test(url)){status.textContent='Paste a valid HTTPS PowerPoint link.';return}
    if(!token()){status.textContent='Your session has expired. Please sign in again.';return}
    button.disabled=true;status.textContent='Adding PowerPoint…';
    try{const title=url.split('/').pop()?.split('?')[0]||'PowerPoint',p=profile()||{};await api('/rest/v1/vault_resources',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({title,description:description||null,type:'document',product_id:product,source_url:url,thumbnail:null,storage_path:null,file_format:'PPT LINK',file_size:null,tags:['PowerPoint',...tags],featured:false,uploaded_by:p.id||null,uploaded_by_name:p.full_name||null})});window.dispatchEvent(new Event('vault-resources-changed'));closeModal();toast('PowerPoint link added.')}
    catch(e){status.textContent=e.message||'Could not add the PowerPoint link.';button.disabled=false}
  }

  async function uploadFiles(panel){
    const files=[...panel.querySelector('#up-files').files||[]],status=panel.querySelector('#up-status'),button=panel.querySelector('#up-submit');
    if(!files.length){status.textContent='Choose at least one file.';return}
    if(!token()){status.textContent='Your session has expired. Please sign in again.';return}
    const p=profile()||{},product=panel.querySelector('#up-product').value,type=panel.querySelector('#up-type').value,tags=panel.querySelector('#up-tags').value.split(',').map(x=>x.trim()).filter(Boolean),description=panel.querySelector('#up-description').value.trim();
    button.disabled=true;
    try{for(let i=0;i<files.length;i++){const f=files[i],ext=(f.name.split('.').pop()||'FILE').toUpperCase(),safe=f.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-'),path=`${product}/${type}/${new Date().toISOString().slice(0,7)}/${crypto.randomUUID()}-${safe}`;status.textContent=`Uploading ${i+1} of ${files.length}: ${f.name}`;const put=await fetch(`${SUPABASE_URL}/storage/v1/object/event-assets/${path}`,{method:'POST',headers:{apikey:ANON_KEY,Authorization:`Bearer ${token()}`,'Content-Type':f.type||'application/octet-stream','x-upsert':'false'},body:f});if(!put.ok)throw new Error(await put.text());await api('/rest/v1/vault_resources',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({title:f.name,description:description||null,type,product_id:product,source_url:path,thumbnail:null,storage_path:path,file_format:ext,file_size:formatSize(f.size),tags,featured:false,uploaded_by:p.id||null,uploaded_by_name:p.full_name||null})})}status.textContent=`Successfully uploaded ${files.length} file${files.length===1?'':'s'}.`;window.dispatchEvent(new Event('vault-resources-changed'));toast('Files uploaded.');}catch(e){status.textContent='Upload failed. '+(e.message||'Please try again.')}finally{button.disabled=false}
  }

  function formatSize(b){if(b<1024)return `${b} B`;const u=['KB','MB','GB'];let v=b/1024,i=0;while(v>=1024&&i<u.length-1){v/=1024;i++}return `${v.toFixed(v>=10?0:1)} ${u[i]}`}
  function toast(message){const t=document.createElement('div');t.textContent=message;t.style.cssText='position:fixed;right:24px;bottom:24px;z-index:10001;background:var(--ink);color:var(--paper);padding:11px 15px;border-radius:9px;font:600 12px Inter,system-ui,sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.25)';document.body.appendChild(t);setTimeout(()=>t.remove(),2500)}

  const queue=()=>requestAnimationFrame(()=>{addNav();installPptViewer()});
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',queue):queue();
})();