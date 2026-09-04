(()=>{
const $=s=>document.querySelector(s);
const state={orders:[],allOrders:[],quickFilter:'ALL',token:sessionStorage.getItem('tanvraAdminToken')||''};

const productMap=Object.fromEntries((window.TANVRA_PRODUCTS||[]).map(p=>[p.id,p]));
const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n)||0);
const fmt=d=>{try{return new Date(d).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}catch{return d||''}};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

function backend(){
  const b=(window.TANVRA_CONFIG?.paymentBackendUrl||'').replace(/\/$/,'');
  if(!b) throw Error('paymentBackendUrl is not configured in assets/config.js');
  return b;
}

async function api(path,options={}){
  const r=await fetch(backend()+path,{
    ...options,
    headers:{
      'Content-Type':'application/json',
      'Authorization':'Bearer '+state.token,
      ...(options.headers||{})
    }
  });
  const d=await r.json().catch(()=>({}));
  if(r.status===401){ lock(); throw Error('Admin token is not valid'); }
  if(!r.ok) throw Error(d.error||'Request failed');
  return d;
}

function showMessage(text,type='ok'){
  const box=$('[data-message]');
  box.hidden=false; box.textContent=text; box.dataset.type=type;
  clearTimeout(showMessage.t);
  showMessage.t=setTimeout(()=>box.hidden=true,3500);
}

function lock(){
  state.token='';
  sessionStorage.removeItem('tanvraAdminToken');
  $('[data-login]').hidden=false;
  $('[data-dashboard]').hidden=true;
}

function unlock(token){
  state.token=token.trim();
  sessionStorage.setItem('tanvraAdminToken',state.token);
  $('[data-login]').hidden=true;
  $('[data-dashboard]').hidden=false;
}

function productName(id){
  return productMap[id]?.name || id.replace(/[-_]/g,' ');
}

