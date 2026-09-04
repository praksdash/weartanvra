document.addEventListener('DOMContentLoaded',()=>{
  TanvraStore?.badge?.(); document.querySelectorAll('[data-year]').forEach(e=>e.textContent=new Date().getFullYear());
  const t=document.querySelector('[data-mobile-toggle]'),n=document.querySelector('[data-mobile-nav]'); if(t&&n)t.addEventListener('click',()=>n.classList.toggle('open'));
});