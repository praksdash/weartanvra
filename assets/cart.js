
document.addEventListener("DOMContentLoaded",renderCart);
function renderCart(){
  const list=document.querySelector("[data-cart-list]");
  const summary=document.querySelector("[data-cart-summary]");
  if(!list||!summary) return;
  const cart=TanvraStore.getCart();
  if(!cart.length){
    list.innerHTML=`<div class="empty-state"><h2>Your bag is empty.</h2><p>Start with DROP 01.</p><a class="btn dark" href="shop.html">SHOP NOW</a></div>`;
    summary.innerHTML="";
    return;
  }
  list.innerHTML=cart.map(item=>{
    const p=TanvraStore.productById(item.productId); if(!p) return "";
    const color=p.colors.find(c=>c.name===item.color) || p.colors[0];
    return `<div class="cart-row">
      <img src="${color.image||p.images[0]}" alt="${p.name}">
      <div><h3>${p.name}</h3><p>Size: ${item.size}</p><p>Color: ${item.color}</p><button class="remove" data-remove="${item.key}">Remove</button></div>
      <div><strong>${TanvraStore.money(p.price*item.qty)}</strong><br><input class="qty" type="number" min="1" value="${item.qty}" data-qty="${item.key}"></div>
    </div>`;
  }).join("");
  const total=TanvraStore.cartTotal();
  summary.innerHTML=`<div class="summary"><p class="eyebrow">ORDER SUMMARY</p>
    <div class="summary-row"><span>Items</span><span>${TanvraStore.cartCount()}</span></div>
    <div class="summary-row"><span>Subtotal</span><strong>${TanvraStore.money(total)}</strong></div>
    <div class="summary-row"><span>Shipping</span><span>Calculated/confirmed at checkout</span></div>
    <div class="summary-row total"><span>Total before shipping</span><strong>${TanvraStore.money(total)}</strong></div>
    <a class="btn dark full" href="checkout.html">PROCEED TO CHECKOUT</a></div>`;
  list.querySelectorAll("[data-remove]").forEach(b=>b.addEventListener("click",()=>{TanvraStore.removeItem(b.dataset.remove);renderCart()}));
  list.querySelectorAll("[data-qty]").forEach(i=>i.addEventListener("change",()=>{TanvraStore.updateQty(i.dataset.qty,i.value);renderCart()}));
}
