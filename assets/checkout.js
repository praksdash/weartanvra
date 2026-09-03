function currentPayment(form){
  return new FormData(form).get("payment") || "Prepaid";
}

function buildOrderPayload(form){
  const fd=new FormData(form);
  const payment=fd.get("payment") || "Prepaid";
  const items=TanvraStore.getCart().map(x=>{
    const p=TanvraStore.productById(x.productId);
    return {
      product_id:x.productId,
      product:p?.name||x.productId,
      size:x.size,
      color:x.color,
      qty:x.qty
    };
  });
  const pricing=TanvraStore.pricing(payment);
  return {
    customer:Object.fromEntries(fd.entries()),
    items,
    payment_method:payment,
    coupon:payment==="Prepaid" ? "PREPAID50" : null,
    pricing,
    currency:"INR",
    source:"weartanvra.com"
  };
}

function buildText(order){
  const c=order.customer, p=order.pricing;
  const lines=[
    "WEAR TANVRA ORDER REQUEST","",
    `Name: ${c.name}`,`Phone: ${c.phone}`,`Email: ${c.email||"-"}`,
    `Payment: ${order.payment_method}`,
    order.coupon ? `Coupon: ${order.coupon} (-₹${p.discount})` : "Coupon: -",
    "",
    "Items:"
  ];
  order.items.forEach(x=>{
    const product=TanvraStore.productById(x.product_id);
    lines.push(`- ${product?.name||x.product_id} | ${x.color} | ${x.size} | Qty ${x.qty}`);
  });
  lines.push(
    "",
    `Subtotal: ₹${p.subtotal}`,
    `Discount: -₹${p.discount}`,
    `Shipping: ₹${p.shipping}`,
    `Total: ₹${p.total}`,
    "",
    `Address: ${c.address}`,
    `${c.city}, ${c.state} - ${c.pincode}`
  );
  return lines.join("\n");
}

function renderCheckoutSummary(summary, payment){
  const cart=TanvraStore.getCart();
  const p=TanvraStore.pricing(payment);
  const cfg=window.TANVRA_CONFIG||{};
  const code=cfg.prepaidCoupon?.code||"PREPAID50";

  summary.innerHTML=
    cart.map(x=>{
      const product=TanvraStore.productById(x.productId);
      return `<div class="summary-row"><span>${product.name} × ${x.qty}<br><small>${x.color} / ${x.size}</small></span><strong>${TanvraStore.money(product.price*x.qty)}</strong></div>`;
    }).join("")+
    `<div class="summary-row"><span>Subtotal</span><strong>${TanvraStore.money(p.subtotal)}</strong></div>`+
    (payment==="Prepaid"
      ? `<div class="summary-row discount"><span>Prepaid coupon <small>${code}</small></span><strong>- ${TanvraStore.money(p.discount)}</strong></div>`
      : `<div class="summary-row"><span>Prepaid coupon</span><span>Not applied</span></div>`) +
    `<div class="summary-row"><span>Shipping</span><strong>${TanvraStore.money(p.shipping)}</strong></div>`+
    `<div class="summary-row total"><span>Payable total</span><strong>${TanvraStore.money(p.total)}</strong></div>`+
    (payment==="Prepaid" ? `<div class="coupon-pill">✓ ₹50 prepaid discount applied automatically</div>` : `<div class="cod-note">Switch to Prepaid to save ₹50.</div>`);
}

function showManualFallback(order, reason){
  const cfg=window.TANVRA_CONFIG||{};
  const box=document.querySelector("[data-success]");
  const text=buildText(order);
  box.classList.add("show");
  box.querySelector("[data-success-title]").textContent="Order request ready";
  box.querySelector("[data-success-message]").textContent=reason || "Secure checkout is not active yet. You can send or copy these order details.";
  box.querySelector("pre").textContent=text;
  const email=cfg.supportEmail||"";
  box.querySelector("[data-email-order]").href=`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent("WEAR TANVRA order request")}&body=${encodeURIComponent(text)}`;
  box.querySelector("[data-copy-order]").onclick=async()=>{
    await navigator.clipboard.writeText(text);
    alert("Order details copied.");
  };
  box.scrollIntoView({behavior:"smooth", block:"center"});
}

