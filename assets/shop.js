document.addEventListener('DOMContentLoaded',()=>{
 const grid=document.querySelector('[data-shop-grid]'), empty=document.querySelector('[data-empty]'), search=document.querySelector('[data-product-search]'), filter=document.querySelector('[data-fit-filter]'); if(!grid)return;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function render(){let ps=TanvraStore.products();const q=(search?.value||'').trim().toLowerCase(), f=filter?.value||'all';if(q)ps=ps.filter(p=>(p.name+' '+p.subtitle+' '+p.badge).toLowerCase().includes(q));if(f!=='all')ps=ps.filter(p=>p.category===f);
 grid.innerHTML=ps.map(p=>`<article class="product-card"><a href="product.html?id=${encodeURIComponent(p.id)}"><div class="product-image"><span class="card-badge">${esc(p.badge)}</span><img src="${esc(p.images[0])}" alt="${esc(p.name)}" loading="lazy" decoding="async"></div><div class="product-meta"><h3>${esc(p.name)}</h3><p>${esc(p.subtitle)}</p><div class="price"><strong>${TanvraStore.money(p.price)}</strong>${p.compareAt>p.price?`<s>${TanvraStore.money(p.compareAt)}</s>`:''}</div></div></a></article>`).join(''); empty.hidden=ps.length>0;
 }
 search?.addEventListener('input',render);filter?.addEventListener('change',render);render();
});