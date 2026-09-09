function setMeta(selector,attr,value){
 let el=document.querySelector(selector);
 if(!el){
   el=document.createElement('meta');
   if(selector.includes('name="')) el.setAttribute('name',selector.match(/name="([^"]+)"/)[1]);
   else if(selector.includes('property="')) el.setAttribute('property',selector.match(/property="([^"]+)"/)[1]);
   document.head.appendChild(el);
 }
 el.setAttribute(attr,value);
}
function setProductSeo(p,id){
 const base='https://weartanvra.com/';
 const canonicalUrl=`${base}product.html?id=${encodeURIComponent(id)}`;
 const imagePath=(Array.isArray(p.images)&&p.images[0]) || (p.colors?.[0]?.image) || 'assets/wear-tanvra-logo.webp';
 const imageUrl=new URL(imagePath,base).href;
 const title=`${p.name} | TANVRA Clothing India`;
 const description=p.description || `${p.name} by TANVRA. Premium oversized streetwear with India-wide delivery.`;
 document.title=title;
 setMeta('meta[name="description"]','content',description);
 let canonical=document.querySelector('link[rel="canonical"]');
 if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}
 canonical.href=canonicalUrl;
 setMeta('meta[property="og:title"]','content',title);
 setMeta('meta[property="og:description"]','content',description);
 setMeta('meta[property="og:url"]','content',canonicalUrl);
 setMeta('meta[property="og:image"]','content',imageUrl);
 const schema={"@context":"https://schema.org","@type":"Product","@id":`${canonicalUrl}#product`,name:p.name,image:(p.images?.length?p.images:[imagePath]).map(x=>new URL(x,base).href),description,brand:{"@type":"Brand",name:"TANVRA"},sku:id,material:p.material||undefined,offers:{"@type":"Offer",url:canonicalUrl,priceCurrency:"INR",price:String(p.price),availability:"https://schema.org/InStock",itemCondition:"https://schema.org/NewCondition",seller:{"@id":"https://weartanvra.com/#organization"}}};
 let tag=document.getElementById('product-schema');if(!tag){tag=document.createElement('script');tag.type='application/ld+json';tag.id='product-schema';document.head.appendChild(tag)}tag.textContent=JSON.stringify(schema);
}
const PRODUCT_TREATMENT={
 'oversized-edge-01':{code:'TNV / 01',display:'EDGE 01',line:'Minimal everyday essential.'},
 'oversized-after-hours':{code:'TNV / 02',display:'AFTER HOURS',line:'Same city. Different mindset.'},
 'oversized-lost-found':{code:'TNV / 03',display:'LOST / FOUND',line:'Not every direction is a destination.'}
};
function galleryFor(p){
 const all=[...(p.images||[])].filter(Boolean);
 if(p.id==='oversized-edge-01'){
   const order=['008-black-model-front.webp','002-black-front.webp','003-black-back.webp','006-black-front-details.webp','007-black-back-detail.webp','008-neck-label.webp','001-cover.png'];
   const chosen=[];
   for(const name of order){const hit=all.find(x=>x.endsWith('/'+name)||x===name);if(hit&&!chosen.includes(hit))chosen.push(hit)}
   for(const x of all){if(chosen.length>=7)break;if(!chosen.includes(x))chosen.push(x)}
   return chosen.slice(0,7);
 }
 return all.slice(0,7);
}
document.addEventListener('DOMContentLoaded',()=>{
 const root=document.querySelector('[data-product-root]');if(!root)return;
 const id=new URLSearchParams(location.search).get('id'),p=TanvraStore.byId(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!p){root.innerHTML='<div class="empty-state"><h1>PRODUCT NOT FOUND</h1><p>This product may have been removed or the link is incorrect.</p><a class="btn dark" href="shop.html">BACK TO SHOP</a></div>';return}
 setProductSeo(p,id);TanvraAnalytics?.viewContent?.(p);
 const treatment=PRODUCT_TREATMENT[p.id]||{code:p.badge||'TANVRA',display:p.name,line:''};
 const gallery=galleryFor(p);let color=p.colors?.[0]?.name||'As Shown',size='';
 root.innerHTML=`<div class="product-layout product-layout-v22">
 <section class="product-media" aria-label="${esc(treatment.display)} product images">
   <div class="product-carousel" data-carousel>${gallery.map((im,i)=>`<figure class="product-slide" data-slide="${i}"><img src="${esc(im)}" alt="${esc(treatment.display)} ${i+1}" loading="${i===0?'eager':'lazy'}" decoding="async" onerror="this.closest('.product-slide').hidden=true"></figure>`).join('')}</div>
   <div class="carousel-dots" aria-label="Image position">${gallery.map((_,i)=>`<button type="button" class="carousel-dot ${i===0?'active':''}" data-dot="${i}" aria-label="Show image ${i+1}"></button>`).join('')}</div>
 </section>
 <section class="product-info product-info-v22">
   <p class="product-code">${esc(treatment.code)}</p><h1>${esc(treatment.display)}</h1>${treatment.line?`<p class="product-line">${esc(treatment.line)}</p>`:''}
   <div class="launch-price launch-price-product"><span>${esc(window.TANVRA_PRICING?.priceLabel||'LAUNCH PRICE')}</span><strong>${TanvraStore.money(p.price)}</strong></div>
   <p class="product-spec-line">${esc(p.gsm)} · ${esc(p.material)} · ${esc(p.fit)} Fit</p>
   <div class="purchase-options">
     <label class="choice-label">COLOUR <strong data-color-name>${esc(color)}</strong></label>
     <div class="swatches">${p.colors.map((c,i)=>`<button type="button" class="swatch ${i===0?'active':''}" data-color="${esc(c.name)}" data-image="${esc(c.image||gallery[0]||'')}" title="${esc(c.name)}" aria-label="${esc(c.name)}" style="--sw:${esc(c.hex||'#777')}"></button>`).join('')}</div>
     <div class="size-heading"><label class="choice-label">SELECT SIZE</label><a class="size-link" href="size-guide.html">SIZE GUIDE · FIND YOUR FIT</a></div>
     <div class="sizes">${p.sizes.map(s=>`<button type="button" class="size" data-size="${esc(s)}">${esc(s)}</button>`).join('')}</div>
     <p class="size-error" data-size-error role="alert" aria-live="polite" hidden>Please select your size.</p>
   </div>
   <div class="product-cta product-cta-v22"><button type="button" class="btn dark full product-primary" data-add>ADD TO BAG — ${TanvraStore.money(p.price)}</button><button type="button" class="product-secondary" data-buy>BUY NOW</button></div>
   <div class="product-trust" aria-label="Shopping benefits"><span>${esc(p.gsm)} Heavyweight Cotton</span><span>COD Available</span><span>Secure Payments</span><span>48h Damage Support</span><span>India-wide Delivery</span></div>
   <div class="prepaid-note"><strong>${esc(TANVRA_CONFIG.prepaidCoupon.code)}</strong> · Extra ${TanvraStore.money(TANVRA_CONFIG.prepaidCoupon.discount)} off prepaid</div>
   <section class="product-story"><p class="eyebrow">THE CONCEPT</p><p>${esc(p.description)}</p></section>
   <div class="product-accordions"><details><summary>PRODUCT DETAILS</summary><p>${esc(p.gsm)} · ${esc(p.material)} · ${esc(p.fit)} fit. Print: ${esc(p.print)}.</p></details><details><summary>DELIVERY</summary><p>India-wide delivery. See the shipping page for the current policy.</p></details><details><summary>RETURNS & DAMAGE</summary><p>Damage claims follow the current TANVRA returns policy. General wrong-size returns are not promised; use the size guide before ordering.</p></details></div>
 </section></div>
 <div class="mobile-buybar mobile-buybar-v22"><div class="mobile-price"><span>${esc(treatment.display)}</span><strong>${TanvraStore.money(p.price)}</strong></div><button type="button" class="btn dark" data-mobile-add>ADD TO BAG</button></div>`;

 const carousel=root.querySelector('[data-carousel]'),dots=[...root.querySelectorAll('[data-dot]')],slides=[...root.querySelectorAll('.product-slide')];
 function goTo(i){const slide=slides[i];if(!slide)return;carousel.scrollTo({left:slide.offsetLeft,behavior:'smooth'})}
 dots.forEach(d=>d.onclick=()=>goTo(+d.dataset.dot));
 let ticking=false;carousel?.addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{const center=carousel.scrollLeft+carousel.clientWidth/2;let best=0,dist=Infinity;slides.forEach((s,i)=>{if(s.hidden)return;const d=Math.abs((s.offsetLeft+s.offsetWidth/2)-center);if(d<dist){dist=d;best=i}});dots.forEach((d,i)=>d.classList.toggle('active',i===best));ticking=false})},{passive:true});
 root.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{color=b.dataset.color;root.querySelector('[data-color-name]').textContent=color;root.querySelectorAll('[data-color]').forEach(x=>x.classList.toggle('active',x===b));const idx=gallery.findIndex(x=>x===b.dataset.image||x.endsWith('/'+String(b.dataset.image).split('/').pop()));if(idx>=0)goTo(idx)});
 root.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{size=b.dataset.size;root.querySelectorAll('[data-size]').forEach(x=>x.classList.toggle('active',x===b));const err=root.querySelector('[data-size-error]');err.hidden=true});
 function ensureSize(){if(size)return true;const err=root.querySelector('[data-size-error]');err.hidden=false;root.querySelector('.size-heading')?.scrollIntoView({behavior:'smooth',block:'center'});return false}
 function add(){if(!ensureSize())return false;TanvraStore.add({productId:p.id,size,color,qty:1});TanvraAnalytics?.addToCart?.(p,1);return true}
 function flash(btn,label){btn.textContent='ADDED ✓';setTimeout(()=>btn.textContent=label,1100)}
 root.querySelector('[data-add]').onclick=()=>{if(add())flash(root.querySelector('[data-add]'),`ADD TO BAG — ${TanvraStore.money(p.price)}`)};
 root.querySelector('[data-mobile-add]').onclick=()=>{if(add())flash(root.querySelector('[data-mobile-add]'),'ADD TO BAG')};
 root.querySelector('[data-buy]').onclick=()=>{if(!add())return;location.href='checkout.html'};
});
