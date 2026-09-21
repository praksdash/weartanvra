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
  const specialTitles={
    'oversized-edge-01':'EDGE 01 Oversized T-Shirt | TANVRA',
    'oversized-after-hours':'AFTER HOURS Oversized T-Shirt | TANVRA',
    'oversized-lost-found':'LOST / FOUND Oversized T-Shirt | TANVRA'
  };
  const title=specialTitles[id]||`${p.name} | TANVRA Clothing India`;
  const description=p.description || `${p.name} by TANVRA. Premium streetwear with India-wide delivery.`;
  document.title=title;
  setMeta('meta[name="description"]','content',description);
  let canonical=document.querySelector('link[rel="canonical"]');
  if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}
  canonical.href=canonicalUrl;
  setMeta('meta[property="og:title"]','content',title);
  setMeta('meta[property="og:description"]','content',description);
  setMeta('meta[property="og:url"]','content',canonicalUrl);
  setMeta('meta[property="og:image"]','content',imageUrl);
  const schema={
    '@context':'https://schema.org','@type':'Product','@id':`${canonicalUrl}#product`,name:p.name,
    image:(p.images?.length?p.images:[imagePath]).map(x=>new URL(x,base).href),description,
    brand:{'@type':'Brand',name:'TANVRA'},sku:id,material:p.material||undefined,
    offers:{'@type':'Offer',url:canonicalUrl,priceCurrency:'INR',price:String(p.price),availability:'https://schema.org/InStock',itemCondition:'https://schema.org/NewCondition',seller:{'@id':'https://weartanvra.com/#organization'}}
  };
  let tag=document.getElementById('product-schema');
  if(!tag){tag=document.createElement('script');tag.type='application/ld+json';tag.id='product-schema';document.head.appendChild(tag)}
  tag.textContent=JSON.stringify(schema);
}

function updateReviewSchema(count,average){
  const tag=document.getElementById('product-schema');
  if(!tag||!count)return;
  try{
    const schema=JSON.parse(tag.textContent||'{}');
    schema.aggregateRating={'@type':'AggregateRating',ratingValue:String(average),reviewCount:String(count)};
    tag.textContent=JSON.stringify(schema);
  }catch{}
}

const PRODUCT_TREATMENT={
  'oversized-edge-01':{code:'TNV / 01',display:'EDGE 01',line:'Minimal everyday essential.'},
  'oversized-after-hours':{code:'TNV / 02',display:'AFTER HOURS',line:'Same city. Different mindset.'},
  'oversized-lost-found':{code:'TNV / 03',display:'LOST / FOUND',line:'Not every direction is a destination.'}
};

const REGULAR_MEASUREMENTS=[
  ['XXS','32','22'],
  ['XS','34','23.5'],
  ['S','36','24'],
  ['M','38','25'],
  ['L','40','26'],
  ['XL','42','27'],
  ['XXL','44','29'],
  ['XXXL','46','30']
];

const OVERSIZED_MEASUREMENTS=[
  ['S','40','42','27'],
  ['M','42','44','27.5'],
  ['L','44','46','28'],
  ['XL','46','48','28.5'],
  ['2XL','48','50','29'],
  ['3XL','50','52','29'],
  ['4XL','52','54','30']
];

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

