
(function(){
  const KEY = "wearTanvraCartV4";
  function getProducts(){ return window.TANVRA_PRODUCTS || []; }
  function productById(id){ return getProducts().find(p=>p.id===id); }
  function getCart(){ try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch(e){return []} }
  function saveCart(cart){ localStorage.setItem(KEY, JSON.stringify(cart)); updateBadges(); }
  function addItem(item){
    const cart=getCart();
    const key=[item.productId,item.size,item.color].join("|");
    const found=cart.find(x=>x.key===key);
    if(found) found.qty += item.qty || 1;
    else cart.push({...item,key,qty:item.qty||1});
    saveCart(cart);
  }
  function removeItem(key){ saveCart(getCart().filter(x=>x.key!==key)); }
  function updateQty(key,qty){
    const cart=getCart(); const found=cart.find(x=>x.key===key);
    if(found){ found.qty=Math.max(0,Number(qty)||0); }
    saveCart(cart.filter(x=>x.qty>0));
  }
  function cartCount(){ return getCart().reduce((s,x)=>s+x.qty,0); }
  function cartTotal(){
    return getCart().reduce((s,x)=>{
      const p=productById(x.productId); return s + (p ? p.price*x.qty : 0);
    },0);
  }
  function money(v){ return "₹"+Number(v).toLocaleString("en-IN"); }
  function updateBadges(){ document.querySelectorAll("[data-cart-count]").forEach(e=>e.textContent=cartCount()); }
  window.TanvraStore={getProducts,productById,getCart,saveCart,addItem,removeItem,updateQty,cartCount,cartTotal,money,updateBadges};
})();
