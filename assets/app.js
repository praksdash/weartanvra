
document.addEventListener("DOMContentLoaded",()=>{
  TanvraStore.updateBadges();
  document.querySelectorAll("[data-year]").forEach(el=>el.textContent=new Date().getFullYear());
  const toggle=document.querySelector("[data-mobile-toggle]");
  const nav=document.querySelector("[data-mobile-nav]");
  if(toggle&&nav) toggle.addEventListener("click",()=>nav.classList.toggle("open"));
});
