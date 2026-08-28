(()=>{
  // Apply the same category tabs to every product library, including Sheshi.
  const productNames=new Set(['Quanta','Catalyx','FR','Consultease','Sheshi']);
  const selectedByProduct=new Map();

  function styleButton(button,active){
    button.style.border='0';
    button.style.borderBottom=active?'2px solid var(--primary)':'2px solid transparent';
    button.style.background='transparent';
    button.style.color=active?'var(--primary)':'var(--ink-45)';
    button.style.padding='10px 2px';
    button.style.marginRight='22px';
    button.style.fontSize='12px';
    button.style.fontWeight='600';
    button.style.cursor='pointer';
    button.style.whiteSpace='nowrap';
  }

  function install(){
    document.querySelectorAll('main').forEach(main=>{
      const title=main.querySelector('h1');
      if(!title||!productNames.has(title.textContent.trim()))return;
      const header=title.parentElement?.parentElement;
      const groups=header?.nextElementSibling;
      if(!(groups instanceof HTMLElement)||groups.dataset.productTabsReady==='true')return;
      const sections=[...groups.children].filter(el=>el instanceof HTMLElement&&el.tagName==='SECTION');
      if(!sections.length)return;

      groups.dataset.productTabsReady='true';
      const product=title.textContent.trim();
      const tabBar=document.createElement('div');
      tabBar.setAttribute('role','tablist');
      tabBar.style.display='flex';
      tabBar.style.gap='0';
      tabBar.style.overflowX='auto';
      tabBar.style.borderBottom='1px solid var(--line-soft)';
      tabBar.style.marginBottom='28px';
      tabBar.style.padding='0 2px';

      // Category tabs only. Deliberately no "All Files" tab to avoid a long combined list.
      const tabs=sections.map((section,index)=>({
        key:String(index),
        label:(section.querySelector('h2')?.textContent||'Files').trim(),
        section
      }));
      const initial=selectedByProduct.get(product)||tabs[0].key;

      const select=key=>{
        selectedByProduct.set(product,key);
        tabs.forEach(tab=>{
          const active=tab.key===key;
          tab.button&&styleButton(tab.button,active);
          tab.section.style.display=active?'':'none';
        });
      };

      tabs.forEach(tab=>{
        const button=document.createElement('button');
        button.type='button';
        button.textContent=tab.label;
        button.setAttribute('role','tab');
        button.onclick=()=>select(tab.key);
        tab.button=button;
        tabBar.appendChild(button);
      });
      groups.parentElement?.insertBefore(tabBar,groups);
      select(initial);
    });
  }

  let queued=false;
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;install()})};
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue);else queue();
})();
