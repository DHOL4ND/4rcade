/* DHØL ARCADE v1.0.0 — shared navigation */
document.addEventListener("DOMContentLoaded",()=>{
  const menu=document.querySelector(".menu"),nav=document.querySelector(".header nav");
  if(menu&&nav){
    menu.setAttribute("aria-label","Open navigation");
    menu.setAttribute("aria-expanded","false");
    menu.addEventListener("click",()=>{
      const open=nav.classList.toggle("mobile-open");
      menu.setAttribute("aria-expanded",String(open));
      menu.textContent=open?"✕":"☰";
    });
    nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{
      nav.classList.remove("mobile-open");menu.setAttribute("aria-expanded","false");menu.textContent="☰";
    }));
  }
});