function renderStats(){
  const counts={};
  state.orders.forEach(o=>counts[o.status]=(counts[o.status]||0)+1);
  const testOrders=state.orders.filter(o=>String(o.environment||'TEST').toUpperCase()==='TEST').length;
  const codPending=state.orders.filter(o=>o.payment_method==='Cash on Delivery'&&o.status==='COD_CONFIRMATION_REQUIRED').length;
  const prepaidPending=state.orders.filter(o=>o.payment_method==='Prepaid'&&['PENDING_PAYMENT','AUTHORIZED'].includes(o.status)).length;
  const paid=state.orders.filter(o=>o.payment_method==='Prepaid'&&o.status==='PAID').length;
  const sent=state.orders.filter(o=>o.status==='SENT_TO_TADDA').length;
  const delivered=state.orders.filter(o=>o.status==='DELIVERED').length;

  $('[data-stats]').innerHTML=[
    ['Orders',state.orders.length,''],
    ['TEST orders',testOrders,'test'],
    ['COD pending',codPending,'pending'],
    ['Prepaid pending',prepaidPending,'pending'],
    ['Paid',paid,'good'],
    ['Sent to T-Adda',sent,''],
    ['Delivered',delivered,'good']
  ].map(([k,v,c])=>`<div class="admin-stat ${c}"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('');
}
function statusClass(status){
  if(status==='PAID'||status==='DELIVERED'||status==='COD_CONFIRMED') return 'good';
  if(status==='CANCELLED'||status==='PAYMENT_FAILED') return 'bad';
  return 'pending';
}

function renderOrders(){
  const root=$('[data-orders]');
  if(!state.orders.length){
    root.innerHTML='<div class="empty-state"><h2>No orders found.</h2></div>';
    return;
  }

  root.innerHTML=state.orders.map(o=>{
    const c=o.customer||{},items=o.items||[];
    const itemText=items.map(i=>`${productName(i.product_id)} × ${i.qty}`).join(', ');
    const mismatch=(o.payment_method==='Prepaid'&&o.status.startsWith('COD_'))||
      (o.payment_method==='Cash on Delivery'&&['PENDING_PAYMENT','AUTHORIZED','PAID'].includes(o.status));
    return `<article class="admin-order-card ${mismatch?'integrity-error':''}" data-order-id="${esc(o.id)}">
      <div class="admin-order-top">
        <div>
          <strong class="admin-order-id">${esc(o.id)}</strong>
          <span>${esc(fmt(o.created_at))}</span>
        </div>
        <div class="admin-badges">
          <span class="environment-pill ${String(o.environment||'TEST').toLowerCase()}">${esc(o.environment||'TEST')}</span>
          <span class="status-pill ${statusClass(o.status)}">${esc(o.status)}</span>
        </div>
      </div>
      ${mismatch?'<div class="integrity-warning">STATUS INTEGRITY ERROR — do not fulfil this order until repaired.</div>':''}
      <div class="admin-order-grid">
        <div><small>CUSTOMER</small><strong>${esc(c.name||'')}</strong><span>${esc(c.phone||'')}</span></div>
        <div><small>ITEMS</small><strong>${esc(itemText)}</strong></div>
        <div><small>PAYMENT</small><strong>${esc(o.payment_method)}</strong><span>${money(o.total)}</span></div>
        <div><small>OWNER EMAIL</small><strong>${o.owner_notified_at?'SENT':'NOT SENT'}</strong></div>
      </div>
      <button class="btn admin-view" type="button" data-view="${esc(o.id)}">VIEW / UPDATE</button>
    </article>`;
  }).join('');

  root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>openOrder(b.dataset.view));
}


function applyQuickFilter(){
  const q=state.quickFilter;
  state.orders=state.allOrders.filter(o=>{
    if(q==='ALL') return true;
    if(q==='TEST') return String(o.environment||'TEST').toUpperCase()==='TEST';
    if(q==='COD_PENDING') return o.payment_method==='Cash on Delivery'&&o.status==='COD_CONFIRMATION_REQUIRED';
    if(q==='PREPAID_PENDING') return o.payment_method==='Prepaid'&&['PENDING_PAYMENT','AUTHORIZED'].includes(o.status);
    if(q==='PAID') return o.payment_method==='Prepaid'&&o.status==='PAID';
    return true;
  });
  renderStats();
  renderOrders();
}

async function load(){
  try{
    const status=$('[data-status-filter]').value||'ALL';
    const q=$('[data-search]').value.trim();
    const p=new URLSearchParams({status,limit:'150'});
    if(q) p.set('q',q);
    const d=await api('/api/admin/orders?'+p);
    state.allOrders=d.orders||[];
    applyQuickFilter();
  }catch(e){ showMessage(e.message,'error'); }
}

async function openOrder(id){
  try{
    const o=await api('/api/admin/order?id='+encodeURIComponent(id));
    const c=o.customer||{},items=o.items||[],events=o.events||[];
    $('[data-order-detail]').innerHTML=`
      <div class="admin-detail-head">
        <div><p class="eyebrow">ORDER • ${esc(o.environment||'TEST')}</p><h2>${esc(o.id)}</h2><p>${esc(fmt(o.created_at))}</p></div>
        <span class="status-pill ${statusClass(o.status)}">${esc(o.status)}</span>
      </div>

      <div class="admin-detail-columns">
        <section>
          <h3>Customer</h3>
          <p><b>${esc(c.name)}</b><br>
          <a href="tel:${esc(c.phone)}">${esc(c.phone)}</a><br>
          ${c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a><br>`:''}
          ${esc(c.address)}<br>${esc(c.city)}, ${esc(c.state)} - ${esc(c.pincode)}</p>
        </section>

        <section>
          <h3>Payment</h3>
          <p>${esc(o.payment_method)}<br>
          Product total: ${money(o.subtotal)}<br>
          Discount: -${money(o.discount)}<br>
          Shipping shown: ${money(o.shipping)}<br>
          Shipping included: -${money(o.shipping_discount)}<br>
          <b>Final: ${money(o.total)}</b></p>
        </section>
      </div>

      <section>
        <h3>Items</h3>
        <div class="admin-item-list">
          ${items.map(i=>`<div class="admin-item">
            <div><strong>${esc(productName(i.product_id))}</strong><span>${esc(i.color)} / ${esc(i.size)}</span></div>
            <div>Qty ${esc(i.qty)} • ${money(i.unit_price*i.qty)}</div>
          </div>`).join('')}
        </div>
      </section>

      <section class="admin-update-box">
        <h3>Update status</h3>
        <div class="admin-update-row">
          <select data-new-status>
            ${(
              o.payment_method==='Cash on Delivery'
                ? ['COD_CONFIRMATION_REQUIRED','COD_CONFIRMED','SENT_TO_TADDA','PRINTING','DISPATCHED','DELIVERED','CANCELLED']
                : ['PENDING_PAYMENT','AUTHORIZED','PAID','SENT_TO_TADDA','PRINTING','DISPATCHED','DELIVERED','CANCELLED','PAYMENT_FAILED']
            ).map(s=>`<option ${s===o.status?'selected':''}>${s}</option>`).join('')}
          </select>
          <input data-admin-note placeholder="Optional note" value="${esc(o.admin_note||'')}">
          <button class="btn dark" type="button" data-save-status>SAVE STATUS</button>
        </div>
        <button class="btn" type="button" data-resend-email>RESEND OWNER EMAIL</button>
      </section>

      <section>
        <h3>Timeline</h3>
        <div class="admin-events">
          ${events.length?events.map(e=>`<div class="admin-event">
            <strong>${esc(e.event_type)}</strong>
            <span>${esc(e.status||'')} ${e.note?'• '+esc(e.note):''}</span>
            <small>${esc(fmt(e.created_at))}</small>
          </div>`).join(''):'<p>No events yet.</p>'}
        </div>
      </section>
    `;

    $('[data-save-status]').onclick=async()=>{
      const status=$('[data-new-status]').value;
      const note=$('[data-admin-note]').value.trim();
      await api('/api/admin/order-status',{
        method:'POST',
        body:JSON.stringify({id:o.id,status,note})
      });
      showMessage('Order status updated.');
      await load();
      await openOrder(o.id);
    };

    $('[data-resend-email]').onclick=async()=>{
      const d=await api('/api/admin/resend-notification',{
        method:'POST',
        body:JSON.stringify({id:o.id})
      });
      showMessage(d.result?.sent?'Owner email sent.':(d.result?.reason||'Email not sent.'));
      await load();
    };

    $('[data-dialog]').showModal();
  }catch(e){ showMessage(e.message,'error'); }
}

document.addEventListener('DOMContentLoaded',()=>{
  $('[data-login-form]').onsubmit=async e=>{
    e.preventDefault();
    const token=$('[data-admin-token]').value.trim();
    if(!token) return;
    unlock(token);
    await load();
  };
  $('[data-logout]').onclick=lock;
  $('[data-refresh]').onclick=load;
  $('[data-status-filter]').onchange=load;

  document.querySelectorAll('[data-quick-filter]').forEach(btn=>{
    btn.onclick=()=>{
      document.querySelectorAll('[data-quick-filter]').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
      state.quickFilter=btn.dataset.quickFilter;
      applyQuickFilter();
    };
  });

  let timer;
  $('[data-search]').oninput=()=>{
    clearTimeout(timer);
    timer=setTimeout(load,300);
  };

  $('[data-dialog-close]').onclick=()=> $('[data-dialog]').close();

  if(state.token){
    unlock(state.token);
    load();
  }
});
})();