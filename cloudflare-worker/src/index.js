const PRODUCTS = {
  "wild-instinct": { name:"Wild Instinct Oversized Tee", price:899 },
  "ghost-compass": { name:"Ghost Compass Oversized Tee", price:899 },
  "core-220": { name:"Core 220 Oversized Tee", price:749 }
};

function json(data,status=200,origin="*"){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      "content-type":"application/json; charset=utf-8",
      "access-control-allow-origin":origin,
      "access-control-allow-methods":"POST,OPTIONS",
      "access-control-allow-headers":"Content-Type"
    }
  });
}

function corsOrigin(request,env){
  const origin=request.headers.get("Origin")||"";
  const allowed=(env.ALLOWED_ORIGIN||"https://weartanvra.com").replace(/\/$/,"");
  if(origin===allowed || origin==="http://localhost:8000" || origin==="http://127.0.0.1:8000") return origin;
  return allowed;
}

function cleanText(v,max=300){
  return String(v??"").trim().slice(0,max);
}

function validateCustomer(c){
  if(!c) throw new Error("Missing customer");
  const required=["name","phone","pincode","address","city","state"];
  for(const k of required) if(!cleanText(c[k])) throw new Error(`Missing ${k}`);
  if(!/^[0-9]{10}$/.test(cleanText(c.phone).replace(/\D/g,""))) throw new Error("Phone must contain 10 digits");
  if(!/^[0-9]{6}$/.test(cleanText(c.pincode).replace(/\D/g,""))) throw new Error("Pincode must contain 6 digits");
}

function calculate(order,env){
  if(!Array.isArray(order.items)||!order.items.length) throw new Error("Cart is empty");
  let subtotal=0;
  for(const item of order.items){
    const p=PRODUCTS[item.product_id];
    const qty=Math.max(1,Math.min(5,Number(item.qty)||1));
    if(!p) throw new Error("Unknown product");
    if(!["S","M","L","XL"].includes(cleanText(item.size,4))) throw new Error("Invalid size");
    subtotal += p.price*qty;
  }
  const prepaid=order.payment_method==="Prepaid";
  const discount=prepaid ? Math.min(Number(env.PREPAID_DISCOUNT||50),subtotal) : 0;
  const shipping=prepaid ? Number(env.PREPAID_SHIPPING||68) : Number(env.COD_SHIPPING||98);
  const total=Math.max(0,subtotal-discount+shipping);
  return {subtotal,discount,shipping,total};
}

function basicAuth(key,secret){
  return "Basic "+btoa(`${key}:${secret}`);
}

async function hmacHex(secret,message){
  const key=await crypto.subtle.importKey(
    "raw",new TextEncoder().encode(secret),
    {name:"HMAC",hash:"SHA-256"},false,["sign"]
  );
  const sig=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

function orderRef(prefix="WT"){
  const now=new Date();
  return `${prefix}-${now.toISOString().replace(/\D/g,"").slice(0,14)}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;
}

export default {
  async fetch(request,env){
    const origin=corsOrigin(request,env);
    if(request.method==="OPTIONS") return json({ok:true},204,origin);

    const url=new URL(request.url);
    if(request.method!=="POST") return json({error:"Method not allowed"},405,origin);

    try{
      if(url.pathname==="/api/create-order"){
        if(!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET)
          return json({error:"Payment gateway keys are not configured"},503,origin);

        const order=await request.json();
        validateCustomer(order.customer);
        if(order.payment_method!=="Prepaid") throw new Error("This endpoint is for prepaid orders");

        const pricing=calculate(order,env);
        const localId=orderRef("WTP");
        const receipt=localId.slice(0,40);

        const rp=await fetch("https://api.razorpay.com/v1/orders",{
          method:"POST",
          headers:{
            "Authorization":basicAuth(env.RAZORPAY_KEY_ID,env.RAZORPAY_KEY_SECRET),
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            amount:Math.round(pricing.total*100),
            currency:"INR",
            receipt,
            notes:{
              local_order_id:localId,
              coupon:"PREPAID50",
              source:"weartanvra.com"
            }
          })
        });

        const data=await rp.json();
        if(!rp.ok) return json({error:data?.error?.description||"Razorpay order creation failed"},502,origin);

        // Important: the amount is recalculated on the Worker; frontend prices are never trusted.
        return json({
          local_order_id:localId,
          razorpay_order_id:data.id,
          key_id:env.RAZORPAY_KEY_ID,
          amount:data.amount,
          currency:data.currency,
          receipt,
          pricing
        },200,origin);
      }

      if(url.pathname==="/api/verify-payment"){
        if(!env.RAZORPAY_KEY_SECRET)
          return json({error:"Payment verification secret is not configured"},503,origin);

        const body=await request.json();
        const localId=cleanText(body.local_order_id,80);
        const rpOrder=cleanText(body.razorpay_order_id,100);
        const paymentId=cleanText(body.razorpay_payment_id,100);
        const signature=cleanText(body.razorpay_signature,200);
        if(!localId||!rpOrder||!paymentId||!signature) throw new Error("Missing payment verification fields");

        const expected=await hmacHex(env.RAZORPAY_KEY_SECRET,`${rpOrder}|${paymentId}`);
        if(expected!==signature) return json({verified:false,error:"Invalid payment signature"},400,origin);

        return json({verified:true,order_id:localId,payment_id:paymentId},200,origin);
      }

      if(url.pathname==="/api/cod-order"){
        const order=await request.json();
        validateCustomer(order.customer);
        if(order.payment_method!=="Cash on Delivery") throw new Error("This endpoint is for COD orders");
        const pricing=calculate(order,env);
        const localId=orderRef("WTC");

        // This endpoint only validates and issues an order reference.
        // Before production launch, connect this to your order database/email/CRM.
        return json({
          accepted:true,
          order_id:localId,
          status:"COD_CONFIRMATION_REQUIRED",
          pricing
        },200,origin);
      }

      return json({error:"Not found"},404,origin);
    }catch(err){
      return json({error:err.message||"Bad request"},400,origin);
    }
  }
};