async function createGatewayOrder(backendUrl, order){
  const res=await fetch(backendUrl.replace(/\/$/,"")+"/api/create-order",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(order)
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error || "Could not create payment order");
  return data;
}

async function verifyGatewayPayment(backendUrl, payload){
  const res=await fetch(backendUrl.replace(/\/$/,"")+"/api/verify-payment",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(payload)
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok || !data.verified) throw new Error(data.error || "Payment verification failed");
  return data;
}

async function placeCodOrder(backendUrl, order){
  const res=await fetch(backendUrl.replace(/\/$/,"")+"/api/cod-order",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(order)
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error || "Could not create COD order");
  return data;
}

document.addEventListener("DOMContentLoaded",()=>{
  const form=document.querySelector("[data-checkout-form]");
  const summary=document.querySelector("[data-checkout-summary]");
  const status=document.querySelector("[data-payment-status]");
  if(!form||!summary) return;

  const cart=TanvraStore.getCart();
  if(!cart.length){ location.href="cart.html"; return; }

  const cfg=window.TANVRA_CONFIG||{};
  const backend=(cfg.paymentBackendUrl||"").trim();

  if(cfg.checkoutMode==="razorpay" && backend){
    status.innerHTML="<strong>Secure checkout active:</strong> prepaid payments are processed through Razorpay using the WEAR TANVRA secure backend. Secret keys are not exposed in GitHub.";
  }

  const paymentInputs=[...form.querySelectorAll('input[name="payment"]')];
  const selectedPayment=()=>form.querySelector('input[name="payment"]:checked')?.value||"Prepaid";
  const payButton=form.querySelector("[data-pay-button]");

  function refresh(){
    const payment=selectedPayment();
    renderCheckoutSummary(summary,payment);
    payButton.textContent = payment==="Prepaid"
      ? `PAY ${TanvraStore.money(TanvraStore.pricing(payment).total)} SECURELY`
      : `PLACE COD ORDER • ${TanvraStore.money(TanvraStore.pricing(payment).total)}`;
  }
  paymentInputs.forEach(x=>x.addEventListener("change",refresh));
  refresh();

  form.addEventListener("submit",async(e)=>{
    e.preventDefault();
    const order=buildOrderPayload(form);
    const payment=order.payment_method;
    const btn=payButton;
    btn.disabled=true;

    // Safe fallback until Worker + keys are configured.
    if(cfg.checkoutMode!=="razorpay" || !backend){
      showManualFallback(order,
        "Secure payment is not enabled yet. The ₹50 prepaid discount has been calculated, but no payment has been charged.");
      btn.disabled=false;
      return;
    }

    try{
      if(payment==="Cash on Delivery"){
        const cod=await placeCodOrder(backend,order);
        TanvraStore.saveCart([]);
        location.href=`success.html?type=cod&order=${encodeURIComponent(cod.order_id)}`;
        return;
      }

      if(typeof Razorpay==="undefined") throw new Error("Razorpay Checkout did not load");

      const created=await createGatewayOrder(backend,order);

      const options={
        key:created.key_id,
        amount:created.amount,
        currency:created.currency||"INR",
        name:"WEAR TANVRA",
        description:`Order ${created.receipt||""}`,
        order_id:created.razorpay_order_id,
        prefill:{
          name:order.customer.name||"",
          email:order.customer.email||"",
          contact:order.customer.phone||""
        },
        notes:{
          coupon:order.coupon||"",
          source:"weartanvra.com"
        },
        theme:{color:"#111111"},
        handler:async function(response){
          btn.disabled=true;
          btn.textContent="VERIFYING PAYMENT…";
          await verifyGatewayPayment(backend,{
            local_order_id:created.local_order_id,
            razorpay_order_id:response.razorpay_order_id,
            razorpay_payment_id:response.razorpay_payment_id,
            razorpay_signature:response.razorpay_signature
          });
          TanvraStore.saveCart([]);
          location.href=`success.html?type=prepaid&order=${encodeURIComponent(created.local_order_id)}`;
        },
        modal:{
          ondismiss:function(){
            btn.disabled=false;
            refresh();
          }
        }
      };
      new Razorpay(options).open();
    }catch(err){
      alert("Checkout could not start: "+err.message);
      btn.disabled=false;
      refresh();
    }
  });
});
