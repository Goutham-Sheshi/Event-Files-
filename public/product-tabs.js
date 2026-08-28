(()=>{
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
      const title=[...main.querySelectorAll('h1')].find(h=>productNames.has(h.textContent.trim()));
      if(!title)return;

      // Sheshi's page structure differs from the other product pages, so do not
      // rely on the title/header sibling structure. Use every top-level file section.
      const sections=[...main.querySelectorAll('section')].filter(section=>{
        const heading=section.querySelector('h2');
        return heading&&heading.textContent.trim();
      });
      if(!sections.length||main.dataset.productTabsReady==='true')return;

      main.dataset.productTabsReady='true';
      const product=title.textContent.trim();
      const tabBar=document.createElement('div');
      tabBar.setAttribute('role','tablist');
      tabBar.style.display='flex';
      tabBar.style.gap='0';
      tabBar.style.overflowX='auto';
      tabBar.style.borderBottom='1px solid var(--line-soft)';
      tabBar.style.marginBottom='28px';
      tabBar.style.padding='0 2px';

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
          styleButton(tab.button,active);
          tab.button.setAttribute('aria-selected',String(active));
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

      // Put the tabs immediately before the first category, regardless of page layout.
      sections[0].parentElement?.insertBefore(tabBar,sections[0]);
      select(initial);
    });
  }

  let queued=false;
  const queue=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;install();});
  };
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue);else queue();
})();
