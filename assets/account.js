(()=>{
const $=s=>document.querySelector(s),KEY='tanvraCustomerToken';
let pendingEmail='';
const products=Object.fromEntries((window.TANVRA_PRODUCTS||[]).map(p=>[p.id,p]));
const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n)||0);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmt=v=>{try{return new Date(v).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}catch{return v||''}};
function backend(){const b=(TANVRA_CONFIG.paymentBackendUrl||'').replace(/\/$/,'');if(!b)throw Error('Account service is not configured');return b}
function token(){return localStorage.getItem(KEY)||''}
async function api(path,options={}){const headers={'Content-Type':'application/json',...(options.headers||{})};if(token())headers.Authorization='Bearer '+token();const r=await fetch(backend()+path,{...options,headers});const d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(d.error||'Request failed'),{status:r.status});return d}
async function downloadInvoice(id){const headers={Authorization:'Bearer '+token()};const r=await fetch(backend()+'/api/account/invoice.pdf?id='+encodeURIComponent(id),{headers});if(!r.ok){const d=await r.json().catch(()=>({}));throw Object.assign(Error(d.error||'Could not download invoice'),{status:r.status})}const blob=await r.blob();const cd=r.headers.get('content-disposition')||'';const m=cd.match(/filename=\"?([^\";]+)\"?/i);const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=m?.[1]||('WEAR-TANVRA-'+id+'-invoice.pdf');document.body.appendChild(a);a.click();const u=a.href;a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)}
function msg(t,e=false){const m=$('[data-account-message]');m.textContent=t||'';m.classList.toggle('error',!!e)}
function friendly(s){return({COD_CONFIRMATION_REQUIRED:'COD confirmation pending',COD_CONFIRMED:'COD confirmed',PENDING_PAYMENT:'Payment pending',AUTHORIZED:'Payment authorised',PAID:'Payment confirmed',SENT_TO_TADDA:'Being prepared',PRINTING:'Printing / preparing',DISPATCHED:'Dispatched',DELIVERED:'Delivered',CANCELLED:'Cancelled',PAYMENT_FAILED:'Payment failed'})[s]||s}
function cls(s){if(['PAID','COD_CONFIRMED','DISPATCHED','DELIVERED'].includes(s))return'good';if(['CANCELLED','PAYMENT_FAILED'].includes(s))return'bad';return'pending'}
function render(orders){
  const root=$('[data-account-orders]');
  if(!orders.length){
    root.innerHTML='<div class="empty-state"><h2>NO ORDERS YET.</h2><p>Orders placed using this email will appear here.</p><a class="btn dark" href="shop.html">SHOP NOW</a></div>';
    return;
  }
  root.innerHTML=orders.map(o=>{
    const items=(o.items||[]).map(i=>{
      const p=products[i.product_id],name=p?.name||i.product_id.replace(/[-_]/g,' ');
      return `<div class="account-order-item"><div><strong>${esc(name)}</strong><span>${esc(i.color)} / ${esc(i.size)} • Qty ${esc(i.qty)}</span></div><strong>${money(i.unit_price*i.qty)}</strong></div>`;
    }).join('');
    const invoice=o.invoice_available
      ? `<div class="account-invoice-row"><div><span class="micro">INVOICE</span><strong>${esc(o.invoice_number||'Available')}</strong></div><button class="btn" type="button" data-download-invoice="${esc(o.id)}">DOWNLOAD PDF</button></div>`
      : '';
    return `<article class="account-order-card"><div class="account-order-head"><div><span class="micro">${esc(o.environment||'')}</span><h3>${esc(o.id)}</h3><span>${esc(fmt(o.created_at))}</span></div><span class="status-pill ${cls(o.status)}">${esc(friendly(o.status))}</span></div><div class="account-order-items">${items}</div><div class="account-order-footer"><div><span>Payment</span><strong>${esc(o.payment_method)}</strong></div><div><span>Total</span><strong>${money(o.total)}</strong></div></div>${invoice}</article>`;
  }).join('');
  root.querySelectorAll('[data-download-invoice]').forEach(b=>b.onclick=async()=>{
    b.disabled=true;
    try{await downloadInvoice(b.dataset.downloadInvoice);msg('Invoice downloaded.');}
    catch(e){msg(e.message,true)}
    finally{b.disabled=false}
  });
}
function showLogin(){$('[data-account-login]').hidden=false;$('[data-account-dashboard]').hidden=true}
async function load(){if(!token()){showLogin();return}try{const me=await api('/api/account/me');$('[data-account-email]').textContent=me.email;$('[data-account-login]').hidden=true;$('[data-account-dashboard]').hidden=false;const d=await api('/api/account/orders');render(d.orders||[])}catch(e){if(e.status===401){localStorage.removeItem(KEY);showLogin();msg('Your session expired. Sign in again.',true)}else msg(e.message,true)}}
document.addEventListener('DOMContentLoaded',()=>{const req=$('[data-request-code]'),ver=$('[data-verify-code]');req.onsubmit=async e=>{e.preventDefault();const b=req.querySelector('button'),email=new FormData(req).get('email').trim().toLowerCase();b.disabled=true;try{await api('/api/auth/request-code',{method:'POST',body:JSON.stringify({email})});pendingEmail=email;req.hidden=true;ver.hidden=false;msg('We sent a 6-digit code to '+email);ver.querySelector('input').focus()}catch(x){msg(x.message,true)}finally{b.disabled=false}};ver.onsubmit=async e=>{e.preventDefault();const b=ver.querySelector('button'),code=new FormData(ver).get('code').trim();b.disabled=true;try{const d=await api('/api/auth/verify-code',{method:'POST',body:JSON.stringify({email:pendingEmail,code})});localStorage.setItem(KEY,d.token);msg('');await load()}catch(x){msg(x.message,true)}finally{b.disabled=false}};$('[data-account-refresh]').onclick=load;$('[data-account-logout]').onclick=async()=>{try{await api('/api/auth/logout',{method:'POST',body:'{}'})}catch{}localStorage.removeItem(KEY);location.reload()};load()});
})();