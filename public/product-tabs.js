(()=>{
  const productNames=new Set(['Quanta','Catalyx','FR','Consultease','Sheshi']);
  const selectedByProduct=new Map();

  // Keep the visible tab category tied to the actual resource type. This is
  // intentionally strict: a brochure never appears in Documents and a video
  // never appears in Brochures, even if the surrounding page markup is mixed.
  const typeForLabel={
    'Brand Assets':'logo',
    'Brochures':'brochure',
    'Videos':'video',
    'Documents':'document'
  };

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

  function buildGroups(main){
    const headings=[...main.querySelectorAll('h2.section-heading')].filter(h=>h.textContent.trim());
    const groups=[];

    headings.forEach((heading,index)=>{
      const label=heading.textContent.trim();
      const nextHeading=headings[index+1];
      const parent=heading.parentElement;
      const nodes=[];

      if(parent&&nextHeading&&nextHeading.parentElement===parent){
        let node=heading;
        while(node&&node!==nextHeading){nodes.push(node);node=node.nextElementSibling;}
      }else if(parent&&!nextHeading){
        let node=heading;
        while(node){nodes.push(node);node=node.nextElementSibling;}
      }else{
        const section=heading.closest('section');
        if(section)nodes.push(section);
        else if(parent)nodes.push(parent);
      }

      if(nodes.length)groups.push({key:String(groups.length),label,nodes,anchor:heading});
    });

    return groups.filter((group,index,self)=>self.findIndex(x=>x.anchor===group.anchor)===index);
  }

  function applyStrictTypeFilter(tab,active){
    const expected=typeForLabel[tab.label];
    if(!expected)return;
    tab.nodes.forEach(node=>{
      node.querySelectorAll?.('[data-resource-id][data-resource-type]').forEach(card=>{
        const matches=card.dataset.resourceType===expected;
        card.style.display=active&&matches?'':'none';
      });
    });
  }

  function install(){
    document.querySelectorAll('main').forEach(main=>{
      const title=[...main.querySelectorAll('h1')].find(h=>productNames.has(h.textContent.trim()));
      if(!title||main.dataset.productTabsReady==='true')return;

      const tabs=buildGroups(main);
      if(!tabs.length)return;

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

      const initial=selectedByProduct.get(product)||tabs[0].key;
      const select=key=>{
        selectedByProduct.set(product,key);
        tabs.forEach(tab=>{
          const active=tab.key===key;
          styleButton(tab.button,active);
          tab.button.setAttribute('aria-selected',String(active));
          tab.nodes.forEach(node=>node.style.display=active?'':'none');
          applyStrictTypeFilter(tab,active);
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

      tabs[0].anchor.parentElement?.insertBefore(tabBar,tabs[0].anchor);
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
