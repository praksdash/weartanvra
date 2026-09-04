import { PRODUCTS } from './catalog.js';

const SIZES = new Set(['S','M','L','XL']);
const ADMIN_STATUSES = new Set([
  'COD_CONFIRMATION_REQUIRED',
  'COD_CONFIRMED',
  'PENDING_PAYMENT',
  'PAID',
  'AUTHORIZED',
  'SENT_TO_TADDA',
  'PRINTING',
  'DISPATCHED',
  'DELIVERED',
  'CANCELLED',
  'PAYMENT_FAILED'
]);

const COD_ONLY_STATUSES = new Set(['COD_CONFIRMATION_REQUIRED','COD_CONFIRMED']);
const PREPAID_ONLY_STATUSES = new Set(['PENDING_PAYMENT','AUTHORIZED','PAID']);

function orderEnvironment(env){
  return String(env.ORDER_ENVIRONMENT||'TEST').toUpperCase()==='LIVE' ? 'LIVE' : 'TEST';
}

function assertStatusAllowed(paymentMethod,status){
  if(paymentMethod==='Prepaid' && COD_ONLY_STATUSES.has(status)){
    throw Error('Invalid order state: prepaid orders cannot use a COD status');
  }
  if(paymentMethod==='Cash on Delivery' && PREPAID_ONLY_STATUSES.has(status)){
    throw Error('Invalid order state: COD orders cannot use a prepaid payment status');
  }
}

const now = () => new Date().toISOString();
const clean = (v,n=300) => String(v ?? '').trim().slice(0,n);
const normalEmail = v => clean(v,120).toLowerCase();
function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalEmail(v)); }

function originFor(req,env){
  const o=req.headers.get('Origin')||'';
  const allowed=String(env.ALLOWED_ORIGINS||'')
    .split(',').map(x=>x.trim()).filter(Boolean);
  return allowed.includes(o) ? o : (allowed[0] || 'https://weartanvra.com');
}

function headers(origin){
  return {
    'content-type':'application/json; charset=utf-8',
    'access-control-allow-origin':origin,
    'vary':'Origin',
    'access-control-allow-methods':'GET,POST,OPTIONS',
    'access-control-allow-headers':'Content-Type,Authorization,X-Razorpay-Signature,X-Razorpay-Event-Id',
    'cache-control':'no-store'
  };
}

function json(data,status=200,origin='*'){
  return new Response(JSON.stringify(data),{status,headers:headers(origin)});
}

function validateCustomer(c){
  if(!c) throw Error('Missing customer');
  for(const k of ['name','phone','email','pincode','address','city','state']){
    if(!clean(c[k])) throw Error(`Missing ${k}`);
  }
  const phone=clean(c.phone).replace(/\D/g,'');
  if(!/^\d{10}$/.test(phone)) throw Error('Phone must contain 10 digits');
  if(!/^\d{6}$/.test(clean(c.pincode))) throw Error('Pincode must contain 6 digits');
  if(!validEmail(c.email)) throw Error('Enter a valid email address');
}

function price(order,env){
  if(!Array.isArray(order.items)||!order.items.length) throw Error('Cart is empty');
  let subtotal=0,items=[];

  for(const raw of order.items){
    const id=clean(raw.product_id,100);
    const unit=PRODUCTS[id];
    const qty=Math.max(1,Math.min(10,Number(raw.qty)||1));
    if(!unit) throw Error(`Unknown product: ${id}`);
    if(!SIZES.has(clean(raw.size,4))) throw Error('Invalid size');
    items.push({
      product_id:id,
      size:clean(raw.size,4),
      color:clean(raw.color,60),
      qty,
      unit_price:unit
    });
    subtotal += unit*qty;
  }

  const prepaid=order.payment_method==='Prepaid';
  if(!prepaid && order.payment_method!=='Cash on Delivery') throw Error('Invalid payment method');

  const discount=prepaid ? Math.min(Number(env.PREPAID_DISCOUNT||50),subtotal) : 0;
  const freeAbove=Number(env.FREE_SHIPPING_ABOVE||799);
  const freeShipping=subtotal>=freeAbove;

  let shipping=0;
  if(!freeShipping){
    shipping=prepaid
      ? Number(env.PREPAID_SHIPPING_BELOW_THRESHOLD||68)
      : Math.max(
          Number(env.COD_MINIMUM_BELOW_THRESHOLD||98),
          Math.ceil(subtotal*Number(env.COD_PERCENT_BELOW_THRESHOLD||2.3)/100)
        );
  }

  const shippingIncludedDiscount=freeShipping ? 0 : shipping;
  const payableShipping=Math.max(0,shipping-shippingIncludedDiscount);

  return {
    items,subtotal,discount,shipping,
    shippingIncludedDiscount,
    payableShipping,
    freeShipping,
    freeShippingThreshold:freeAbove,
    total:Math.max(0,subtotal-discount+payableShipping)
  };
}

