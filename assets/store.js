(()=>{
const KEY='wearTanvraCartV8';
const OLD=['wearTanvraCartV7','wearTanvraCartV6','wearTanvraCartV5','wearTanvraCartV4'];
const products=()=>Array.isArray(window.TANVRA_PRODUCTS)?window.TANVRA_PRODUCTS:[];
const byId=id=>products().find(p=>p.id===id);
function read(){
  try{
    let raw=localStorage.getItem(KEY);
    if(!raw){for(const k of OLD){raw=localStorage.getItem(k);if(raw)break}}
    const arr=JSON.parse(raw||'[]');
    return Array.isArray(arr)?arr.filter(x=>byId(x.productId)&&Number(x.qty)>0):[];
  }catch{return[]}
}
function save(c){localStorage.setItem(KEY,JSON.stringify(c));badge()}
function add(i){
  const c=read(),key=[i.productId,i.size,i.color].join('|');
  let f=c.find(x=>x.key===key);
  if(f)f.qty=Math.min(10,Number(f.qty||0)+(Number(i.qty)||1));
  else c.push({...i,key,qty:Math.min(10,Math.max(1,Number(i.qty)||1))});
  save(c);return key;
}
function remove(key){save(read().filter(x=>x.key!==key))}
function qty(key,n){const c=read(),f=c.find(x=>x.key===key);if(f)f.qty=Math.min(10,Math.max(0,Number(n)||0));save(c.filter(x=>x.qty>0))}
function count(){return read().reduce((s,x)=>s+Number(x.qty||0),0)}
function subtotal(){return read().reduce((s,x)=>{const p=byId(x.productId);return s+(p?Number(p.price)*Number(x.qty):0)},0)}
function mrpTotal(){return read().reduce((s,x)=>{const p=byId(x.productId);return s+(p?Number(p.compareAt||p.price)*Number(x.qty):0)},0)}
function money(n){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n)||0)}
function pricing(method='Prepaid'){
  const cfg=window.TANVRA_CONFIG||{},sub=subtotal(),prepaid=method==='Prepaid';
  const discount=prepaid?Math.min(Number(cfg.prepaidCoupon?.discount||50),sub):0;
  const threshold=Number(cfg.shipping?.freeAbove||799);
  const freeShipping=sub>=threshold;

  // Shipping shown to the customer for transparency.
  // For orders below ₹799, the normal shipping charge is displayed and then
  // fully offset as "Shipping included", so it never increases the advertised total.
  let shipping=0;
  if(!freeShipping){
    shipping=prepaid
      ? Number(cfg.shipping?.prepaidFlatBelowThreshold||68)
      : Math.max(
          Number(cfg.shipping?.codMinimumBelowThreshold||98),
          Math.ceil(sub*Number(cfg.shipping?.codPercentBelowThreshold||2.3)/100)
        );
  }
  const shippingIncludedDiscount=freeShipping?0:shipping;
  const payableShipping=Math.max(0,shipping-shippingIncludedDiscount);

  return {
    mrp:mrpTotal(),
    subtotal:sub,
    discount,
    shipping,
    shippingIncludedDiscount,
    payableShipping,
    freeShipping,
    freeShippingThreshold:threshold,
    total:Math.max(0,sub-discount+payableShipping)
  };
}
function badge(){document.querySelectorAll('[data-cart-count]').forEach(e=>e.textContent=count())}
function defaultVariant(p){return {productId:p.id,size:p.sizes?.[0]||'M',color:p.colors?.[0]?.name||'As Shown',qty:1}}
window.TanvraStore={products,byId,cart:read,save,add,remove,qty,count,subtotal,mrpTotal,money,pricing,badge,defaultVariant};
})();
