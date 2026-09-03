
document.addEventListener("DOMContentLoaded",()=>{
  const grid=document.querySelector("[data-shop-grid]");
  if(!grid) return;
  grid.innerHTML=TanvraStore.getProducts().map(p=>`
    <article class="product-card">
      <a href="product.html?id=${encodeURIComponent(p.id)}">
        <span class="card-badge">${p.badge}</span>
        <div class="product-image"><img src="${p.images[0]}" alt="${p.name}" loading="lazy"></div>
        <div class="product-meta"><h3>${p.name}</h3><p>${p.subtitle}</p><div class="price"><s>${TanvraStore.money(p.compareAt)}</s><strong>${TanvraStore.money(p.price)}</strong></div></div>
      </a>
    </article>`).join("");
});
