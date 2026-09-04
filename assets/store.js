(()=>{
const KEY='wearTanvraCartV7'; const OLD=['wearTanvraCartV4','wearTanvraCartV5','wearTanvraCartV6'];
const products=()=>Array.isArray(window.TANVRA_PRODUCTS)?window.TANVRA_PRODUCTS:[];
const byId=id=>products().find(p=>p.id===id);
function read(){try{let raw=localStorage.getItem(KEY);if(!raw){for(const k of OLD){raw=localStorage.getItem(k);if(raw)break}}const arr=JSON.parse(raw||'[]');return Array.isArray(arr)?arr.filter(x=>byId(x.productId)&&x.qty>0):[]}catch{return[]}}
function save(c){localStorage.setItem(KEY,JSON.stringify(c));badge()}
function add(i){const c=read(), key=[i.productId,i.size,i.color].join('|');let f=c.find(x=>x.key===key);if(f)f.qty=Math.min(10,f.qty+(Number(i.qty)||1));else c.push({...i,key,qty:Math.min(10,Math.max(1,Number(i.qty)||1))});save(c)}
function remove(key){save(read().filter(x=>x.key!==key))}
function qty(key,n){const c=read(),f=c.find(x=>x.key===key);if(f)f.qty=Math.min(10,Math.max(0,Number(n)||0));save(c.filter(x=>x.qty>0))}
function count(){return read().reduce((s,x)=>s+x.qty,0)}
function subtotal(){return read().reduce((s,x)=>{const p=byId(x.productId);return s+(p?p.price*x.qty:0)},0)}
function money(n){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n)||0)}
function pricing(method='Prepaid'){
 const cfg=window.TANVRA_CONFIG||{}, sub=subtotal(), prepaid=method==='Prepaid';
 const discount=prepaid?Math.min(Number(cfg.prepaidCoupon?.discount||50),sub):0;
 const ship=prepaid?Number(cfg.shipping?.prepaidFlat||68):Math.max(Number(cfg.shipping?.codMinimum||98),Math.ceil(sub*Number(cfg.shipping?.codPercent||2.3)/100));
 return {subtotal:sub,discount,shipping:ship,total:Math.max(0,sub-discount+ship)};
}
function badge(){document.querySelectorAll('[data-cart-count]').forEach(e=>e.textContent=count())}
window.TanvraStore={products,byId,cart:read,save,add,remove,qty,count,subtotal,money,pricing,badge};
})();