function addBusinessDays(date,days){
  const d=new Date(date);let left=days;
  while(left>0){d.setDate(d.getDate()+1);const day=d.getDay();if(day!==0&&day!==6)left--;}
  return d;
}
function shortDate(d){return new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short'}).format(d)}
function deliveryDates(){
  const today=new Date();
  const dispatchStart=addBusinessDays(today,1),dispatchEnd=addBusinessDays(today,3);
  const deliveryStart=addBusinessDays(dispatchStart,3),deliveryEnd=addBusinessDays(dispatchEnd,7);
  return {today,dispatchStart,dispatchEnd,deliveryStart,deliveryEnd};
}
function starText(rating){
  const rounded=Math.round(Number(rating)||0);return '★★★★★'.split('').map((s,i)=>i<rounded?s:'☆').join('');
}
function backend(){return String(window.TANVRA_CONFIG?.paymentBackendUrl||'').replace(/\/$/,'')}

function sizeGuideMarkup(p,esc){
  const fit=String(p.fit||'').toLowerCase();
  const isRegular=fit.includes('regular') || String(p.category||'').toLowerCase()==='regular';
  if(isRegular){
    return `<p class="size-guide-advice">Regular Fit / Polo supplier size chart. Measurements are shown exactly as supplied.</p>
    <div class="size-table-wrap regular-size-table"><table class="size-table"><thead><tr><th>SIZE</th><th>WIDTH (IN)</th><th>LENGTH (IN)</th></tr></thead><tbody>${REGULAR_MEASUREMENTS.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <p class="size-guide-note"><strong>How to measure:</strong> Lay a well-fitting garment flat and compare the supplier measurements. Only sizes currently shown as selectable on this product page are available to order.</p>`;
  }
  if(fit.includes('oversized')){
    return `<p class="size-guide-advice">Oversized / Relaxed Fit supplier size chart. Measurements are shown exactly as supplied.</p>
    <div class="size-table-wrap oversized-size-table"><table class="size-table"><thead><tr><th>SIZE</th><th>CHEST</th><th>SHOULDER*</th><th>LENGTH</th></tr></thead><tbody>${OVERSIZED_MEASUREMENTS.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <p class="size-guide-note"><strong>Fit note:</strong> Choose your usual size for the intended relaxed/oversized silhouette. Only sizes currently shown as selectable on this product page are available to order.</p>
    <p class="micro">*The column label and values are reproduced from the supplier chart.</p>`;
  }
  return `<p class="size-guide-advice">A detailed size chart is not published for this fit. Contact TANVRA before ordering if you need exact garment measurements.</p><a class="btn" href="size-guide.html">OPEN SIZE GUIDE</a>`;
}

function reviewMarkup(data,esc){
  const count=Number(data?.count||0),avg=Number(data?.average||0),reviews=Array.isArray(data?.reviews)?data.reviews:[];
  if(!count)return `<div class="review-empty"><strong>NO REVIEWS YET</strong><p>Verified customers can review a product after delivery from My Orders.</p><a href="account.html">MY ORDERS →</a></div>`;
  return `<div class="review-summary-card"><div><span class="review-score">${avg.toFixed(1)}</span><span class="review-stars" aria-label="${avg.toFixed(1)} out of 5">${starText(avg)}</span></div><span>${count} verified review${count===1?'':'s'}</span></div><div class="review-list">${reviews.map(r=>`<article class="review-card"><div class="review-card-head"><span class="review-stars">${starText(r.rating)}</span><span>VERIFIED PURCHASE</span></div>${r.title?`<strong>${esc(r.title)}</strong>`:''}<p>${esc(r.body)}</p><small>${esc(r.display_name||'TANVRA customer')} · ${esc(new Date(r.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}))}</small></article>`).join('')}</div>`;
}

