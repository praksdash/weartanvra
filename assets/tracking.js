(()=>{
  const STATUS={
    COD_CONFIRMATION_REQUIRED:{label:'Confirmation pending',stage:1},
    PENDING_PAYMENT:{label:'Payment pending',stage:1},
    AUTHORIZED:{label:'Payment authorised',stage:1},
    COD_CONFIRMED:{label:'Order confirmed',stage:2},
    PAID:{label:'Order confirmed',stage:2},
    SENT_TO_TADDA:{label:'Processing',stage:3},
    PRINTING:{label:'Preparing your order',stage:3},
    DISPATCHED:{label:'Shipped',stage:4},
    DELIVERED:{label:'Delivered',stage:5},
    CANCELLED:{label:'Cancelled',stage:0},
    PAYMENT_FAILED:{label:'Payment failed',stage:0}
  };
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmt=v=>{try{return new Date(v).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}catch{return v||''}};
  function backend(){
    const b=String(window.TANVRA_CONFIG?.paymentBackendUrl||'').replace(/\/$/,'');
    if(!b) throw Error('Order tracking is not configured');
    return b;
  }
  async function track(orderId,email){
    const r=await fetch(backend()+'/api/track-order',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({order_id:String(orderId||'').trim(),email:String(email||'').trim().toLowerCase()})
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw Error(d.error||'Could not find that order');
    return d.order;
  }
  function timeline(status){
    const meta=STATUS[status]||{label:status||'Order received',stage:1};
    if(meta.stage===0){
      return `<div class="tracking-terminal bad"><strong>${esc(meta.label)}</strong><span>Please contact TANVRA support if you need help.</span></div>`;
    }
    const steps=['Order received','Confirmed','Processing','Shipped','Delivered'];
    return `<div class="tracking-progress">${steps.map((s,i)=>`<div class="tracking-step ${i+1<meta.stage?'done':i+1===meta.stage?'current':''}"><span class="tracking-dot">${i+1<meta.stage?'✓':i+1}</span><span>${s}</span></div>`).join('')}</div>`;
  }
  function renderResult(root,order){
    const meta=STATUS[order.status]||{label:order.status||'Order received',stage:1};
    root.innerHTML=`<div class="tracking-result-card"><div class="tracking-result-head"><div><span class="micro">ORDER</span><strong>${esc(order.id)}</strong></div><span class="tracking-status">${esc(meta.label)}</span></div>${timeline(order.status)}<div class="tracking-result-meta"><span>Payment: <b>${esc(order.payment_method)}</b></span><span>Last updated: <b>${esc(fmt(order.updated_at))}</b></span></div></div>`;
  }
  function bindForm(form){
    if(!form||form.dataset.trackingBound==='1')return;
    form.dataset.trackingBound='1';
    const result=form.parentElement?.querySelector('[data-track-result]')||document.querySelector('[data-track-result]');
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const btn=form.querySelector('button[type=submit]'),fd=new FormData(form);
      if(btn)btn.disabled=true;
      if(result){result.innerHTML='<p class="micro">Checking your order…</p>';result.hidden=false;}
      try{
        const order=await track(fd.get('order_id'),fd.get('email'));
        if(result)renderResult(result,order);
      }catch(err){
        if(result)result.innerHTML=`<div class="tracking-error">${esc(err.message)}</div>`;
      }finally{if(btn)btn.disabled=false;}
    });
  }
  function bindAll(){document.querySelectorAll('[data-track-form]').forEach(bindForm)}
  window.TanvraTracking={track,bindForm,bindAll,renderResult};
  document.addEventListener('DOMContentLoaded',bindAll);
})();