function ref(prefix){
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;
}

function basic(k,s){ return 'Basic '+btoa(`${k}:${s}`); }

async function hmac(secret,msg){
  const key=await crypto.subtle.importKey(
    'raw',new TextEncoder().encode(secret),
    {name:'HMAC',hash:'SHA-256'},false,['sign']
  );
  const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function sha256(msg){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(msg)));
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function randomCode(){
  const a=new Uint32Array(1); crypto.getRandomValues(a);
  return String(a[0]%1000000).padStart(6,'0');
}
function randomToken(){ return `${crypto.randomUUID()}-${crypto.randomUUID()}`; }
function isoPlusMinutes(n){ return new Date(Date.now()+n*60000).toISOString(); }
function isoPlusDays(n){ return new Date(Date.now()+n*86400000).toISOString(); }
function razorpayMode(env){
  const id=String(env.RAZORPAY_KEY_ID||'');
  if(id.startsWith('rzp_live_')) return 'LIVE';
  if(id.startsWith('rzp_test_')) return 'TEST';
  return 'UNKNOWN';
}
function assertGatewayEnvironment(env){
  const a=orderEnvironment(env),b=razorpayMode(env);
  if(b==='UNKNOWN') throw Error('Razorpay key is not configured');
  if(a!==b) throw Error(`Environment mismatch: ORDER_ENVIRONMENT=${a}, Razorpay=${b}`);
}

function safeEqual(a,b){
  a=String(a||''); b=String(b||'');
  if(a.length!==b.length) return false;
  let x=0;
  for(let i=0;i<a.length;i++) x|=a.charCodeAt(i)^b.charCodeAt(i);
  return x===0;
}

async function event(env,orderId,eventType,status=null,note=null){
  await env.DB.prepare(
    `INSERT INTO order_events(order_id,event_type,status,note,created_at) VALUES(?,?,?,?,?)`
  ).bind(orderId,eventType,status,note,now()).run();
}