function setupPromotion(root){
  const endsAt=String(window.TANVRA_CONFIG?.promotion?.endsAt||'').trim();
  if(!endsAt)return;
  const end=new Date(endsAt);if(!Number.isFinite(end.getTime())||end.getTime()<=Date.now())return;
  const el=root.querySelector('[data-promo-countdown]');if(!el)return;
  el.hidden=false;
  const tick=()=>{
    const ms=end.getTime()-Date.now();
    if(ms<=0){el.hidden=true;clearInterval(timer);return;}
    const total=Math.floor(ms/1000),days=Math.floor(total/86400),hours=Math.floor((total%86400)/3600),mins=Math.floor((total%3600)/60),secs=total%60;
    el.querySelector('[data-countdown-value]').textContent=(days?`${days}d `:'')+`${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  };
  tick();const timer=setInterval(tick,1000);
}

document.addEventListener('DOMContentLoaded',()=>{
  const root=document.querySelector('[data-product-root]');if(!root)return;
  const id=new URLSearchParams(location.search).get('id'),p=TanvraStore.byId(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  if(!p){root.innerHTML='<div class="empty-state"><h1>PRODUCT NOT FOUND</h1><p>This product may have been removed or the link is incorrect.</p><a class="btn dark" href="shop.html">BACK TO SHOP</a></div>';return}

  setProductSeo(p,id);TanvraAnalytics?.viewContent?.(p);
  const treatment=PRODUCT_TREATMENT[p.id]||{code:p.badge||'TANVRA',display:p.name,line:''};
  const gallery=galleryFor(p),delivery=deliveryDates();
  let color=p.colors?.[0]?.name||'As Shown',size='',qty=1;
  const freeAbove=Number(window.TANVRA_CONFIG?.shipping?.freeAbove||499);
  const coupon=window.TANVRA_CONFIG?.prepaidCoupon||{code:'PREPAID50',discount:50};

  root.innerHTML=`<div class="product-layout product-layout-v27">
    <section class="product-media" aria-label="${esc(treatment.display)} product images">
      <div class="product-carousel" data-carousel>${gallery.map((im,i)=>`<figure class="product-slide" data-slide="${i}"><img src="${esc(im)}" alt="${esc(treatment.display)} ${i+1}" loading="${i===0?'eager':'lazy'}" decoding="async" onerror="this.closest('.product-slide').hidden=true"></figure>`).join('')}</div>
      <div class="carousel-dots" aria-label="Image position">${gallery.map((_,i)=>`<button type="button" class="carousel-dot ${i===0?'active':''}" data-dot="${i}" aria-label="Show image ${i+1}"></button>`).join('')}</div>
    </section>

    <section class="product-info product-info-v27">
      <p class="product-code">${esc(treatment.code)}</p>
      <h1>${esc(treatment.display)}</h1>
      ${treatment.line?`<p class="product-line">${esc(treatment.line)}</p>`:''}
      <button type="button" class="review-inline" data-review-jump><span class="review-stars" data-review-stars>☆☆☆☆☆</span><span data-review-count>No reviews yet</span></button>
      <div class="launch-price launch-price-product"><span>${esc(window.TANVRA_PRICING?.priceLabel||'LAUNCH PRICE')}</span><strong>${TanvraStore.money(p.price)}</strong></div>
      <p class="product-spec-line">${esc(p.gsm)} · ${esc(p.material)} · ${esc(p.fit)} Fit</p>

      <div class="prepaid-promo"><strong>₹${esc(coupon.discount)} OFF PREPAID</strong><span>Use ${esc(coupon.code)} at checkout</span></div>
      <div class="promotion-countdown" data-promo-countdown hidden><span>LIMITED OFFER ENDS IN</span><strong data-countdown-value></strong></div>

      <div class="purchase-options">
        <label class="choice-label">COLOUR <strong data-color-name>${esc(color)}</strong></label>
        <div class="swatches">${(p.colors||[]).map((c,i)=>`<button type="button" class="swatch ${i===0?'active':''}" data-color="${esc(c.name)}" data-image="${esc(c.image||gallery[0]||'')}" title="${esc(c.name)}" aria-label="${esc(c.name)}" style="--sw:${esc(c.hex||'#777')}"></button>`).join('')}</div>
        <div class="size-heading"><label class="choice-label">SELECT SIZE</label><button type="button" class="size-link size-link-button" data-size-guide>SIZE GUIDE · FIND YOUR FIT</button></div>
        <div class="sizes">${(p.sizes||[]).map(s=>`<button type="button" class="size" data-size="${esc(s)}">${esc(s)}</button>`).join('')}</div>
        <p class="size-error" data-size-error role="alert" aria-live="polite" hidden>Please select your size.</p>
        <div class="quantity-row"><span class="choice-label">QUANTITY</span><div class="quantity-control"><button type="button" data-qty-minus aria-label="Decrease quantity">−</button><output data-qty>1</output><button type="button" data-qty-plus aria-label="Increase quantity">+</button></div></div>
      </div>

      <div class="product-cta product-cta-v27"><button type="button" class="btn dark full product-primary" data-add>ADD TO BAG — ${TanvraStore.money(p.price)}</button><button type="button" class="product-secondary" data-buy>BUY NOW</button></div>
      <div class="product-trust" aria-label="Shopping benefits"><span>${esc(p.gsm)} Heavyweight Cotton</span><span>COD Available</span><span>Secure Payments</span><span>48h Damage Support</span><span>Free Delivery ₹${freeAbove}+</span></div>

      <section class="delivery-timeline" aria-label="Estimated delivery timeline">
        <div class="delivery-timeline-head"><span>ESTIMATED DELIVERY · INDIA</span><small>Subject to pincode serviceability</small></div>
        <div class="delivery-stage"><i>1</i><div><strong>${shortDate(delivery.today)}</strong><span>Order placed</span></div></div>
        <div class="delivery-stage"><i>2</i><div><strong>${shortDate(delivery.dispatchStart)} – ${shortDate(delivery.dispatchEnd)}</strong><span>Dispatch window</span></div></div>
        <div class="delivery-stage"><i>3</i><div><strong>${shortDate(delivery.deliveryStart)} – ${shortDate(delivery.deliveryEnd)}</strong><span>Estimated delivery</span></div></div>
      </section>

      <section class="product-story"><p class="eyebrow">THE CONCEPT</p><p>${esc(p.description)}</p></section>

      <div class="product-accordions product-accordions-v27">
        <details><summary>PRODUCT DETAILS</summary><div class="accordion-body"><p><b>Fabric:</b> ${esc(p.material)} · ${esc(p.gsm)}</p><p><b>Fit:</b> ${esc(p.fit)}</p><p><b>Print / finish:</b> ${esc(p.print)}</p></div></details>
        <details><summary>RETURNS & DAMAGE</summary><div class="accordion-body"><p>Damage, torn or dirty-item claims can be raised within 48 hours of delivery with sealed-parcel unboxing evidence. General change-of-mind or wrong-size returns are not promised.</p><a href="returns.html">READ RETURNS POLICY →</a></div></details>
        <details><summary>SHIPPING</summary><div class="accordion-body"><p>Free delivery on merchandise subtotal of ₹${freeAbove} or more. Dispatch is usually within 1–3 business days; delivery typically takes 3–7 business days after dispatch.</p><a href="shipping.html">READ SHIPPING POLICY →</a></div></details>
        <details><summary>MANUFACTURING & QUALITY</summary><div class="accordion-body"><p>TANVRA products are fulfilled to the specifications shown on this page. Product colour can vary slightly across screens and lighting; the delivered garment is the final physical reference.</p></div></details>
        <details><summary>TRACK YOUR ORDER</summary><div class="accordion-body"><p>Use the TANVRA order ID from your confirmation email and the same checkout email.</p><form class="inline-track-form" data-track-form><input name="order_id" placeholder="Order ID (WTP… / WTC…)" autocomplete="off" required><input name="email" type="email" placeholder="Checkout email" autocomplete="email" required><button class="btn dark" type="submit">TRACK ORDER</button></form><div data-track-result hidden></div><a href="track-order.html">OPEN FULL TRACKING PAGE →</a></div></details>
      </div>

      <section class="product-quality-grid" aria-label="Product quality highlights">
        <article><span class="quality-mark">GSM</span><div><strong>${esc(p.gsm)} Heavyweight Cotton</strong><p>Structured fabric designed for everyday wear.</p></div></article>
        <article><span class="quality-mark">100%</span><div><strong>${esc(p.material)}</strong><p>Current catalogue material specification.</p></div></article>
        <article><span class="quality-mark">FIT</span><div><strong>${esc(p.fit)} Fit</strong><p>Check the garment size guide before ordering.</p></div></article>
        <article><span class="quality-mark">TNV</span><div><strong>${esc(p.print)}</strong><p>Product-specific design and finish.</p></div></article>
      </section>

      <section class="product-reviews" data-reviews-section>
        <div class="reviews-heading"><div><p class="eyebrow">CUSTOMER REVIEWS</p><h2>VERIFIED PURCHASES.</h2></div><a href="account.html">REVIEW YOUR ORDER →</a></div>
        <div data-review-content><p class="micro">Loading reviews…</p></div>
      </section>
    </section>
  </div>

  <dialog class="size-guide-dialog" data-size-dialog aria-labelledby="size-guide-title">
    <button class="dialog-close" type="button" data-size-close aria-label="Close size guide">×</button>
    <p class="eyebrow">SIZE GUIDE · FIND YOUR FIT</p><h2 id="size-guide-title">${esc(String(p.fit||'').toLowerCase().includes('regular')?'REGULAR FIT / POLO':'OVERSIZED / RELAXED FIT')}</h2>${sizeGuideMarkup(p,esc)}
  </dialog>

  <div class="cart-toast" data-cart-toast hidden><span data-toast-copy>Added to cart.</span><a href="cart.html">VIEW CART</a></div>
  <div class="mobile-buybar mobile-buybar-v27"><div class="mobile-price"><span>${esc(treatment.display)}</span><strong>${TanvraStore.money(p.price)}</strong></div><button type="button" class="btn dark" data-mobile-add>ADD TO BAG</button></div>`;

  const carousel=root.querySelector('[data-carousel]'),dots=[...root.querySelectorAll('[data-dot]')],slides=[...root.querySelectorAll('.product-slide')];
  function goTo(i){const slide=slides[i];if(!slide)return;carousel.scrollTo({left:slide.offsetLeft,behavior:'smooth'})}
  dots.forEach(d=>d.onclick=()=>goTo(+d.dataset.dot));
  let ticking=false;
  carousel?.addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{const center=carousel.scrollLeft+carousel.clientWidth/2;let best=0,dist=Infinity;slides.forEach((s,i)=>{if(s.hidden)return;const d=Math.abs((s.offsetLeft+s.offsetWidth/2)-center);if(d<dist){dist=d;best=i}});dots.forEach((d,i)=>d.classList.toggle('active',i===best));ticking=false})},{passive:true});

  root.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{color=b.dataset.color;root.querySelector('[data-color-name]').textContent=color;root.querySelectorAll('[data-color]').forEach(x=>x.classList.toggle('active',x===b));const idx=gallery.findIndex(x=>x===b.dataset.image||x.endsWith('/'+String(b.dataset.image).split('/').pop()));if(idx>=0)goTo(idx)});
  root.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{size=b.dataset.size;root.querySelectorAll('[data-size]').forEach(x=>x.classList.toggle('active',x===b));root.querySelector('[data-size-error]').hidden=true});

  const qtyOut=root.querySelector('[data-qty]');
  function setQty(next){qty=Math.max(1,Math.min(10,Number(next)||1));qtyOut.textContent=qty;root.querySelector('[data-add]').textContent=`ADD TO BAG — ${TanvraStore.money(p.price*qty)}`;}
  root.querySelector('[data-qty-minus]').onclick=()=>setQty(qty-1);
  root.querySelector('[data-qty-plus]').onclick=()=>setQty(qty+1);

  function ensureSize(){if(size)return true;const err=root.querySelector('[data-size-error]');err.hidden=false;root.querySelector('.size-heading')?.scrollIntoView({behavior:'smooth',block:'center'});return false}
  function add(){if(!ensureSize())return false;TanvraStore.add({productId:p.id,size,color,qty});TanvraAnalytics?.addToCart?.(p,qty);const toast=root.querySelector('[data-cart-toast]');if(toast){toast.hidden=false;toast.querySelector('[data-toast-copy]').textContent=`${treatment.display} · ${color} · ${size} · Qty ${qty} added to cart.`;setTimeout(()=>toast.hidden=true,3500)}return true}
  function flash(btn,label){btn.textContent='ADDED ✓';setTimeout(()=>btn.textContent=label,1100)}
  root.querySelector('[data-add]').onclick=()=>{if(add())flash(root.querySelector('[data-add]'),`ADD TO BAG — ${TanvraStore.money(p.price*qty)}`)};
  root.querySelector('[data-mobile-add]').onclick=()=>{if(add())flash(root.querySelector('[data-mobile-add]'),'ADD TO BAG')};
  root.querySelector('[data-buy]').onclick=()=>{if(!add())return;location.href='checkout.html'};

  const sizeDialog=root.querySelector('[data-size-dialog]');
  root.querySelector('[data-size-guide]').onclick=()=>sizeDialog.showModal();
  root.querySelector('[data-size-close]').onclick=()=>sizeDialog.close();
  sizeDialog.addEventListener('click',e=>{if(e.target===sizeDialog)sizeDialog.close()});

  root.querySelector('[data-review-jump]').onclick=()=>root.querySelector('[data-reviews-section]')?.scrollIntoView({behavior:'smooth',block:'start'});
  root.querySelectorAll('[data-track-form]').forEach(f=>window.TanvraTracking?.bindForm?.(f));
  setupPromotion(root);

  (async()=>{
    const box=root.querySelector('[data-review-content]');
    try{
      const b=backend();if(!b)throw Error('Reviews unavailable');
      const r=await fetch(`${b}/api/reviews?product_id=${encodeURIComponent(p.id)}`);
      const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Reviews unavailable');
      box.innerHTML=reviewMarkup(data,esc);
      const count=Number(data.count||0),avg=Number(data.average||0);
      root.querySelector('[data-review-stars]').textContent=count?starText(avg):'☆☆☆☆☆';
      root.querySelector('[data-review-count]').textContent=count?`${avg.toFixed(1)} · ${count} review${count===1?'':'s'}`:'No reviews yet';
      updateReviewSchema(count,avg);
    }catch{box.innerHTML='<p class="micro">Customer reviews are temporarily unavailable.</p>'}
  })();
});
