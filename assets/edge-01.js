
(function(){
 const exts=['.webp','.png','.jpg','.jpeg'];
 function load(img){
  const base=img.dataset.edgeBase;if(!base)return;let i=0;
  function next(){
   if(i>=exts.length){img.closest('.edge-image-frame')?.classList.add('is-missing');return;}
   img.src=base+exts[i++];
  }
  img.addEventListener('error',next);
  img.addEventListener('load',()=>img.closest('.edge-image-frame')?.classList.remove('is-missing'));
  next();
 }
 document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('img[data-edge-base]').forEach(load));
})();