async function insertOrder(env,id,method,status,customer,items,p,coupon){
  assertStatusAllowed(method,status);
  const t=now(),environment=orderEnvironment(env);
  await env.DB.prepare(
    `INSERT INTO orders(
      id,payment_method,status,customer_json,items_json,customer_email,
      subtotal,discount,shipping,shipping_discount,total,currency,coupon,
      environment,created_at,updated_at
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    id,method,status,JSON.stringify(customer),JSON.stringify(items),normalEmail(customer.email),
    p.subtotal,p.discount,p.shipping,p.shippingIncludedDiscount,p.total,'INR',coupon||null,
    environment,t,t
  ).run();
  await event(env,id,'ORDER_CREATED',status,environment);
}

async function updateStatus(env,id,status,paymentId=null,note=null){
  const current=await env.DB.prepare(
    `SELECT payment_method FROM orders WHERE id=?`
  ).bind(id).first();
  if(!current) throw Error('Order not found');
  assertStatusAllowed(current.payment_method,status);

  await env.DB.prepare(
    `UPDATE orders
     SET status=?,razorpay_payment_id=COALESCE(?,razorpay_payment_id),
         admin_note=COALESCE(?,admin_note),updated_at=?
     WHERE id=?`
  ).bind(status,paymentId,note,now(),id).run();
  await event(env,id,'STATUS_CHANGED',status,note);
}

function money(n){ return `₹${Number(n||0).toLocaleString('en-IN')}`; }

function esc(v){
  return String(v??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[c]));
}

function orderEmailHtml(order){
  const customer=JSON.parse(order.customer_json||'{}');
  const items=JSON.parse(order.items_json||'[]');

  const itemsHtml=items.map(i=>{
    const name=PRODUCTS[i.product_id] ? i.product_id.replace(/[-_]/g,' ') : i.product_id;
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${esc(name)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${esc(i.color)} / ${esc(i.size)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${esc(i.qty)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${money(i.unit_price*i.qty)}</td>
    </tr>`;
  }).join('');

  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111">
    <div style="max-width:680px;margin:auto">
      <h2>New WEAR TANVRA Order</h2>
      <p><b>Order:</b> ${esc(order.id)}</p>
      <p><b>Status:</b> ${esc(order.status)}<br>
      <b>Payment:</b> ${esc(order.payment_method)}<br>
      <b>Final amount:</b> ${money(order.total)}</p>

      <h3>Customer</h3>
      <p>
        ${esc(customer.name)}<br>
        ${esc(customer.phone)}<br>
        ${esc(customer.email||'')}<br>
        ${esc(customer.address)}<br>
        ${esc(customer.city)}, ${esc(customer.state)} - ${esc(customer.pincode)}
      </p>

      <h3>Items</h3>
      <table style="border-collapse:collapse;width:100%">
        <thead><tr>
          <th align="left" style="padding:8px;border-bottom:2px solid #111">Product</th>
          <th align="left" style="padding:8px;border-bottom:2px solid #111">Variant</th>
          <th align="left" style="padding:8px;border-bottom:2px solid #111">Qty</th>
          <th align="left" style="padding:8px;border-bottom:2px solid #111">Amount</th>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <h3>Pricing</h3>
      <p>
        Product total: ${money(order.subtotal)}<br>
        Prepaid discount: -${money(order.discount)}<br>
        Shipping shown: ${money(order.shipping)}<br>
        Shipping included: -${money(order.shipping_discount)}<br>
        <b>Final payable: ${money(order.total)}</b>
      </p>

      <p style="margin-top:28px;color:#666">
        Review this order in your WEAR TANVRA admin dashboard before submitting it to T-Adda.
      </p>
    </div>
  </body></html>`;
}

async function notifyOwner(env,orderId,force=false){
  if(!env.RESEND_API_KEY || !env.OWNER_EMAIL || !env.FROM_EMAIL){
    return {sent:false,reason:'Email notification environment variables are not configured'};
  }

  const order=await env.DB.prepare(`SELECT * FROM orders WHERE id=?`).bind(orderId).first();
  if(!order) return {sent:false,reason:'Order not found'};

  if(!force && order.owner_notified_status===order.status){
    return {sent:false,duplicate:true};
  }

  const customer=JSON.parse(order.customer_json||'{}');
  const subject=`${order.payment_method==='Cash on Delivery'?'New COD Order':'New Paid Order'} • ${order.id} • ${money(order.total)}`;

  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{
      'Authorization':`Bearer ${env.RESEND_API_KEY}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      from:env.FROM_EMAIL,
      to:[env.OWNER_EMAIL],
      reply_to:customer.email || undefined,
      subject,
      html:orderEmailHtml(order)
    })
  });

  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    await event(env,orderId,'OWNER_EMAIL_FAILED',order.status,clean(data?.message||'Email failed',300));
    return {sent:false,reason:data?.message||'Email failed'};
  }

  await env.DB.prepare(
    `UPDATE orders SET owner_notified_at=?,owner_notified_status=?,updated_at=? WHERE id=?`
  ).bind(now(),order.status,now(),orderId).run();

  await event(env,orderId,'OWNER_EMAIL_SENT',order.status,clean(data.id||'',100));
  return {sent:true,id:data.id};
}


