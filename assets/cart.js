document.addEventListener('DOMContentLoaded',()=>{
 const root=document.querySelector('[data-cart-root]');if(!root)return;
 function render(){
  const c=TanvraStore.cart();
  if(!c.length){root.innerHTML='<div class="empty-state"><h1>YOUR BAG IS EMPTY.</h1><a class="btn dark" href="shop.html">SHOP NOW</a></div>';return}
  const p=TanvraStore.pricing('Cash on Delivery');
  root.innerHTML=`<div class="cart-list">${c.map(x=>{const pr=TanvraStore.byId(x.productId);return `<div class="cart-item"><img src="${pr.images[0]}" alt="${pr.name}"><div><h3>${pr.name}</h3><p>${x.color} / ${x.size}</p><div class="price"><strong>${TanvraStore.money(pr.price)}</strong>${pr.compareAt>pr.price?`<s>${TanvraStore.money(pr.compareAt)}</s>`:''}</div><div class="qty-row"><button data-dec="${x.key}">−</button><span>${x.qty}</span><button data-inc="${x.key}">+</button><button class="remove" data-remove="${x.key}">Remove</button></div></div></div>`}).join('')}</div>
  <aside class="cart-summary"><h2>ORDER SUMMARY</h2><div class="summary-row"><span>Product total</span><strong>${TanvraStore.money(p.subtotal)}</strong></div>${p.freeShipping?`<div class="summary-row"><span>Shipping</span><strong class="green">FREE</strong></div>`:`<div class="summary-row shipping-original"><span>Shipping</span><strong><s>${TanvraStore.money(p.shipping)}</s></strong></div><div class="summary-row saving"><span>Shipping included</span><strong>− ${TanvraStore.money(p.shippingIncludedDiscount)}</strong></div>`}<div class="summary-row total"><span>Bag total</span><strong>${TanvraStore.money(p.total)}</strong></div><p class="micro">${p.freeShipping?'You unlocked free shipping.':'Shipping is shown for transparency and included in the displayed product price.'} Choose prepaid at checkout to get an extra ₹50 off with PREPAID50.</p><a class="btn dark full" href="checkout.html">PROCEED TO CHECKOUT</a><a class="continue-link" href="shop.html">Continue shopping</a></aside>`;
  root.querySelectorAll('[data-inc]').forEach(b=>b.onclick=()=>{const x=c.find(i=>i.key===b.dataset.inc);TanvraStore.qty(x.key,x.qty+1);render()});
  root.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>{const x=c.find(i=>i.key===b.dataset.dec);TanvraStore.qty(x.key,x.qty-1);render()});
  root.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{TanvraStore.remove(b.dataset.remove);render()});
 }
 render();
});
