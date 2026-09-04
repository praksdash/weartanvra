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

const RETURN_REASONS = new Set(['DAMAGED','TORN','DIRTY']);
const RETURN_STATUSES = new Set([
  'RETURN_REQUESTED','UNDER_REVIEW','APPROVED','REJECTED',
  'REFUND_PENDING','PARTIALLY_REFUNDED','REFUNDED','REPLACEMENT_PROCESSING',
  'REPLACEMENT_DISPATCHED','COMPLETED'
]);
const RETURN_ADMIN_STATUSES = RETURN_STATUSES;
const RETURN_EVIDENCE_MIME = new Set([
  'image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'
]);

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


const SECURITY_JSON_LIMIT = 32 * 1024;
const PUBLIC_POST_PATHS = new Set([
  '/api/auth/request-code','/api/auth/verify-code','/api/auth/logout',
  '/api/create-order','/api/verify-payment','/api/cod-order'
]);

function clientIp(req){
  return clean(req.headers.get('CF-Connecting-IP') || req.headers.get('x-forwarded-for') || 'unknown',80);
}
function isAllowedOrigin(req,env){
  const origin=req.headers.get('Origin');
  if(!origin) return true; // server-to-server / same-origin navigations may omit Origin
  const allowed=String(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
  return allowed.includes(origin);
}
function securityHeaders(){
  return {
    'x-content-type-options':'nosniff',
    'x-frame-options':'DENY',
    'referrer-policy':'strict-origin-when-cross-origin',
    'permissions-policy':'camera=(), microphone=(), geolocation=(), payment=()',
    'cross-origin-resource-policy':'same-site'
  };
}
function jsonLengthOk(req){
  const len=Number(req.headers.get('content-length')||0);
  return !len || len <= SECURITY_JSON_LIMIT;
}
async function readJson(req){
  if(!jsonLengthOk(req)) throw Object.assign(new Error('Request too large'),{status:413});
  const text=await req.text();
  if(text.length>SECURITY_JSON_LIMIT) throw Object.assign(new Error('Request too large'),{status:413});
  try{return text?JSON.parse(text):{};}catch{throw Object.assign(new Error('Invalid JSON'),{status:400});}
}
function bucketStart(seconds){
  const n=Math.floor(Date.now()/1000);
  return new Date((n-(n%seconds))*1000).toISOString();
}
async function enforceRateLimit(env,key,limit,windowSeconds){
  if(!env.DB) return;
  const bucket=bucketStart(windowSeconds);
  await env.DB.prepare(`INSERT INTO security_rate_limits(rate_key,bucket_start,hits,updated_at)
    VALUES(?,?,1,?)
    ON CONFLICT(rate_key,bucket_start) DO UPDATE SET hits=hits+1,updated_at=excluded.updated_at`)
    .bind(key,bucket,now()).run();
  const row=await env.DB.prepare(`SELECT hits FROM security_rate_limits WHERE rate_key=? AND bucket_start=?`)
    .bind(key,bucket).first();
  if(Number(row?.hits||0)>limit){
    throw Object.assign(new Error('Too many requests. Please try again later.'),{status:429});
  }
  // Cheap opportunistic cleanup, about 1 in 64 requests.
  if((crypto.getRandomValues(new Uint8Array(1))[0]&63)===0){
    const cutoff=new Date(Date.now()-2*86400000).toISOString();
    await env.DB.prepare(`DELETE FROM security_rate_limits WHERE updated_at<?`).bind(cutoff).run();
  }
}
function requireAllowedOrigin(req,env){
  if(!isAllowedOrigin(req,env)) throw Object.assign(new Error('Origin not allowed'),{status:403});
}

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
    'cache-control':'no-store',
    ...securityHeaders()
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

function invoiceEligible(order){
  if(!order) return false;
  if(order.invoice_number) return true;
  const later=new Set(['SENT_TO_TADDA','PRINTING','DISPATCHED','DELIVERED']);
  if(order.payment_method==='Prepaid') return order.status==='PAID' || later.has(order.status);
  if(order.payment_method==='Cash on Delivery') return order.status==='COD_CONFIRMED' || later.has(order.status);
  return false;
}

function fiscalYearLabel(dateLike){
  const d=new Date(dateLike||Date.now());
  // Invoice accounting follows India time for fiscal-year rollover.
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',year:'numeric',month:'numeric'}).formatToParts(d);
  const y=Number(parts.find(x=>x.type==='year')?.value||d.getUTCFullYear());
  const m=Number(parts.find(x=>x.type==='month')?.value||(d.getUTCMonth()+1));
  const start=m>=4?y:y-1;
  return `${start}-${String((start+1)%100).padStart(2,'0')}`;
}

async function ensureInvoice(env,orderId){
  let row=await env.DB.prepare(`SELECT * FROM orders WHERE id=?`).bind(orderId).first();
  if(!row) throw Error('Order not found');
  if(row.invoice_number) return row;
  if(!invoiceEligible(row)) return row;
  if(!invoiceConfigured(env)) throw Error('Invoice seller address/email is not configured');

  const fy=fiscalYearLabel(row.created_at||now());
  const seq=await env.DB.prepare(`INSERT INTO invoice_sequences(fiscal_year,last_number,updated_at)
    VALUES(?,1,?)
    ON CONFLICT(fiscal_year) DO UPDATE SET last_number=last_number+1,updated_at=excluded.updated_at
    RETURNING last_number`).bind(fy,now()).first();
  const n=Number(seq?.last_number||1);
  const invoiceNumber=`WT/${fy}/${String(n).padStart(6,'0')}`;
  const issuedAt=now();

  // Another concurrent request may already have issued it; preserve the first number.
  const sellerSnapshot=JSON.stringify(invoiceSeller(env));
  await env.DB.prepare(`UPDATE orders SET invoice_number=?,invoice_issued_at=?,invoice_seller_json=?,updated_at=?
    WHERE id=? AND invoice_number IS NULL`).bind(invoiceNumber,issuedAt,sellerSnapshot,issuedAt,orderId).run();
  row=await env.DB.prepare(`SELECT * FROM orders WHERE id=?`).bind(orderId).first();
  if(row?.invoice_number===invoiceNumber){
    try{await event(env,orderId,'INVOICE_ISSUED',row.status,invoiceNumber);}catch{}
  }
  return row;
}

function invoiceSeller(env){
  return {
    name:clean(env.INVOICE_SELLER_NAME||'WEAR TANVRA',120),
    address:clean(env.INVOICE_SELLER_ADDRESS||'',500),
    email:clean(env.INVOICE_SELLER_EMAIL||env.OWNER_EMAIL||'',120),
    gstin:clean(env.INVOICE_GSTIN||'',30),
    hsn:clean(env.INVOICE_HSN||'',20)
  };
}

function invoiceConfigured(env){
  const s=invoiceSeller(env);
  return !!(s.name && s.address && s.email);
}

function productLabel(id){
  return String(id||'').replace(/^oversized-|^regular-/,'').split('-').filter(Boolean)
    .map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(' ');
}

function invoicePayload(order,env){
  const customer=JSON.parse(order.customer_json||'{}');
  const items=JSON.parse(order.items_json||'[]').map(i=>({
    ...i,name:productLabel(i.product_id),line_total:Number(i.unit_price||0)*Number(i.qty||0)
  }));
  return {
    invoice_number:order.invoice_number,
    invoice_issued_at:order.invoice_issued_at,
    order_id:order.id,
    order_date:order.created_at,
    payment_method:order.payment_method,
    payment_id:order.razorpay_payment_id||null,
    status:order.status,
    currency:order.currency||'INR',
    seller:order.invoice_seller_json ? JSON.parse(order.invoice_seller_json) : invoiceSeller(env),
    customer,
    items,
    subtotal:Number(order.subtotal||0),
    discount:Number(order.discount||0),
    shipping:Number(order.shipping||0),
    shipping_discount:Number(order.shipping_discount||0),
    total:Number(order.total||0),
    gst_tax_invoice:false
  };
}

function pdfAscii(v){
  return String(v??'').normalize('NFKD').replace(/[^\x20-\x7E]/g,'?');
}
function pdfEsc(v){return pdfAscii(v).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');}
function pdfDate(v){try{return new Date(v).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'})}catch{return String(v||'')}}

function invoicePdfBytes(inv){
  const lines=[];
  lines.push('WEAR TANVRA');
  lines.push('COMMERCIAL INVOICE');
  lines.push('');
  lines.push(`Invoice No: ${inv.invoice_number}`);
  lines.push(`Invoice Date: ${pdfDate(inv.invoice_issued_at)}`);
  lines.push(`Order ID: ${inv.order_id}`);
  lines.push(`Order Date: ${pdfDate(inv.order_date)}`);
  lines.push(`Payment: ${inv.payment_method}${inv.payment_id?' | '+inv.payment_id:''}`);
  lines.push('');
  lines.push(`Seller: ${inv.seller.name}`);
  if(inv.seller.address) lines.push(`Seller Address: ${inv.seller.address}`);
  if(inv.seller.email) lines.push(`Seller Email: ${inv.seller.email}`);
  if(inv.seller.gstin) lines.push(`GSTIN: ${inv.seller.gstin}`);
  lines.push('');
  lines.push(`Bill / Ship To: ${inv.customer.name||''}`);
  lines.push(`${inv.customer.address||''}`);
  lines.push(`${inv.customer.city||''}, ${inv.customer.state||''} - ${inv.customer.pincode||''}`);
  lines.push(`Phone: ${inv.customer.phone||''} | Email: ${inv.customer.email||''}`);
  lines.push('');
  lines.push('ITEMS');
  inv.items.forEach((i,idx)=>{
    lines.push(`${idx+1}. ${i.name} | ${i.color||''} / ${i.size||''} | Qty ${i.qty} | INR ${i.line_total}`);
    if(inv.seller.hsn) lines.push(`   HSN: ${inv.seller.hsn}`);
  });
  lines.push('');
  lines.push(`Product total: INR ${inv.subtotal}`);
  if(inv.discount) lines.push(`Discount: -INR ${inv.discount}`);
  if(inv.shipping) lines.push(`Shipping shown: INR ${inv.shipping}`);
  if(inv.shipping_discount) lines.push(`Shipping included discount: -INR ${inv.shipping_discount}`);
  lines.push(`TOTAL: INR ${inv.total}`);
  lines.push('');
  lines.push('This document is generated electronically by WEAR TANVRA.');
  lines.push('GST tax-invoice mode is not enabled in v16; no GST amount is represented here.');

  const perPage=44;
  const pages=[];
  for(let i=0;i<lines.length;i+=perPage) pages.push(lines.slice(i,i+perPage));

  // PDF objects: catalog(1), pages(2), font(3), then page/content pairs.
  const objs={};
  objs[1]='<< /Type /Catalog /Pages 2 0 R >>';
  const pageIds=[];
  let objId=4;
  for(const pg of pages){
    const pageId=objId++, contentId=objId++;
    pageIds.push(pageId);
    let y=800,content='';
    pg.forEach((line,idx)=>{
      const size=(idx===0?16:(idx===1?13:9));
      content+=`BT /F1 ${size} Tf 40 ${y} Td (${pdfEsc(line)}) Tj ET\n`;
      y-=idx<2?24:16;
    });
    objs[pageId]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objs[contentId]=`<< /Length ${content.length} >>\nstream\n${content}endstream`;
  }
  objs[2]=`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(x=>x+' 0 R').join(' ')}] >>`;
  objs[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  const maxId=Math.max(...Object.keys(objs).map(Number));
  let pdf='%PDF-1.4\n%WT16\n',offsets=[0];
  for(let i=1;i<=maxId;i++){
    offsets[i]=pdf.length;
    pdf+=`${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref=pdf.length;
  pdf+=`xref\n0 ${maxId+1}\n0000000000 65535 f \n`;
  for(let i=1;i<=maxId;i++) pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  pdf+=`trailer\n<< /Size ${maxId+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function binaryHeaders(origin,contentType,filename){
  return {
    'content-type':contentType,
    'content-disposition':`attachment; filename="${filename}"`,
    'access-control-allow-origin':origin,
    'vary':'Origin','access-control-expose-headers':'Content-Disposition','cache-control':'private, no-store',...securityHeaders()
  };
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
  try{ await ensureInvoice(env,id); }catch(e){
    // Invoice migration/configuration errors should surface during deployment testing,
    // but must not corrupt the already-valid order status transition.
  }
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
    <p><b>Payment:</b> ${esc(order.payment_method)}<br><b>Status:</b> ${esc(friendly)}${order.invoice_number?`<br><b>Invoice:</b> ${esc(order.invoice_number)}`:''}</p>
    ${order.invoice_number?'<p style="color:#555">Your invoice is available securely from My Orders.</p>':''}
    <p><a href="${store}/account.html" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:13px 18px;font-weight:700">${order.invoice_number?'VIEW ORDER / INVOICE':'VIEW MY ORDERS'}</a></p>
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
  const rr=await latestReturn(env,id);
  if(rr) row.return_request={...rr,evidence:await returnEvidenceList(env,rr.id)};
  return row;
}


function friendlyReturnStatus(status){
  return ({
    RETURN_REQUESTED:'Return requested',
    UNDER_REVIEW:'Under review',
    APPROVED:'Approved',
    REJECTED:'Not approved',
    REFUND_PENDING:'Refund processing',
    PARTIALLY_REFUNDED:'Partial Refund Processed',
    REFUNDED:'Refund Processed',
    REPLACEMENT_PROCESSING:'Replacement processing',
    REPLACEMENT_DISPATCHED:'Replacement dispatched',
    COMPLETED:'Completed'
  })[status]||status;
}
function returnWindowHours(env){
  const n=Number(env.RETURN_WINDOW_HOURS||48);
  return Math.max(1,Math.min(168,Number.isFinite(n)?n:48));
}
async function deliveredAt(env,orderId){
  const ev=await env.DB.prepare(`SELECT created_at FROM order_events WHERE order_id=? AND status='DELIVERED' ORDER BY id ASC LIMIT 1`).bind(orderId).first();
  return ev?.created_at||null;
}
async function returnEligibility(env,order){
  if(!order || order.status!=='DELIVERED') return {eligible:false,reason:'Returns can be requested only after delivery'};
  const at=await deliveredAt(env,order.id);
  if(!at) return {eligible:false,reason:'Delivery confirmation was not found'};
  const deadline=new Date(new Date(at).getTime()+returnWindowHours(env)*3600000);
  return {eligible:Date.now()<=deadline.getTime(),delivered_at:at,deadline:deadline.toISOString(),window_hours:returnWindowHours(env)};
}
async function latestReturn(env,orderId){
  return await env.DB.prepare(`SELECT * FROM return_requests WHERE order_id=? ORDER BY requested_at DESC LIMIT 1`).bind(orderId).first();
}
function publicReturn(r){
  if(!r) return null;
  return {
    id:r.id,order_id:r.order_id,reason:r.reason,description:r.description,
    preference:r.preference,status:r.status,status_label:friendlyReturnStatus(r.status),
    requested_at:r.requested_at,updated_at:r.updated_at,admin_message:r.customer_message||null,
    refund_amount:r.refund_amount||null,replacement_tracking:r.replacement_tracking||null
  };
}
async function returnEvidenceList(env,returnId){
  const x=await env.DB.prepare(`SELECT id,file_name,mime_type,size_bytes,uploaded_at FROM return_evidence WHERE return_id=? ORDER BY uploaded_at ASC`).bind(returnId).all();
  return x.results||[];
}
async function notifyReturnCustomer(env,returnId){
  const r=await env.DB.prepare(`SELECT r.*,o.customer_json FROM return_requests r JOIN orders o ON o.id=r.order_id WHERE r.id=?`).bind(returnId).first();
  if(!r) return {sent:false,reason:'Return request not found'};
  const customer=JSON.parse(r.customer_json||'{}');
  const email=normalEmail(r.customer_email||customer.email);
  if(!validEmail(email)) return {sent:false,reason:'Customer email missing'};
  const store=env.STORE_URL||'https://weartanvra.com';
  const refundProcessed=['PARTIALLY_REFUNDED','REFUNDED'].includes(r.status);
  const bankingNote=refundProcessed
    ? `<div style="margin:18px 0;padding:14px;background:#f5f5f5"><b>Refund processed by WEAR TANVRA.</b><br>Your bank/UPI provider may take up to 5–7 business days to reflect the credit. Razorpay/bank tracking should be used if the credit is delayed.</div>`
    : '';
  const html=`<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;color:#111"><div style="max-width:620px;margin:auto;background:white;padding:28px"><div style="font-size:12px;letter-spacing:.18em;font-weight:700">WEAR TANVRA</div><h1>${esc(friendlyReturnStatus(r.status))}</h1><p>Return request <b>${esc(r.id)}</b> for order <b>${esc(r.order_id)}</b>.</p><p><b>Reason:</b> ${esc(r.reason)}<br><b>Status:</b> ${esc(friendlyReturnStatus(r.status))}</p>${r.customer_message?`<p>${esc(r.customer_message)}</p>`:''}${r.refund_amount?`<p><b>Refund amount:</b> ${money(r.refund_amount)}</p>`:''}${bankingNote}${r.replacement_tracking?`<p><b>Replacement tracking:</b> ${esc(r.replacement_tracking)}</p>`:''}<p><a href="${store}/account.html" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:13px 18px;font-weight:700">VIEW MY ORDERS</a></p></div></body></html>`;
  return sendResend(env,{to:email,subject:`${friendlyReturnStatus(r.status)} • ${r.order_id}`,html,replyTo:env.OWNER_EMAIL||undefined});
}
async function razorpayRefund(env,order,amountRupees,returnId){
  if(!env.RAZORPAY_KEY_ID||!env.RAZORPAY_KEY_SECRET) throw Error('Razorpay is not configured');
  if(!order.razorpay_payment_id) throw Error('Razorpay payment ID is missing');
  assertGatewayEnvironment(env);
  const amount=Math.round(Number(amountRupees)*100);
  if(!Number.isInteger(amount)||amount<100||amount>Number(order.total)*100) throw Error('Invalid refund amount');
  const rp=await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(order.razorpay_payment_id)}/refund`,{
    method:'POST',headers:{Authorization:basic(env.RAZORPAY_KEY_ID,env.RAZORPAY_KEY_SECRET),'Content-Type':'application/json'},
    body:JSON.stringify({amount,notes:{order_id:order.id,return_id:returnId,source:'WEAR TANVRA admin'}})
  });
  const data=await rp.json().catch(()=>({}));
  if(!rp.ok) throw Error(data?.error?.description||'Razorpay refund failed');
  return data;
}

export default {
  async fetch(req,env){
    const origin=originFor(req,env),url=new URL(req.url);
    if(req.method==='OPTIONS'){
      if(!isAllowedOrigin(req,env)) return json({error:'Origin not allowed'},403,origin);
      return new Response(null,{status:204,headers:headers(origin)});
    }

    try{
      // Public health/status endpoints expose no customer details.
      if(req.method==='GET' && url.pathname==='/api/health'){
        return json({ok:true,service:'WEAR TANVRA Orders',order_environment:orderEnvironment(env),razorpay_mode:razorpayMode(env)},200,origin);
      }

      if(req.method==='GET' && url.pathname==='/api/order-status'){
        await enforceRateLimit(env,`order-status:${clientIp(req)}`,60,300);
        const id=clean(url.searchParams.get('id'),100);
        const row=await env.DB.prepare(
          `SELECT id,status,payment_method,total,currency,updated_at FROM orders WHERE id=?`
        ).bind(id).first();
        return row ? json(row,200,origin) : json({error:'Order not found'},404,origin);
      }


      // ---------- Customer passwordless account ----------
      if(req.method==='POST' && url.pathname==='/api/auth/request-code'){
        requireAllowedOrigin(req,env);
        await enforceRateLimit(env,`auth-code-ip:${clientIp(req)}`,8,600);
        if(!env.AUTH_SECRET) return json({error:'Customer login is not configured'},503,origin);
        const body=await readJson(req),email=normalEmail(body.email);
        await enforceRateLimit(env,`auth-code-email:${email}`,5,600);
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
        requireAllowedOrigin(req,env);
        await enforceRateLimit(env,`auth-verify-ip:${clientIp(req)}`,15,600);
        if(!env.AUTH_SECRET) return json({error:'Customer login is not configured'},503,origin);
        const body=await readJson(req),email=normalEmail(body.email),code=clean(body.code,6);
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
        requireAllowedOrigin(req,env);
        try{ const s=await requireCustomer(req,env); await env.DB.prepare(`DELETE FROM customer_sessions WHERE token_hash=?`).bind(s.tokenHash).run(); }catch{}
        return json({ok:true},200,origin);
      }

      if(req.method==='GET' && url.pathname==='/api/account/me'){
        try{ const s=await requireCustomer(req,env); return json({ok:true,email:s.email},200,origin); }
        catch{ return json({error:'Unauthorized'},401,origin); }
      }

      if(req.method==='GET' && url.pathname==='/api/account/orders'){
        let s; try{s=await requireCustomer(req,env)}catch{return json({error:'Unauthorized'},401,origin)}
        const result=await env.DB.prepare(`SELECT id,payment_method,status,environment,subtotal,discount,shipping,shipping_discount,total,currency,coupon,created_at,updated_at,items_json,invoice_number,invoice_issued_at FROM orders WHERE customer_email=? ORDER BY created_at DESC LIMIT 100`).bind(s.email).all();
        const orders=[];
        for(const raw of (result.results||[])){
          let r=raw;
          if(!r.invoice_number && invoiceEligible(r) && invoiceConfigured(env)){
            const issued=await ensureInvoice(env,r.id);
            r={...r,invoice_number:issued.invoice_number,invoice_issued_at:issued.invoice_issued_at};
          }
          const items=JSON.parse(r.items_json||'[]'); delete r.items_json;
          const rr=await latestReturn(env,r.id);
          const eligibility=rr ? {eligible:false,reason:'Return request already submitted'} : await returnEligibility(env,r);
          orders.push({...r,items,invoice_available:!!r.invoice_number,return_request:publicReturn(rr),return_eligibility:eligibility});
        }
        return json({orders,email:s.email},200,origin);
      }


      if(req.method==='POST' && url.pathname==='/api/account/returns'){
        requireAllowedOrigin(req,env);
        const sess=await requireCustomer(req,env);
        await enforceRateLimit(env,`return-create:${sess.email}`,5,86400);
        const body=await readJson(req);
        const orderId=clean(body.order_id,100),reason=clean(body.reason,30).toUpperCase();
        const description=clean(body.description,1200),preference=clean(body.preference,30).toUpperCase();
        if(!RETURN_REASONS.has(reason)) throw Error('Choose damaged, torn, or dirty item');
        if(!['REFUND','REPLACEMENT'].includes(preference)) throw Error('Choose refund or replacement');
        if(description.length<10) throw Error('Please describe the issue');
        const order=await env.DB.prepare(`SELECT * FROM orders WHERE id=? AND customer_email=?`).bind(orderId,sess.email).first();
        if(!order) return json({error:'Order not found'},404,origin);
        const eligibility=await returnEligibility(env,order);
        if(!eligibility.eligible) return json({error:eligibility.reason,eligibility},409,origin);
        const active=await env.DB.prepare(`SELECT id,status FROM return_requests WHERE order_id=? AND status NOT IN ('REJECTED','COMPLETED') ORDER BY requested_at DESC LIMIT 1`).bind(orderId).first();
        if(active) return json({error:'A return request already exists for this order',return_id:active.id,status:active.status},409,origin);
        const id=ref('WTR'); const ts=now();
        await env.DB.prepare(`INSERT INTO return_requests(id,order_id,customer_email,reason,description,preference,status,requested_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(id,orderId,sess.email,reason,description,preference,'RETURN_REQUESTED',ts,ts).run();
        await event(env,orderId,'RETURN_REQUESTED',order.status,`${id} • ${reason} • ${preference}`);
        try{await notifyReturnCustomer(env,id)}catch{}
        return json({ok:true,return_request:publicReturn(await latestReturn(env,orderId)),evidence_required:true},201,origin);
      }

      if(req.method==='GET' && url.pathname==='/api/account/returns'){
        const sess=await requireCustomer(req,env);
        const orderId=clean(url.searchParams.get('order_id'),100);
        let sql=`SELECT * FROM return_requests WHERE customer_email=?`,binds=[sess.email];
        if(orderId){sql+=' AND order_id=?';binds.push(orderId)}
        sql+=' ORDER BY requested_at DESC LIMIT 100';
        const rs=await env.DB.prepare(sql).bind(...binds).all();
        const out=[]; for(const r of (rs.results||[])) out.push({...publicReturn(r),evidence:await returnEvidenceList(env,r.id)});
        return json({returns:out},200,origin);
      }

      if(req.method==='POST' && url.pathname==='/api/account/returns/evidence'){
        requireAllowedOrigin(req,env);
        const sess=await requireCustomer(req,env);
        if(!env.RETURN_EVIDENCE) return json({error:'Evidence storage is not configured'},503,origin);
        await enforceRateLimit(env,`return-upload:${sess.email}`,20,3600);
        const returnId=clean(url.searchParams.get('return_id'),100);
        const r=await env.DB.prepare(`SELECT * FROM return_requests WHERE id=? AND customer_email=?`).bind(returnId,sess.email).first();
        if(!r) return json({error:'Return request not found'},404,origin);
        if(['REJECTED','COMPLETED','PARTIALLY_REFUNDED','REFUNDED'].includes(r.status)) return json({error:'This return request is closed'},409,origin);
        const existing=await env.DB.prepare(`SELECT COUNT(*) c FROM return_evidence WHERE return_id=?`).bind(returnId).first();
        if(Number(existing?.c||0)>=4) return json({error:'Maximum 4 evidence files allowed'},409,origin);
        const mime=clean((req.headers.get('content-type')||'').split(';')[0],100).toLowerCase();
        if(!RETURN_EVIDENCE_MIME.has(mime)) return json({error:'Use JPG, PNG, WEBP, MP4, WEBM or MOV evidence'},415,origin);
        const max=mime.startsWith('video/')?20*1024*1024:8*1024*1024;
        const declared=Number(req.headers.get('content-length')||0); if(declared>max) return json({error:'Evidence file is too large'},413,origin);
        const bytes=await req.arrayBuffer(); if(bytes.byteLength>max||bytes.byteLength<1) return json({error:'Evidence file is empty or too large'},413,origin);
        const rawName=clean(req.headers.get('x-file-name')||'evidence',120).replace(/[^A-Za-z0-9._-]/g,'_');
        const ext=({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov' })[mime]||'bin';
        const evidenceId=ref('WTE'),key=`returns/${r.order_id}/${returnId}/${evidenceId}.${ext}`;
        await env.RETURN_EVIDENCE.put(key,bytes,{httpMetadata:{contentType:mime},customMetadata:{return_id:returnId,order_id:r.order_id}});
        await env.DB.prepare(`INSERT INTO return_evidence(id,return_id,object_key,file_name,mime_type,size_bytes,uploaded_at) VALUES(?,?,?,?,?,?,?)`).bind(evidenceId,returnId,key,rawName,mime,bytes.byteLength,now()).run();
        await event(env,r.order_id,'RETURN_EVIDENCE_ADDED',null,`${returnId} • ${rawName}`);
        return json({ok:true,evidence:{id:evidenceId,file_name:rawName,mime_type:mime,size_bytes:bytes.byteLength}},201,origin);
      }

      if(req.method==='GET' && url.pathname==='/api/account/returns/evidence'){
        const sess=await requireCustomer(req,env);
        if(!env.RETURN_EVIDENCE) return json({error:'Evidence storage is not configured'},503,origin);
        const id=clean(url.searchParams.get('id'),100);
        const e=await env.DB.prepare(`SELECT e.* FROM return_evidence e JOIN return_requests r ON r.id=e.return_id WHERE e.id=? AND r.customer_email=?`).bind(id,sess.email).first();
        if(!e) return json({error:'Evidence not found'},404,origin);
        const obj=await env.RETURN_EVIDENCE.get(e.object_key); if(!obj) return json({error:'Evidence file missing'},404,origin);
        return new Response(obj.body,{headers:{...binaryHeaders(origin,e.mime_type,e.file_name), 'content-disposition':`inline; filename="${clean(e.file_name,100).replace(/["\\]/g,'_')}"`}});
      }

      if(req.method==='GET' && (url.pathname==='/api/account/invoice' || url.pathname==='/api/account/invoice.pdf')){
        let sess; try{sess=await requireCustomer(req,env)}catch{return json({error:'Unauthorized'},401,origin)}
        await enforceRateLimit(env,`invoice-customer:${clientIp(req)}`,40,300);
        const id=clean(url.searchParams.get('id'),100);
        let order=await env.DB.prepare(`SELECT * FROM orders WHERE id=? AND customer_email=?`).bind(id,sess.email).first();
        if(!order) return json({error:'Invoice not found'},404,origin);
        order=await ensureInvoice(env,id);
        if(!order.invoice_number) return json({error:'Invoice is available after payment/COD confirmation'},409,origin);
        const inv=invoicePayload(order,env);
        if(url.pathname.endsWith('.pdf')){
          const bytes=invoicePdfBytes(inv);
          return new Response(bytes,{status:200,headers:binaryHeaders(origin,'application/pdf',`${inv.invoice_number.replace(/[^A-Za-z0-9_-]/g,'-')}.pdf`)});
        }
        return json({invoice:inv},200,origin);
      }

      // ---------- Admin API ----------
      if(url.pathname.startsWith('/api/admin/')){
        requireAllowedOrigin(req,env);
        await enforceRateLimit(env,`admin:${clientIp(req)}`,120,300);
        try{ requireAdmin(req,env); }
        catch{ return json({error:'Unauthorized'},401,origin); }

        if(req.method==='GET' && url.pathname==='/api/admin/orders'){
          const status=clean(url.searchParams.get('status'),60);
          const search=clean(url.searchParams.get('q'),100);
          const limit=Math.min(200,Math.max(1,Number(url.searchParams.get('limit'))||100));

          let sql=`SELECT id,payment_method,status,environment,subtotal,discount,shipping,shipping_discount,total,currency,coupon,owner_notified_at,customer_notified_at,customer_notified_status,invoice_number,invoice_issued_at,created_at,updated_at,customer_json,items_json,(SELECT status FROM return_requests rr WHERE rr.order_id=orders.id ORDER BY rr.requested_at DESC LIMIT 1) AS return_status FROM orders`;
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
          const body=await readJson(req);
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


        if(req.method==='GET' && url.pathname==='/api/admin/returns'){
          const status=clean(url.searchParams.get('status'),60);
          let sql=`SELECT r.*,o.payment_method,o.total,o.razorpay_payment_id,o.customer_json FROM return_requests r JOIN orders o ON o.id=r.order_id`,binds=[];
          if(status&&status!=='ALL'){sql+=' WHERE r.status=?';binds.push(status)}
          sql+=' ORDER BY r.requested_at DESC LIMIT 200';
          const rs=await env.DB.prepare(sql).bind(...binds).all();
          const returns=(rs.results||[]).map(r=>({...r,customer:JSON.parse(r.customer_json||'{}')}));
          returns.forEach(r=>delete r.customer_json);
          return json({returns},200,origin);
        }

        if(req.method==='GET' && url.pathname==='/api/admin/return'){
          const id=clean(url.searchParams.get('id'),100);
          const r=await env.DB.prepare(`SELECT r.*,o.payment_method,o.total,o.razorpay_payment_id,o.customer_json,o.items_json FROM return_requests r JOIN orders o ON o.id=r.order_id WHERE r.id=?`).bind(id).first();
          if(!r) return json({error:'Return request not found'},404,origin);
          r.customer=JSON.parse(r.customer_json||'{}');r.items=JSON.parse(r.items_json||'[]');delete r.customer_json;delete r.items_json;
          r.evidence=await returnEvidenceList(env,id);
          return json({return_request:r},200,origin);
        }

        if(req.method==='GET' && url.pathname==='/api/admin/returns/evidence'){
          if(!env.RETURN_EVIDENCE) return json({error:'Evidence storage is not configured'},503,origin);
          const id=clean(url.searchParams.get('id'),100);
          const e=await env.DB.prepare(`SELECT * FROM return_evidence WHERE id=?`).bind(id).first();
          if(!e) return json({error:'Evidence not found'},404,origin);
          const obj=await env.RETURN_EVIDENCE.get(e.object_key); if(!obj) return json({error:'Evidence file missing'},404,origin);
          return new Response(obj.body,{headers:{...binaryHeaders(origin,e.mime_type,e.file_name), 'content-disposition':`inline; filename="${clean(e.file_name,100).replace(/["\\]/g,'_')}"`}});
        }

        if(req.method==='POST' && url.pathname==='/api/admin/return-status'){
          const body=await readJson(req),id=clean(body.id,100),status=clean(body.status,60).toUpperCase();
          const note=clean(body.note,1000),customerMessage=clean(body.customer_message,1000),tracking=clean(body.replacement_tracking,200);
          if(!RETURN_ADMIN_STATUSES.has(status)) throw Error('Invalid return status');
          const r=await env.DB.prepare(`SELECT * FROM return_requests WHERE id=?`).bind(id).first();
          if(!r) return json({error:'Return request not found'},404,origin);
          if(['PARTIALLY_REFUNDED','REFUNDED'].includes(status)) return json({error:'Use the Razorpay refund action for prepaid refunds'},409,origin);
          const ts=now();
          await env.DB.prepare(`UPDATE return_requests SET status=?,admin_note=?,customer_message=?,replacement_tracking=COALESCE(NULLIF(?,''),replacement_tracking),reviewed_at=CASE WHEN ? IN ('UNDER_REVIEW','APPROVED','REJECTED') THEN COALESCE(reviewed_at,?) ELSE reviewed_at END,updated_at=? WHERE id=?`).bind(status,note||null,customerMessage||null,tracking,status,ts,ts,id).run();
          await event(env,r.order_id,'RETURN_STATUS_CHANGED',null,`${id} • ${status}`);
          try{await notifyReturnCustomer(env,id)}catch{}
          return json({ok:true,return_request:await env.DB.prepare(`SELECT * FROM return_requests WHERE id=?`).bind(id).first()},200,origin);
        }

        if(req.method==='POST' && url.pathname==='/api/admin/refund'){
          await enforceRateLimit(env,`admin-refund:${clientIp(req)}`,10,3600);
          const body=await readJson(req),returnId=clean(body.return_id,100);
          const r=await env.DB.prepare(`SELECT r.*,o.payment_method,o.total,o.razorpay_payment_id,o.status order_status,o.environment FROM return_requests r JOIN orders o ON o.id=r.order_id WHERE r.id=?`).bind(returnId).first();
          if(!r) return json({error:'Return request not found'},404,origin);
          if(r.payment_method!=='Prepaid') return json({error:'Razorpay refund is available only for prepaid orders'},409,origin);
          if(String(r.environment||'TEST').toUpperCase()!=='LIVE') return json({error:'Refund disabled: this is a TEST order. Use a LIVE prepaid order for Razorpay refunds.'},409,origin);
          if(orderEnvironment(env)!=='LIVE'||razorpayMode(env)!=='LIVE') return json({error:'Refund disabled: the payment backend is not in LIVE/LIVE mode.'},409,origin);
          if(!['APPROVED','REFUND_PENDING'].includes(r.status)) return json({error:'Approve the return before starting a refund'},409,origin);
          if(r.razorpay_refund_id) return json({error:'A Razorpay refund already exists for this return',refund_id:r.razorpay_refund_id},409,origin);
          const amount=Number(body.amount||r.total);
          const order={id:r.order_id,total:r.total,razorpay_payment_id:r.razorpay_payment_id};
          const refund=await razorpayRefund(env,order,amount,returnId);
          const processed=String(refund.status||'').toLowerCase()==='processed';
          const next=processed ? (amount < Number(r.total) ? 'PARTIALLY_REFUNDED' : 'REFUNDED') : 'REFUND_PENDING';
          await env.DB.prepare(`UPDATE return_requests SET status=?,refund_amount=?,razorpay_refund_id=?,refund_status=?,updated_at=? WHERE id=?`).bind(next,amount,clean(refund.id,100),clean(refund.status,60),now(),returnId).run();
          await event(env,r.order_id,'RAZORPAY_REFUND_CREATED',null,`${returnId} • ${clean(refund.id,100)} • ${money(amount)}`);
          try{await notifyReturnCustomer(env,returnId)}catch{}
          return json({ok:true,refund:{id:refund.id,status:refund.status,amount}},200,origin);
        }

        if(req.method==='POST' && url.pathname==='/api/admin/resend-notification'){
          const body=await readJson(req);
          const id=clean(body.id,100);
          const result=await notifyOwner(env,id,true);
          return json({ok:true,result},200,origin);
        }

        if(req.method==='POST' && url.pathname==='/api/admin/resend-customer-notification'){
          const body=await readJson(req);
          const id=clean(body.id,100);
          const result=await notifyCustomer(env,id,true);
          return json({ok:true,result},200,origin);
        }

        if(req.method==='GET' && (url.pathname==='/api/admin/invoice' || url.pathname==='/api/admin/invoice.pdf')){
          const id=clean(url.searchParams.get('id'),100);
          let order=await ensureInvoice(env,id);
          if(!order.invoice_number) return json({error:'Invoice is available after payment/COD confirmation'},409,origin);
          const inv=invoicePayload(order,env);
          if(url.pathname.endsWith('.pdf')){
            const bytes=invoicePdfBytes(inv);
            return new Response(bytes,{status:200,headers:binaryHeaders(origin,'application/pdf',`${inv.invoice_number.replace(/[^A-Za-z0-9_-]/g,'-')}.pdf`)});
          }
          return json({invoice:inv},200,origin);
        }

        return json({error:'Admin endpoint not found'},404,origin);
      }

      // ---------- Checkout ----------
      if(req.method==='POST' && url.pathname==='/api/create-order'){
        requireAllowedOrigin(req,env);
        await enforceRateLimit(env,`prepaid:${clientIp(req)}`,20,600);
        if(!env.RAZORPAY_KEY_ID||!env.RAZORPAY_KEY_SECRET)
          return json({error:'Gateway is not configured'},503,origin);
        assertGatewayEnvironment(env);

        const order=await readJson(req);
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
        requireAllowedOrigin(req,env);
        await enforceRateLimit(env,`verify-payment:${clientIp(req)}`,30,600);
        assertGatewayEnvironment(env);
        const b=await readJson(req);
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
        if(String(pd.currency||'').toUpperCase()!=='INR' || Number(pd.amount)!==Number(row.total)*100)
          return json({verified:false,error:'Payment amount verification failed'},400,origin);

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
        requireAllowedOrigin(req,env);
        await enforceRateLimit(env,`cod:${clientIp(req)}`,6,900);
        const order=await readJson(req);
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
        await enforceRateLimit(env,`razorpay-webhook:${clientIp(req)}`,240,300);
        if(!jsonLengthOk(req)) return json({error:'Request too large'},413,origin);
        if(!env.RAZORPAY_WEBHOOK_SECRET)
          return json({error:'Webhook secret not configured'},503,origin);

        const raw=await req.text();
        if(raw.length>SECURITY_JSON_LIMIT) return json({error:'Request too large'},413,origin);
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
        if(!new Set(['payment.captured','payment.failed','order.paid','refund.processed','refund.failed']).has(type))
          return json({ok:true,ignored:true},200,origin);
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

        if(type==='refund.processed'||type==='refund.failed'){
          const refund=evt?.payload?.refund?.entity||{};
          const refundId=clean(refund.id,100);
          if(refundId){
            const rr=await env.DB.prepare(`SELECT r.*,o.total order_total FROM return_requests r JOIN orders o ON o.id=r.order_id WHERE r.razorpay_refund_id=?`).bind(refundId).first();
            if(rr){
              const next=type==='refund.processed'
                ? (Number(rr.refund_amount||0) < Number(rr.order_total||0) ? 'PARTIALLY_REFUNDED' : 'REFUNDED')
                : 'APPROVED';
              await env.DB.prepare(`UPDATE return_requests SET status=?,refund_status=?,updated_at=? WHERE id=?`).bind(next,clean(refund.status||type,60),now(),rr.id).run();
              await event(env,rr.order_id,type==='refund.processed'?'REFUND_PROCESSED':'REFUND_FAILED',null,`${rr.id} • ${refundId}`);
              try{await notifyReturnCustomer(env,rr.id)}catch{}
            }
          }
          return json({ok:true},200,origin);
        }

        if(razorpayOrderId){
          const row=await env.DB.prepare(
            'SELECT id,status,payment_method,total FROM orders WHERE razorpay_order_id=?'
          ).bind(razorpayOrderId).first();

          if(row){
            if(type==='payment.captured'||type==='order.paid'){
              if(row.payment_method!=='Prepaid') return json({ok:true,ignored:true},200,origin);
              if(!['PAID','SENT_TO_TADDA','PRINTING','DISPATCHED','DELIVERED'].includes(row.status))
                await updateStatus(env,row.id,'PAID',paymentId);
              try{ await notifyOwner(env,row.id); }catch{}
              try{ await notifyCustomer(env,row.id); }catch{}
            }else if(type==='payment.failed'){
              if(row.payment_method==='Prepaid' && !['PAID','SENT_TO_TADDA','PRINTING','DISPATCHED','DELIVERED'].includes(row.status))
                await updateStatus(env,row.id,'PAYMENT_FAILED',paymentId);
            }
          }
        }

        return json({ok:true},200,origin);
      }

      return json({error:'Not found'},404,origin);

    }catch(e){
      const status=Number(e?.status)||400;
      return json({error:e?.message||'Bad request'},status,origin);
    }
  }
};