async function sendResend(env,{to,subject,html,replyTo}){
  if(!env.RESEND_API_KEY || !env.FROM_EMAIL) return {sent:false,reason:'Email service is not configured'};
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{'Authorization':`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({from:env.FROM_EMAIL,to:[to],reply_to:replyTo||undefined,subject,html})
  });
  const data=await response.json().catch(()=>({}));
  return response.ok?{sent:true,id:data.id}:{sent:false,reason:data?.message||'Email failed'};
}

function customerOrderEmailHtml(order){
  const customer=JSON.parse(order.customer_json||'{}');
  const items=JSON.parse(order.items_json||'[]');
  const store=String(order.store_url||'https://weartanvra.com').replace(/\/$/,'');
  const friendly={
    COD_CONFIRMATION_REQUIRED:'Order received — COD confirmation may be required',
    COD_CONFIRMED:'COD order confirmed',
    PENDING_PAYMENT:'Payment pending',
    AUTHORIZED:'Payment authorised',
    PAID:'Payment confirmed',
    SENT_TO_TADDA:'Order is being prepared',
    PRINTING:'Printing / preparing',
    DISPATCHED:'Order dispatched',
    DELIVERED:'Order delivered',
    CANCELLED:'Order cancelled',
    PAYMENT_FAILED:'Payment failed'
  }[order.status]||order.status;
  const rows=items.map(i=>`<tr>
    <td style="padding:10px 0;border-bottom:1px solid #eee"><b>${esc(i.product_id.replace(/[-_]/g,' '))}</b><br><span style="color:#666">${esc(i.color)} / ${esc(i.size)} • Qty ${esc(i.qty)}</span></td>
    <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right">${money(i.unit_price*i.qty)}</td>
  </tr>`).join('');
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111;background:#f5f5f5;padding:24px">
  <div style="max-width:640px;margin:auto;background:#fff;padding:28px">
    <div style="font-size:12px;letter-spacing:.18em;font-weight:700">WEAR TANVRA</div>
    <h1>Thanks, ${esc(customer.name)}.</h1>
    <p style="color:#555">${esc(friendly)}</p>
    <div style="background:#111;color:#fff;padding:14px 16px;margin:22px 0">Order <b>${esc(order.id)}</b></div>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <p style="line-height:1.8">Product total: ${money(order.subtotal)}<br>
    ${Number(order.discount)>0?`Prepaid discount: -${money(order.discount)}<br>`:''}
    ${Number(order.shipping)>0?`Shipping shown: ${money(order.shipping)}<br>Shipping included: -${money(order.shipping_discount)}<br>`:'Shipping: FREE<br>'}
    <b>Final amount: ${money(order.total)}</b></p>
    <p><b>Payment:</b> ${esc(order.payment_method)}<br><b>Status:</b> ${esc(friendly)}</p>
    <p><a href="${store}/account.html" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:13px 18px;font-weight:700">VIEW MY ORDERS</a></p>
    <p style="color:#777;font-size:12px;line-height:1.6;margin-top:26px">Keep this order reference for support. For damaged/torn/dirty-item claims, keep an unboxing video of the sealed parcel.</p>
  </div></body></html>`;
}

async function notifyCustomer(env,orderId,force=false){
  const order=await env.DB.prepare(`SELECT * FROM orders WHERE id=?`).bind(orderId).first();
  if(!order) return {sent:false,reason:'Order not found'};
  const customer=JSON.parse(order.customer_json||'{}');
  const email=normalEmail(order.customer_email||customer.email);
  if(!validEmail(email)) return {sent:false,reason:'Customer email is missing'};
  if(!force && order.customer_notified_status===order.status) return {sent:false,duplicate:true};
  order.store_url=env.STORE_URL||'https://weartanvra.com';
  const subject=({
    COD_CONFIRMATION_REQUIRED:`Order received • ${order.id}`,
    COD_CONFIRMED:`COD order confirmed • ${order.id}`,
    PAID:`Payment confirmed • ${order.id}`,
    SENT_TO_TADDA:`Order is being prepared • ${order.id}`,
    DISPATCHED:`Order dispatched • ${order.id}`,
    DELIVERED:`Order delivered • ${order.id}`,
    CANCELLED:`Order cancelled • ${order.id}`
  })[order.status]||`Order update • ${order.id}`;
  const result=await sendResend(env,{to:email,subject,html:customerOrderEmailHtml(order),replyTo:env.OWNER_EMAIL||undefined});
  if(!result.sent){
    await event(env,orderId,'CUSTOMER_EMAIL_FAILED',order.status,clean(result.reason,300));
    return result;
  }
  await env.DB.prepare(`UPDATE orders SET customer_notified_at=?,customer_notified_status=?,updated_at=? WHERE id=?`)
    .bind(now(),order.status,now(),orderId).run();
  await event(env,orderId,'CUSTOMER_EMAIL_SENT',order.status,clean(result.id||'',100));
  return result;
}

async function requireCustomer(req,env){
  const auth=req.headers.get('Authorization')||'';
  const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  if(!token) throw Error('UNAUTHORIZED');
  const tokenHash=await sha256(token);
  const row=await env.DB.prepare(`SELECT email,expires_at FROM customer_sessions WHERE token_hash=?`).bind(tokenHash).first();
  if(!row || new Date(row.expires_at).getTime()<=Date.now()) throw Error('UNAUTHORIZED');
  await env.DB.prepare(`UPDATE customer_sessions SET last_seen_at=? WHERE token_hash=?`).bind(now(),tokenHash).run();
  return {email:row.email,tokenHash};
}

function requireAdmin(req,env){
  const auth=req.headers.get('Authorization')||'';
  const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  if(!env.ADMIN_TOKEN || !safeEqual(token,env.ADMIN_TOKEN)) throw Error('UNAUTHORIZED');
}

async function adminOrder(env,id){
  const row=await env.DB.prepare(`SELECT * FROM orders WHERE id=?`).bind(id).first();
  if(!row) return null;
  row.customer=JSON.parse(row.customer_json||'{}');
  row.items=JSON.parse(row.items_json||'[]');
  delete row.customer_json;
  delete row.items_json;
  row.events=(await env.DB.prepare(
    `SELECT event_type,status,note,created_at FROM order_events WHERE order_id=? ORDER BY id DESC LIMIT 100`
  ).bind(id).all()).results||[];
  return row;
}

export default {
  async fetch(req,env){
    const origin=originFor(req,env),url=new URL(req.url);
    if(req.method==='OPTIONS') return new Response(null,{status:204,headers:headers(origin)});

    try{
      // Public health/status endpoints expose no customer details.
      if(req.method==='GET' && url.pathname==='/api/health'){
        return json({ok:true,service:'WEAR TANVRA Orders',order_environment:orderEnvironment(env),razorpay_mode:razorpayMode(env)},200,origin);
      }

      if(req.method==='GET' && url.pathname==='/api/order-status'){
        const id=clean(url.searchParams.get('id'),100);
        const row=await env.DB.prepare(
          `SELECT id,status,payment_method,total,currency,environment,updated_at FROM orders WHERE id=?`
        ).bind(id).first();
        return row ? json(row,200,origin) : json({error:'Order not found'},404,origin);
      }


      // ---------- Customer passwordless account ----------
      if(req.method==='POST' && url.pathname==='/api/auth/request-code'){
        if(!env.AUTH_SECRET) return json({error:'Customer login is not configured'},503,origin);
        const body=await req.json(),email=normalEmail(body.email);
        if(!validEmail(email)) throw Error('Enter a valid email address');
        const existing=await env.DB.prepare(`SELECT created_at FROM login_codes WHERE email=?`).bind(email).first();
        if(existing && (Date.now()-new Date(existing.created_at).getTime())<60000)
          return json({error:'Please wait a minute before requesting another code.'},429,origin);
        const code=randomCode(),codeHash=await hmac(env.AUTH_SECRET,`${email}|${code}`),expiresAt=isoPlusMinutes(10);
        await env.DB.prepare(`INSERT INTO login_codes(email,code_hash,expires_at,attempts,created_at) VALUES(?,?,?,?,?)
          ON CONFLICT(email) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0,created_at=excluded.created_at`)
          .bind(email,codeHash,expiresAt,0,now()).run();
        const result=await sendResend(env,{
          to:email,subject:'Your WEAR TANVRA login code',
          html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px"><div style="font-size:12px;letter-spacing:.18em;font-weight:700">WEAR TANVRA</div><h1>Sign in to your account</h1><p>Your one-time login code is:</p><div style="font-size:34px;letter-spacing:.18em;font-weight:800;padding:18px 0">${esc(code)}</div><p>This code expires in 10 minutes.</p></div>`,
          replyTo:env.OWNER_EMAIL||undefined
        });
        if(!result.sent) return json({error:result.reason||'Could not send login code'},502,origin);
        return json({ok:true,message:'Login code sent'},200,origin);
      }

      if(req.method==='POST' && url.pathname==='/api/auth/verify-code'){
        if(!env.AUTH_SECRET) return json({error:'Customer login is not configured'},503,origin);
        const body=await req.json(),email=normalEmail(body.email),code=clean(body.code,6);
        if(!validEmail(email)||!/^\d{6}$/.test(code)) throw Error('Invalid email or code');
        const row=await env.DB.prepare(`SELECT code_hash,expires_at,attempts FROM login_codes WHERE email=?`).bind(email).first();
        if(!row || new Date(row.expires_at).getTime()<=Date.now()) return json({error:'Code expired. Request a new code.'},400,origin);
        if(Number(row.attempts||0)>=5) return json({error:'Too many attempts. Request a new code.'},429,origin);
        const expected=await hmac(env.AUTH_SECRET,`${email}|${code}`);
        if(!safeEqual(expected,row.code_hash)){
          await env.DB.prepare(`UPDATE login_codes SET attempts=attempts+1 WHERE email=?`).bind(email).run();
          return json({error:'Incorrect code'},400,origin);
        }
        await env.DB.prepare(`DELETE FROM login_codes WHERE email=?`).bind(email).run();
        const token=randomToken(),tokenHash=await sha256(token),expiresAt=isoPlusDays(30);
        await env.DB.prepare(`INSERT INTO customer_sessions(token_hash,email,expires_at,created_at,last_seen_at) VALUES(?,?,?,?,?)`)
          .bind(tokenHash,email,expiresAt,now(),now()).run();
        return json({ok:true,token,email,expires_at:expiresAt},200,origin);
      }

      if(req.method==='POST' && url.pathname==='/api/auth/logout'){
        try{ const s=await requireCustomer(req,env); await env.DB.prepare(`DELETE FROM customer_sessions WHERE token_hash=?`).bind(s.tokenHash).run(); }catch{}
        return json({ok:true},200,origin);
      }

      if(req.method==='GET' && url.pathname==='/api/account/me'){
        try{ const s=await requireCustomer(req,env); return json({ok:true,email:s.email},200,origin); }
        catch{ return json({error:'Unauthorized'},401,origin); }
      }

      if(req.method==='GET' && url.pathname==='/api/account/orders'){
        let s; try{s=await requireCustomer(req,env)}catch{return json({error:'Unauthorized'},401,origin)}
        const result=await env.DB.prepare(`SELECT id,payment_method,status,environment,subtotal,discount,shipping,shipping_discount,total,currency,coupon,created_at,updated_at,items_json FROM orders WHERE customer_email=? ORDER BY created_at DESC LIMIT 100`).bind(s.email).all();
        const orders=(result.results||[]).map(r=>{const items=JSON.parse(r.items_json||'[]'); delete r.items_json; return {...r,items}});
        return json({orders,email:s.email},200,origin);
      }

      // ---------- Admin API ----------
      if(url.pathname.startsWith('/api/admin/')){
        try{ requireAdmin(req,env); }
        catch{ return json({error:'Unauthorized'},401,origin); }

        if(req.method==='GET' && url.pathname==='/api/admin/orders'){
          const status=clean(url.searchParams.get('status'),60);
          const search=clean(url.searchParams.get('q'),100);
          const limit=Math.min(200,Math.max(1,Number(url.searchParams.get('limit'))||100));

          let sql=`SELECT id,payment_method,status,environment,subtotal,discount,shipping,shipping_discount,total,currency,coupon,owner_notified_at,customer_notified_at,customer_notified_status,created_at,updated_at,customer_json,items_json FROM orders`;
          const clauses=[],binds=[];
          if(status && status!=='ALL'){ clauses.push('status=?'); binds.push(status); }
          if(search){
            clauses.push('(id LIKE ? OR customer_json LIKE ? OR items_json LIKE ?)');
            const q=`%${search}%`; binds.push(q,q,q);
          }
          if(clauses.length) sql+=' WHERE '+clauses.join(' AND ');
          sql+=' ORDER BY created_at DESC LIMIT ?';
          binds.push(limit);

          const result=await env.DB.prepare(sql).bind(...binds).all();
          const orders=(result.results||[]).map(r=>{
            const customer=JSON.parse(r.customer_json||'{}');
            const items=JSON.parse(r.items_json||'[]');
            delete r.customer_json; delete r.items_json;
            return {...r,customer,items};
          });
          return json({orders},200,origin);
        }

        if(req.method==='GET' && url.pathname==='/api/admin/order'){
          const id=clean(url.searchParams.get('id'),100);
          const order=await adminOrder(env,id);
          return order ? json(order,200,origin) : json({error:'Order not found'},404,origin);
        }

        if(req.method==='POST' && url.pathname==='/api/admin/order-status'){
          const body=await req.json();
          const id=clean(body.id,100);
          const status=clean(body.status,60);
          const note=clean(body.note,500);
          if(!ADMIN_STATUSES.has(status)) throw Error('Invalid status');
          const exists=await env.DB.prepare(`SELECT id,payment_method FROM orders WHERE id=?`).bind(id).first();
          if(!exists) return json({error:'Order not found'},404,origin);
          assertStatusAllowed(exists.payment_method,status);
          await updateStatus(env,id,status,null,note||null);
          if(['COD_CONFIRMED','SENT_TO_TADDA','DISPATCHED','DELIVERED','CANCELLED'].includes(status)){
            try{ await notifyCustomer(env,id); }catch{}
          }
          return json({ok:true,order:await adminOrder(env,id)},200,origin);
        }

        if(req.method==='POST' && url.pathname==='/api/admin/resend-notification'){
          const body=await req.json();
          const id=clean(body.id,100);
          const result=await notifyOwner(env,id,true);
          return json({ok:true,result},200,origin);
        }

        if(req.method==='POST' && url.pathname==='/api/admin/resend-customer-notification'){
          const body=await req.json();
          const id=clean(body.id,100);
          const result=await notifyCustomer(env,id,true);
          return json({ok:true,result},200,origin);
        }

        return json({error:'Admin endpoint not found'},404,origin);
      }

      // ---------- Checkout ----------
      if(req.method==='POST' && url.pathname==='/api/create-order'){
        if(!env.RAZORPAY_KEY_ID||!env.RAZORPAY_KEY_SECRET)
          return json({error:'Gateway is not configured'},503,origin);
        assertGatewayEnvironment(env);

        const order=await req.json();
        validateCustomer(order.customer);
        if(order.payment_method!=='Prepaid') throw Error('Prepaid endpoint only');

        const p=price(order,env),id=ref('WTP');
        await insertOrder(env,id,'Prepaid','PENDING_PAYMENT',order.customer,p.items,p,'PREPAID50');

        const rp=await fetch('https://api.razorpay.com/v1/orders',{
          method:'POST',
          headers:{
            Authorization:basic(env.RAZORPAY_KEY_ID,env.RAZORPAY_KEY_SECRET),
            'content-type':'application/json'
          },
          body:JSON.stringify({
            amount:p.total*100,
            currency:'INR',
            receipt:id.slice(0,40),
            notes:{local_order_id:id,coupon:'PREPAID50',source:'weartanvra.com'}
          })
        });

        const d=await rp.json();
        if(!rp.ok){
          await updateStatus(env,id,'PAYMENT_FAILED',null,'Gateway order creation failed');
          return json({error:d?.error?.description||'Could not create payment order'},502,origin);
        }

        await env.DB.prepare(
          'UPDATE orders SET razorpay_order_id=?,updated_at=? WHERE id=?'
        ).bind(d.id,now(),id).run();

        return json({
          local_order_id:id,
          razorpay_order_id:d.id,
          key_id:env.RAZORPAY_KEY_ID,
          amount:d.amount,
          currency:d.currency,
          receipt:id,
          pricing:p
        },200,origin);
      }

      if(req.method==='POST' && url.pathname==='/api/verify-payment'){
        assertGatewayEnvironment(env);
        const b=await req.json();
        const id=clean(b.local_order_id,100);
        const payment=clean(b.razorpay_payment_id,100);
        const signature=clean(b.razorpay_signature,200);

        const row=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(id).first();
        if(!row||!row.razorpay_order_id)
          return json({verified:false,error:'Order not found'},404,origin);

        const expected=await hmac(env.RAZORPAY_KEY_SECRET,`${row.razorpay_order_id}|${payment}`);
        if(!safeEqual(expected,signature))
          return json({verified:false,error:'Invalid payment signature'},400,origin);

        const pr=await fetch(
          `https://api.razorpay.com/v1/payments/${encodeURIComponent(payment)}`,
          {headers:{Authorization:basic(env.RAZORPAY_KEY_ID,env.RAZORPAY_KEY_SECRET)}}
        );
        const pd=await pr.json();

        if(!pr.ok||pd.order_id!==row.razorpay_order_id)
          return json({verified:false,error:'Payment status verification failed'},400,origin);

        const status=pd.status==='captured'
          ? 'PAID'
          : pd.status==='authorized'
            ? 'AUTHORIZED'
            : 'PAYMENT_FAILED';

        await updateStatus(env,id,status,payment);

        if(status==='PAID'){
          try{ await notifyOwner(env,id); }catch{}
          try{ await notifyCustomer(env,id); }catch{}
        }

        return json({verified:true,status,order_id:id},200,origin);
      }

      if(req.method==='POST' && url.pathname==='/api/cod-order'){
        const order=await req.json();
        validateCustomer(order.customer);
        if(order.payment_method!=='Cash on Delivery') throw Error('COD endpoint only');

        const p=price(order,env),id=ref('WTC');
        await insertOrder(
          env,id,'Cash on Delivery','COD_CONFIRMATION_REQUIRED',
          order.customer,p.items,p,null
        );

        try{ await notifyOwner(env,id); }catch{}
        try{ await notifyCustomer(env,id); }catch{}

        return json({
          accepted:true,
          order_id:id,
          status:'COD_CONFIRMATION_REQUIRED',
          pricing:p
        },200,origin);
      }

      // ---------- Razorpay webhook ----------
      if(req.method==='POST' && url.pathname==='/api/webhooks/razorpay'){
        if(!env.RAZORPAY_WEBHOOK_SECRET)
          return json({error:'Webhook secret not configured'},503,origin);

        const raw=await req.text();
        const sig=clean(req.headers.get('X-Razorpay-Signature'),200);
        const eventId=clean(req.headers.get('X-Razorpay-Event-Id'),200);
        const expected=await hmac(env.RAZORPAY_WEBHOOK_SECRET,raw);

        if(!safeEqual(expected,sig))
          return json({error:'Invalid webhook signature'},400,origin);

        if(eventId){
          const seen=await env.DB.prepare(
            'SELECT event_id FROM webhook_events WHERE event_id=?'
          ).bind(eventId).first();
          if(seen) return json({ok:true,duplicate:true},200,origin);
        }

        const evt=JSON.parse(raw);
        const type=clean(evt.event,100);
        const razorpayOrderId=
          evt?.payload?.payment?.entity?.order_id ||
          evt?.payload?.order?.entity?.id ||
          null;
        const paymentId=evt?.payload?.payment?.entity?.id||null;

        if(eventId){
          await env.DB.prepare(
            'INSERT INTO webhook_events(event_id,event_type,received_at) VALUES(?,?,?)'
          ).bind(eventId,type,now()).run();
        }

        if(razorpayOrderId){
          const row=await env.DB.prepare(
            'SELECT id,status FROM orders WHERE razorpay_order_id=?'
          ).bind(razorpayOrderId).first();

          if(row){
            if(type==='payment.captured'||type==='order.paid'){
              await updateStatus(env,row.id,'PAID',paymentId);
              try{ await notifyOwner(env,row.id); }catch{}
              try{ await notifyCustomer(env,row.id); }catch{}
            }else if(type==='payment.failed'){
              await updateStatus(env,row.id,'PAYMENT_FAILED',paymentId);
            }
          }
        }

        return json({ok:true},200,origin);
      }

      return json({error:'Not found'},404,origin);

    }catch(e){
      return json({error:e?.message||'Bad request'},400,origin);
    }
  }
};
