
document.addEventListener("DOMContentLoaded",()=>{
  const root=document.querySelector("[data-product-root]");
  if(!root) return;
  const id=new URLSearchParams(location.search).get("id");
  const p=TanvraStore.productById(id) || TanvraStore.getProducts()[0];
  if(!p) return;
  document.title=p.name+" | WEAR TANVRA";
  let selectedSize="";
  let selectedColor=p.colors[0].name;

  root.innerHTML=`
    <div class="gallery">${p.images.map(src=>`<img src="${src}" alt="${p.name}" loading="lazy">`).join("")}</div>
    <aside class="product-panel">
      <p class="eyebrow">${p.badge}</p>
      <h1>${p.name}</h1>
      <p class="product-subtitle">${p.subtitle}</p>
      <div class="price"><s>${TanvraStore.money(p.compareAt)}</s><strong>${TanvraStore.money(p.price)}</strong></div>
      <div class="option-title">SELECT SIZE</div>
      <div class="size-row">${p.sizes.map(s=>`<button class="size-btn" type="button" data-size="${s}">${s}</button>`).join("")}</div>
      <div class="option-title">SELECT COLOR</div>
      <div class="color-row">${p.colors.map((c,i)=>`<button class="color-btn ${i===0?"active":""}" type="button" data-color="${c.name}"><span class="color-dot" style="background:${c.hex}"></span>${c.name}</button>`).join("")}</div>
      <p class="product-desc">${p.description}</p>
      <button class="btn dark full" type="button" data-add-cart>ADD TO BAG</button>
      <div class="product-notes">
        <p><strong>Fit:</strong> Oversized. Check the size guide before ordering.</p>
        <p><strong>Fabric:</strong> 220 GSM, 100% cotton.</p>
        <p><strong>Dispatch:</strong> Usually 24–72 business hours.</p>
        <p><strong>Damage claims:</strong> Keep a full unboxing video.</p>
      </div>
    </aside>`;

  root.querySelectorAll("[data-size]").forEach(btn=>btn.addEventListener("click",()=>{
    root.querySelectorAll("[data-size]").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active"); selectedSize=btn.dataset.size;
  }));
  root.querySelectorAll("[data-color]").forEach(btn=>btn.addEventListener("click",()=>{
    root.querySelectorAll("[data-color]").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active"); selectedColor=btn.dataset.color;
  }));
  root.querySelector("[data-add-cart]").addEventListener("click",()=>{
    if(!selectedSize){ alert("Please select a size."); return; }
    TanvraStore.addItem({productId:p.id,size:selectedSize,color:selectedColor,qty:1});
    location.href="cart.html";
  });
});
