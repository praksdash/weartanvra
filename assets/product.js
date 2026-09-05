
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
 const gsm=String(p.gsm||'').trim();
 const material=String(p.material||'').trim();
 const fit=String(p.fit||'').trim();
 const title=`${p.name} | TANVRA Clothing India`;
 const description=p.description
   ? `${p.description} Shop TANVRA ${gsm} ${material} ${fit.toLowerCase()} streetwear with India-wide delivery.`.replace(/\s+/g,' ').trim()
   : `${p.name} by TANVRA. Premium streetwear and T-shirts with India-wide delivery.`;

 document.title=title;
 setMeta('meta[name="description"]','content',description);

 let canonical=document.querySelector('link[rel="canonical"]');
 if(!canonical){
   canonical=document.createElement('link');
   canonical.rel='canonical';
   document.head.appendChild(canonical);
 }
 canonical.href=canonicalUrl;

 setMeta('meta[property="og:title"]','content',title);
 setMeta('meta[property="og:description"]','content',description);
 setMeta('meta[property="og:url"]','content',canonicalUrl);
 setMeta('meta[property="og:image"]','content',imageUrl);

 const schema={
   "@context":"https://schema.org",
   "@type":"Product",
   "@id":`${canonicalUrl}#product`,
   "name":p.name,
   "image":(Array.isArray(p.images)&&p.images.length?p.images:[imagePath]).map(x=>new URL(x,base).href),
   "description":p.description || description,
   "brand":{"@type":"Brand","name":"TANVRA"},
   "sku":id,
   "category":"Apparel & Accessories > Clothing > Shirts & Tops",
   "material":p.material || undefined,
   "offers":{
     "@type":"Offer",
     "url":canonicalUrl,
     "priceCurrency":"INR",
     "price":String(p.price),
     "availability":"https://schema.org/InStock",
     "itemCondition":"https://schema.org/NewCondition",
     "seller":{"@id":"https://weartanvra.com/#organization"}
   }
 };
 Object.keys(schema).forEach(k=>schema[k]===undefined&&delete schema[k]);

 let schemaTag=document.getElementById('product-schema');
 if(!schemaTag){
   schemaTag=document.createElement('script');
   schemaTag.type='application/ld+json';
   schemaTag.id='product-schema';
   document.head.appendChild(schemaTag);
 }
 schemaTag.textContent=JSON.stringify(schema);
}

document.addEventListener('DOMContentLoaded',()=>{
 const root=document.querySelector('[data-product-root]');if(!root)return;
 const id=new URLSearchParams(location.search).get('id'),p=TanvraStore.byId(id);
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!p){root.innerHTML='<div class="empty-state"><h1>PRODUCT NOT FOUND</h1><p>This product may have been removed or the link is incorrect.</p><a class="btn dark" href="shop.html">BACK TO SHOP</a></div>';return}
 setProductSeo(p,id);
 let color=p.colors?.[0]?.name||'As Shown',size=p.sizes?.[0]||'M',active=0;
 const threshold=Number(TANVRA_CONFIG.shipping?.freeAbove||799),free=p.price>=threshold,pct=p.compareAt>p.price?Math.round((1-p.price/p.compareAt)*100):0;
 root.innerHTML=`<div class="product-layout">
 <section><div class="main-product-image"><img data-main-image src="${esc(p.images[0])}" alt="${esc(p.name)}"></div><div class="thumbs">${p.images.map((im,i)=>`<button class="thumb ${i===0?'active':''}" data-thumb="${i}"><img src="${esc(im)}" alt="${esc(p.name)} view ${i+1}"></button>`).join('')}</div></section>
 <section class="product-info"><p class="eyebrow">${esc(p.badge)}</p><h1>${esc(p.name)}</h1><p class="product-subtitle">${esc(p.subtitle)}</p>
 <div class="price big"><strong>${TanvraStore.money(p.price)}</strong>${p.compareAt>p.price?`<s>${TanvraStore.money(p.compareAt)}</s>`:''}${pct?`<span class="discount-chip">SAVE ${pct}%</span>`:''}</div>
 <div class="price-note">MRP inclusive of applicable taxes. ${free?'<strong>FREE SHIPPING</strong> on this product.':`Free shipping on orders ₹${threshold}+.`}</div>
 <p>${esc(p.description)}</p><hr>
 <label class="choice-label">COLOUR <strong data-color-name>${esc(color)}</strong></label><div class="swatches">${p.colors.map((c,i)=>`<button class="swatch ${i===0?'active':''}" data-color="${esc(c.name)}" data-image="${esc(c.image||p.images[0])}" title="${esc(c.name)}" style="--sw:${esc(c.hex||'#777')}"></button>`).join('')}</div>
 <label class="choice-label">SIZE</label><div class="sizes">${p.sizes.map((s,i)=>`<button class="size ${i===0?'active':''}" data-size="${esc(s)}">${esc(s)}</button>`).join('')}</div><a class="size-link" href="size-guide.html">View size guide</a>
 <div class="product-cta"><button class="btn full add-cart" data-add>ADD TO BAG • ${TanvraStore.money(p.price)}</button><button class="btn dark full" data-buy>BUY NOW / CHECKOUT</button></div>
 <div class="offer-box"><strong>PREPAID50</strong><span>Save an extra ₹50 on prepaid orders.</span></div>
 <div class="product-accordions"><details open><summary>PRODUCT DETAILS</summary><p>${esc(p.gsm)} • ${esc(p.material)} • ${esc(p.fit)} fit. Print: ${esc(p.print)}.</p></details><details><summary>FIT & SIZE</summary><p>Use the size guide for garment measurements.</p></details><details><summary>DELIVERY</summary><p>India-wide delivery. See our shipping policy for current estimates.</p></details><details><summary>RETURNS & CARE</summary><p>See Returns & Damage for eligibility and garment care guidance.</p></details></div></section></div><div class="mobile-buybar"><div class="mobile-price"><span>${esc(p.name)}</span><strong>${TanvraStore.money(p.price)}</strong></div><button class="btn dark" data-mobile-add>ADD TO BAG</button></div></section></div>`;
 const main=root.querySelector('[data-main-image]');
 root.querySelectorAll('[data-thumb]').forEach(b=>b.onclick=()=>{active=+b.dataset.thumb;main.src=p.images[active];root.querySelectorAll('[data-thumb]').forEach(x=>x.classList.toggle('active',x===b))});
 root.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{color=b.dataset.color;root.querySelector('[data-color-name]').textContent=color;main.src=b.dataset.image;root.querySelectorAll('[data-color]').forEach(x=>x.classList.toggle('active',x===b))});
 root.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{size=b.dataset.size;root.querySelectorAll('[data-size]').forEach(x=>x.classList.toggle('active',x===b))});
 const add=()=>TanvraStore.add({productId:p.id,size,color,qty:1});
 root.querySelector('[data-add]').onclick=()=>{add();const b=root.querySelector('[data-add]');b.textContent='ADDED ✓';setTimeout(()=>b.textContent=`ADD TO BAG • ${TanvraStore.money(p.price)}`,1000)};
 root.querySelector('[data-mobile-add]').onclick=()=>{add();const b=root.querySelector('[data-mobile-add]');b.textContent='ADDED ✓';setTimeout(()=>b.textContent='ADD TO BAG',1000)};root.querySelector('[data-buy]').onclick=()=>{add();location.href='checkout.html'};
});
