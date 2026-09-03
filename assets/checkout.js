
function buildOrderPayload(form){
  const fd=new FormData(form);
  const items=TanvraStore.getCart().map(x=>{
    const p=TanvraStore.productById(x.productId);
    return {product_id:x.productId,product:p?.name||x.productId,size:x.size,color:x.color,qty:x.qty,unit_price:p?.price||0};
  });
  return {
    customer:Object.fromEntries(fd.entries()),
    items,
    subtotal:TanvraStore.cartTotal(),
    currency:"INR",
    source:"weartanvra.com"
  };
}
function buildText(order){
  const c=order.customer;
  const lines=[
    "WEAR TANVRA ORDER REQUEST","",
    `Name: ${c.name}`,`Phone: ${c.phone}`,`Email: ${c.email||"-"}`,
    `Payment preference: ${c.payment}`,"",
    "Items:"
  ];
  order.items.forEach(x=>lines.push(`- ${x.product} | ${x.color} | ${x.size} | Qty ${x.qty} | ₹${x.unit_price*x.qty}`));
  lines.push("",`Subtotal before shipping: ₹${order.subtotal}`,"",`Address: ${c.address}`,`${c.city}, ${c.state} - ${c.pincode}`);
  return lines.join("\n");
}
document.addEventListener("DOMContentLoaded",()=>{
  const form=document.querySelector("[data-checkout-form]");
  const summary=document.querySelector("[data-checkout-summary]");
  if(!form||!summary) return;
  const cart=TanvraStore.getCart();
  if(!cart.length){ location.href="cart.html"; return; }
  summary.innerHTML=cart.map(x=>{
    const p=TanvraStore.productById(x.productId);
    return `<div class="summary-row"><span>${p.name} × ${x.qty}<br><small>${x.color} / ${x.size}</small></span><strong>${TanvraStore.money(p.price*x.qty)}</strong></div>`;
  }).join("")+`<div class="summary-row total"><span>Subtotal</span><strong>${TanvraStore.money(TanvraStore.cartTotal())}</strong></div>`;

  form.addEventListener("submit",async(e)=>{
    e.preventDefault();
    const order=buildOrderPayload(form);
    const cfg=window.TANVRA_CONFIG||{};
    const btn=form.querySelector("button[type=submit]");
    btn.disabled=true;

    if(cfg.checkoutMode==="fastrr" && cfg.fastrrSessionEndpoint){
      try{
        const res=await fetch(cfg.fastrrSessionEndpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(order)});
        if(!res.ok) throw new Error("Checkout service returned "+res.status);
        const data=await res.json();
        const url=data.checkout_url || data.checkoutUrl || data.url;
        if(!url) throw new Error("No checkout URL returned");
        location.href=url; return;
      }catch(err){
        alert("Secure checkout could not start. Your cart is still saved. "+err.message);
        btn.disabled=false; return;
      }
    }

    // Prelaunch/manual fallback: user can send or copy an order request.
    const text=buildText(order);
    const box=document.querySelector("[data-success]");
    box.classList.add("show");
    box.querySelector("pre").textContent=text;
    const email=cfg.supportEmail||"";
    box.querySelector("[data-email-order]").href=`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent("WEAR TANVRA order request")}&body=${encodeURIComponent(text)}`;
    box.querySelector("[data-copy-order]").onclick=async()=>{await navigator.clipboard.writeText(text); alert("Order details copied.");};
    btn.disabled=false;
  });
});
