(()=>{
const PURCHASE_PREFIX='tanvraMetaPurchase:';
const CHECKOUT_PREFIX='tanvraMetaCheckout:';
function cfg(){return window.TANVRA_CONFIG?.analytics||{}}
function init(){
  const pixel=String(cfg().metaPixelId||'').trim();
  if(window.fbq){return true}
  if(!pixel)return false;
  const f=window.fbq=function(){f.callMethod?f.callMethod.apply(f,arguments):f.queue.push(arguments)};
  if(!window._fbq)window._fbq=f;
  f.push=f;f.loaded=true;f.version='2.0';f.queue=[];
  const s=document.createElement('script');s.async=true;s.src='https://connect.facebook.net/en_US/fbevents.js';
  const first=document.getElementsByTagName('script')[0];first?.parentNode?.insertBefore(s,first);
  f('init',pixel);
  f('track','PageView');
  return true;
}
function track(event,params={},eventId=''){
  init();
  if(typeof window.fbq!=='function')return false;
  try{
    const p={currency:'INR',...params};
    if(eventId)window.fbq('track',event,p,{eventID:eventId});
    else window.fbq('track',event,p);
    return true;
  }catch{return false}
}
function productParams(p,value=p?.price){
  return {
    content_name:p?.name||'TANVRA Product',
    content_id:p?.id||'',
    content_ids:p?.id?[p.id]:[],
    content_type:'product',
    value:Number(value||0),
    currency:'INR'
  };
}
function cartParams(cart){
  const lines=(cart||[]).map(x=>{const p=window.TanvraStore?.byId?.(x.productId);return {x,p}}).filter(x=>x.p);
  const value=lines.reduce((sum,{x,p})=>sum+Number(p.price||0)*Number(x.qty||0),0);
  return {
    content_name:lines.map(({p})=>p.name).join(', ')||'TANVRA Checkout',
    content_id:lines[0]?.p?.id||'cart',
    content_ids:lines.map(({p})=>p.id),
    contents:lines.map(({x,p})=>({id:p.id,quantity:Number(x.qty||1),item_price:Number(p.price||0)})),
    content_type:'product',value,currency:'INR'
  };
}
function viewContent(p){track('ViewContent',productParams(p))}
function addToCart(p,qty=1){track('AddToCart',{...productParams(p),contents:[{id:p.id,quantity:Number(qty||1),item_price:Number(p.price||0)}]})}
function initiateCheckout(cart){
  const params=cartParams(cart),fingerprint=(params.content_ids||[]).join('|')+':'+params.value;
  const key=CHECKOUT_PREFIX+fingerprint;
  if(sessionStorage.getItem(key))return;
  sessionStorage.setItem(key,'1');track('InitiateCheckout',params);
}
function rememberPurchase(orderId,params){
  if(!orderId)return;
  try{sessionStorage.setItem(PURCHASE_PREFIX+orderId,JSON.stringify(params||{}))}catch{}
}
function purchase(orderId,params){
  if(!orderId)return false;
  const done='tanvraMetaPurchaseDone:'+orderId;
  if(localStorage.getItem(done))return false;
  const ok=track('Purchase',{currency:'INR',...(params||{})},orderId);
  if(ok)localStorage.setItem(done,'1');
  return ok;
}
function purchaseRemembered(orderId){
  if(!orderId)return false;
  let p={};try{p=JSON.parse(sessionStorage.getItem(PURCHASE_PREFIX+orderId)||'{}')}catch{}
  return purchase(orderId,p);
}
window.TanvraAnalytics={init,track,productParams,cartParams,viewContent,addToCart,initiateCheckout,rememberPurchase,purchase,purchaseRemembered};
document.addEventListener('DOMContentLoaded',init);
})();
