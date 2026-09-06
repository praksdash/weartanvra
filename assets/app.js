document.addEventListener('DOMContentLoaded',()=>{
  TanvraStore?.badge?.();
  document.querySelectorAll('[data-year]').forEach(e=>e.textContent=new Date().getFullYear());

  const toggle=document.querySelector('[data-mobile-toggle]');
  const nav=document.querySelector('[data-mobile-nav]');
  const close=document.querySelector('[data-mobile-close]');
  const backdrop=document.querySelector('[data-mobile-backdrop]');

  if(toggle&&nav){
    const openMenu=()=>{
      nav.classList.add('open');
      nav.setAttribute('aria-hidden','false');
      toggle.setAttribute('aria-expanded','true');
      if(backdrop){backdrop.hidden=false;requestAnimationFrame(()=>backdrop.classList.add('open'))}
      document.body.classList.add('nav-open');
      close?.focus();
    };

    const closeMenu=()=>{
      nav.classList.remove('open');
      nav.setAttribute('aria-hidden','true');
      toggle.setAttribute('aria-expanded','false');
      if(backdrop){
        backdrop.classList.remove('open');
        setTimeout(()=>{backdrop.hidden=true},180);
      }
      document.body.classList.remove('nav-open');
    };

    toggle.addEventListener('click',()=>nav.classList.contains('open')?closeMenu():openMenu());
    close?.addEventListener('click',closeMenu);
    backdrop?.addEventListener('click',closeMenu);

    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open'))closeMenu()});

    window.addEventListener('resize',()=>{
      if(window.innerWidth>1200&&nav.classList.contains('open'))closeMenu();
    });
  }

  // EDGE 01 homepage media: use the same catalogue data as the product page.
  const edgeMedia=document.querySelector('[data-edge01-media]');
  if(edgeMedia && Array.isArray(window.TANVRA_PRODUCTS)){
    const edge=window.TANVRA_PRODUCTS.find(p=>p.id==='oversized-edge-01');
    if(edge){
      const preferred=[
        edge.images?.find(x=>/model-front/i.test(x)),
        edge.colors?.find(c=>/black/i.test(c.name||''))?.image,
        edge.images?.[0]
      ].find(Boolean);
      if(preferred){
        const img=document.createElement('img');
        img.className='edge01-real-image';
        img.alt='TANVRA EDGE 01 oversized tee';
        img.loading='lazy';
        img.src=preferred;
        img.onerror=()=>{
          edgeMedia.hidden=true;
          edgeMedia.closest('.edge01-preview-grid')?.classList.add('edge01-no-media');
        };
        edgeMedia.appendChild(img);
      }else{
        edgeMedia.hidden=true;
        edgeMedia.closest('.edge01-preview-grid')?.classList.add('edge01-no-media');
      }
    }
  }

});