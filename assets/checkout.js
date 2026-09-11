const $=s=>document.querySelector(s);
const CHECKOUT_ATTEMPT_KEY='tanvraCheckoutAttemptV1';
const CUSTOMER_FIELDS=['name','phone','email','pincode','address','city','state'];
function selectedPayment(form){return new FormData(form).get('payment')||'Prepaid'}
function requestId(){let id=sessionStorage.getItem(CHECKOUT_ATTEMPT_KEY);if(!id){id=(crypto.randomUUID?.()||('checkout_'+Date.now()+'_'+Math.random().toString(36).slice(2)));sessionStorage.setItem(CHECKOUT_ATTEMPT_KEY,id)}return id}
function clearAttempt(){sessionStorage.removeItem(CHECKOUT_ATTEMPT_KEY)}
function rememberStatusToken(id,token){if(id&&token)sessionStorage.setItem('tanvraOrderStatusToken:'+id,token)}
function digits(v){return String(v||'').replace(/\D/g,'')}
function clean(v){return String(v||'').trim().replace(/\s+/g,' ')}
function orderPayload(form){const fd=new FormData(form),method=selectedPayment(form),pricing=TanvraStore.pricing(method);return {checkout_request_id:requestId(),customer:{name:clean(fd.get('name')),phone:digits(fd.get('phone')),email:clean(fd.get('email')).toLowerCase(),pincode:digits(fd.get('pincode')),address:clean(fd.get('address')),city:clean(fd.get('city')),state:clean(fd.get('state'))},items:TanvraStore.cart().map(x=>({product_id:x.productId,size:x.size,color:x.color,qty:x.qty})),payment_method:method,coupon:method==='Prepaid'?TANVRA_CONFIG.prepaidCoupon.code:null,pricing,currency:'INR',source:'weartanvra.com'}}
async function api(path,body){const base=(TANVRA_CONFIG.paymentBackendUrl||'').replace(/\/$/,'');if(!base)throw Error('Payment backend is not configured');const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(d.error||'Request failed'),{status:r.status,data:d});return d}
function checkoutMessage(text,type='error'){let box=$('[data-checkout-message]');if(!box){box=document.createElement('div');box.className='checkout-message';box.setAttribute('data-checkout-message','');$('[data-checkout-form]')?.prepend(box)}box.hidden=!text;box.textContent=text||'';box.dataset.type=type;if(text)box.scrollIntoView({behavior:'smooth',block:'nearest'})}

