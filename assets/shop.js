document.addEventListener('DOMContentLoaded',()=>{
 const grid=document.querySelector('[data-shop-grid]'),empty=document.querySelector('[data-empty]'),search=document.querySelector('[data-product-search]'),filter=document.querySelector('[data-fit-filter]');if(!grid)return;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function salePct(p){return p.compareAt>p.price?Math.round((1-p.price/p.compareAt)*100):0}
 function render(){
   let ps=TanvraStore.products();const q=(search?.value||'').trim().toLowerCase(),f=filter?.value||'all';
   if(q)ps=ps.filter(p=>(p.name+' '+p.subtitle+' '+p.badge).toLowerCase().includes(q));
   if(f!=='all')ps=ps.filter(p=>p.category===f);
   grid.innerHTML=ps.map(p=>{
     const pct=salePct(p),free=p.price>=Number(TANVRA_CONFIG.shipping?.freeAbove||799);
     return `<article class="product-card" data-card="${esc(p.id)}">
       <a class="product-card-link" href="product.html?id=${encodeURIComponent(p.id)}">
         <div class="product-image"><span class="card-badge">${esc(p.badge)}</span>${pct?`<span class="sale-badge">${pct}% OFF</span>`:''}<img src="${esc(p.images[0])}" alt="${esc(p.name)}" loading="lazy" decoding="async"></div>
         <div class="product-meta"><h3>${esc(p.name)}</h3><p>${esc(p.subtitle)}</p><div class="price"><strong>${TanvraStore.money(p.price)}</strong>${p.compareAt>p.price?`<s>${TanvraStore.money(p.compareAt)}</s>`:''}</div>${free?'<div class="free-ship">FREE SHIPPING</div>':''}</div>
       </a>
       <div class="card-actions"><button class="btn card-add" data-add="${esc(p.id)}">ADD TO BAG</button><button class="btn dark card-buy" data-buy="${esc(p.id)}">CHECKOUT</button></div>
     </article>`
   }).join('');
   empty.hidden=ps.length>0;
   grid.querySelectorAll('[data-add]').forEach(btn=>btn.onclick=e=>{e.preventDefault();const p=TanvraStore.byId(btn.dataset.add);TanvraStore.add(TanvraStore.defaultVariant(p));btn.textContent='ADDED ✓';setTimeout(()=>btn.textContent='ADD TO BAG',900)});
   grid.querySelectorAll('[data-buy]').forEach(btn=>btn.onclick=e=>{e.preventDefault();const p=TanvraStore.byId(btn.dataset.buy);TanvraStore.add(TanvraStore.defaultVariant(p));location.href='checkout.html'});
 }
 search?.addEventListener('input',render);filter?.addEventListener('change',render);render();
});
