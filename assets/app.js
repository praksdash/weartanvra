document.addEventListener('DOMContentLoaded',()=>{
  TanvraStore?.badge?.();
  document.querySelectorAll('[data-year]').forEach(e=>e.textContent=new Date().getFullYear());

  const toggle=document.querySelector('[data-mobile-toggle]');
  const nav=document.querySelector('[data-mobile-nav]');
  const close=document.querySelector('[data-mobile-close]');
  const backdrop=document.querySelector('[data-mobile-backdrop]');

  const setMenuState=(open)=>{
    if(!toggle||!nav) return;
    nav.classList.toggle('open',open);
    nav.setAttribute('aria-hidden',open?'false':'true');
    toggle.setAttribute('aria-expanded',open?'true':'false');
    document.body.classList.toggle('nav-open',open);

    if(backdrop){
      backdrop.hidden=!open;
      if(open){
        requestAnimationFrame(()=>backdrop.classList.add('open'));
      }else{
        backdrop.classList.remove('open');
      }
    }
  };

  if(toggle&&nav){
    toggle.addEventListener('click',(e)=>{
      e.preventDefault();
      e.stopPropagation();
      setMenuState(!nav.classList.contains('open'));
    });

    close?.addEventListener('click',(e)=>{
      e.preventDefault();
      setMenuState(false);
    });

    backdrop?.addEventListener('click',()=>setMenuState(false));

    nav.querySelectorAll('a').forEach(a=>{
      a.addEventListener('click',()=>setMenuState(false));
    });

    document.addEventListener('keydown',(e)=>{
      if(e.key==='Escape') setMenuState(false);
    });

    window.addEventListener('resize',()=>{
      if(window.innerWidth>1200) setMenuState(false);
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

  // Optional floating WhatsApp support button. It renders only when a real
  // business number is configured in assets/config.js.
  const wa=String(window.TANVRA_CONFIG?.whatsappNumber||'').replace(/\D/g,'');
  if(/^\d{10,15}$/.test(wa) && !document.querySelector('[data-whatsapp-support]')){
    const a=document.createElement('a');
    a.className='whatsapp-support';a.dataset.whatsappSupport='1';a.target='_blank';a.rel='noopener';
    a.href=`https://wa.me/${wa}?text=${encodeURIComponent('Hi TANVRA, I need help with an order/product.')}`;
    a.setAttribute('aria-label','Chat with TANVRA on WhatsApp');a.textContent='WA';
    document.body.appendChild(a);
  }
});