function fieldMessage(input){
 const v=clean(input.value),name=input.name;
 if(name==='name') return v.length>=2?'':'Enter your full name.';
 if(name==='phone') return digits(v).length===10?'':'Enter a valid 10-digit mobile number.';
 if(name==='email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(v)?'':'Enter a valid email address.';
 if(name==='pincode') return /^\d{6}$/.test(digits(v))?'':'Enter a valid 6-digit pincode.';
 if(name==='address') return v.length>=8?'':'Enter your complete house/street/locality address.';
 if(name==='city') return v.length>=2?'':'Enter your city.';
 if(name==='state') return v.length>=2?'':'Enter your state.';
 return '';
}
function paintField(input,force=false){
 const msg=fieldMessage(input),field=input.closest('.field');
 if(!field)return !msg;
 const show=force||input.dataset.touched==='1';
 let err=field.querySelector('.field-error');
 if(!err){err=document.createElement('small');err.className='field-error';err.setAttribute('aria-live','polite');field.appendChild(err)}
 const invalid=Boolean(msg)&&show;
 input.classList.toggle('is-invalid',invalid);
 field.classList.toggle('has-error',invalid);
 input.setAttribute('aria-invalid',invalid?'true':'false');
 err.textContent=invalid?msg:'';
 err.hidden=!invalid;
 return !msg;
}
function validateCustomerForm(form){
 const inputs=CUSTOMER_FIELDS.map(n=>form.elements[n]).filter(Boolean);
 let first=null,ok=true;
 for(const input of inputs){input.dataset.touched='1';if(!paintField(input,true)){ok=false;if(!first)first=input}}
 if(!ok){checkoutMessage('Please correct the fields highlighted in red.');first?.focus();first?.scrollIntoView({behavior:'smooth',block:'center'})}
 return ok;
}
function setupFieldValidation(form){
 for(const name of CUSTOMER_FIELDS){const input=form.elements[name];if(!input)continue;
  input.addEventListener('blur',()=>{input.dataset.touched='1';paintField(input,true)});
  input.addEventListener('input',()=>{if(input.dataset.touched==='1'||input.classList.contains('is-invalid'))paintField(input,true)});
 }
}
function applyServerFieldError(form,message){
 const m=String(message||'');let name='';
 if(/phone/i.test(m))name='phone'; else if(/pincode/i.test(m))name='pincode'; else if(/email/i.test(m))name='email'; else if(/name/i.test(m))name='name'; else if(/address/i.test(m))name='address'; else if(/city/i.test(m))name='city'; else if(/state/i.test(m))name='state';
 if(name&&form.elements[name]){form.elements[name].dataset.touched='1';paintField(form.elements[name],true);form.elements[name].focus()}
}
function summary(method){
 const p=TanvraStore.pricing(method),threshold=p.freeShippingThreshold,coupon=TANVRA_CONFIG.prepaidCoupon;
 const shippingRows=p.freeShipping?`<div class="summary-row"><span>Shipping<small>Free shipping on ₹${threshold}+ merchandise</small></span><strong class="green">FREE</strong></div>`:`<div class="summary-row shipping-original"><span>Shipping<small>Shown for transparency</small></span><strong><s>${TanvraStore.money(p.shipping)}</s></strong></div><div class="summary-row saving"><span>Shipping included</span><strong>− ${TanvraStore.money(p.shippingIncludedDiscount)}</strong></div>`;
 $('[data-checkout-summary]').innerHTML=`<h2>ORDER SUMMARY</h2>`+TanvraStore.cart().map(x=>{const pr=TanvraStore.byId(x.productId);return `<div class="summary-row"><span>${pr.name} × ${x.qty}<small>${x.color} / ${x.size}</small></span><strong>${TanvraStore.money(pr.price*x.qty)}</strong></div>`}).join('')+`<div class="summary-row"><span>Product total</span><strong>${TanvraStore.money(p.subtotal)}</strong></div>`+(method==='Prepaid'?`<div class="summary-row saving"><span>${coupon.code}<small>Prepaid discount</small></span><strong>− ${TanvraStore.money(p.discount)}</strong></div>`:'')+shippingRows+`<div class="summary-row total"><span>${method==='Prepaid'?'Razorpay payable':'COD payable'}</span><strong>${TanvraStore.money(p.total)}</strong></div>${method==='Prepaid'?`<p class="checkout-price-note">Final prepaid amount is securely confirmed from TANVRA pricing before Razorpay opens.</p>`:''}`;
 $('[data-pay-button]').textContent=method==='Prepaid'?`PAY ${TanvraStore.money(p.total)} WITH RAZORPAY`:`PLACE COD ORDER • ${TanvraStore.money(p.total)}`;
}
function reconcileAuthoritativePricing(created,local){
 const serverTotal=Number(created?.pricing?.total ?? created?.amount/100),serverSubtotal=Number(created?.pricing?.subtotal);
 if(!Number.isFinite(serverTotal))throw Error('Could not verify the final payable amount. Please try again.');
 const sameTotal=Math.round(serverTotal*100)===Math.round(Number(local.total)*100);
 const sameSubtotal=!Number.isFinite(serverSubtotal)||Math.round(serverSubtotal*100)===Math.round(Number(local.subtotal)*100);
 if(!sameTotal||!sameSubtotal){clearAttempt();throw Error('Checkout pricing has just been updated. Please refresh this page once and continue with the latest amount.')}
}
function fallback(order){const p=order.pricing,coupon=TANVRA_CONFIG.prepaidCoupon;const lines=['WEAR TANVRA ORDER REQUEST','',`Name: ${order.customer.name}`,`Phone: ${order.customer.phone}`,`Payment: ${order.payment_method}`,order.coupon?`Coupon: ${coupon.code} (-₹${p.discount})`:'Coupon: -','',...order.items.map(i=>{const pr=TanvraStore.byId(i.product_id);return `- ${pr.name} | ${i.color} | ${i.size} | Qty ${i.qty}`}),'',`Product total: ₹${p.subtotal}`,`Final payable: ₹${p.total}`,'',`${order.customer.address}, ${order.customer.city}, ${order.customer.state} - ${order.customer.pincode}`];const text=lines.join('\n'),box=$('[data-fallback]');box.hidden=false;box.querySelector('pre').textContent=text;box.querySelector('[data-copy]').onclick=()=>navigator.clipboard.writeText(text);box.scrollIntoView({behavior:'smooth'})}
document.addEventListener('DOMContentLoaded',()=>{const form=$('[data-checkout-form]');if(!form)return;if(!TanvraStore.cart().length){location.href='cart.html';return}setupFieldValidation(form);const radios=[...form.querySelectorAll('[name=payment]')],method=()=>selectedPayment(form);radios.forEach(r=>r.onchange=()=>{clearAttempt();summary(method())});summary(method());TanvraAnalytics?.initiateCheckout?.(TanvraStore.cart());form.onsubmit=async e=>{e.preventDefault();checkoutMessage('');if(!validateCustomerForm(form))return;const order=orderPayload(form),btn=$('[data-pay-button]');btn.disabled=true;try{if(TANVRA_CONFIG.checkoutMode!=='razorpay'||!TANVRA_CONFIG.paymentBackendUrl){fallback(order);return}if(order.payment_method==='Cash on Delivery'){const d=await api('/api/cod-order',order);reconcileAuthoritativePricing(d,order.pricing);rememberStatusToken(d.order_id,d.status_token);const purchase=TanvraAnalytics?.cartParams?.(TanvraStore.cart())||{};purchase.value=Number(d.pricing?.total||purchase.value||0);purchase.payment_method='Cash on Delivery';TanvraAnalytics?.rememberPurchase?.(d.order_id,purchase);TanvraAnalytics?.purchase?.(d.order_id,purchase);clearAttempt();TanvraStore.save([]);location.href=`success.html?order=${encodeURIComponent(d.order_id)}`;return}const created=await api('/api/create-order',order);reconcileAuthoritativePricing(created,order.pricing);rememberStatusToken(created.local_order_id,created.status_token);if(typeof Razorpay==='undefined')throw Error('Payment window could not load. Check your connection and try again.');new Razorpay({key:created.key_id,amount:created.amount,currency:created.currency,name:'WEAR TANVRA',description:`${created.receipt} • ${TanvraStore.money(created.amount/100)}`,order_id:created.razorpay_order_id,prefill:{name:order.customer.name,email:order.customer.email||'',contact:order.customer.phone},theme:{color:'#111111'},handler:async resp=>{btn.textContent='VERIFYING PAYMENT…';try{const v=await api('/api/verify-payment',{local_order_id:created.local_order_id,razorpay_payment_id:resp.razorpay_payment_id,razorpay_signature:resp.razorpay_signature});if(!v.verified)throw Error('Payment verification failed');if(v.status==='PAID'){const purchase=TanvraAnalytics?.cartParams?.(TanvraStore.cart())||{};purchase.value=Number(created.pricing?.total||purchase.value||0);purchase.payment_method='Prepaid';TanvraAnalytics?.rememberPurchase?.(created.local_order_id,purchase);TanvraAnalytics?.purchase?.(created.local_order_id,purchase)}clearAttempt();TanvraStore.save([]);location.href=`success.html?order=${encodeURIComponent(created.local_order_id)}`}catch(err){checkoutMessage(err.message||'Payment verification failed');btn.disabled=false;summary(method())}},modal:{ondismiss:()=>{btn.disabled=false;summary(method())}}}).open()}catch(err){applyServerFieldError(form,err.message);checkoutMessage(err.message||'Checkout failed');if(err.status===409)clearAttempt()}finally{if(!location.href.includes('success.html')){btn.disabled=false;summary(method())}}}});
