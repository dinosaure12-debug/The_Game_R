export function animatePlay({ cardEl, pileBtn, cardHTML, applyCardColors }){
  if(!cardEl || !pileBtn) return;

  const from = cardEl.getBoundingClientRect();
  const to = pileBtn.getBoundingClientRect();

  const fly = document.createElement("div");
  fly.className = "flying-card card";
  fly.innerHTML = cardHTML();
  fly.style.left = from.left + "px";
  fly.style.top = from.top + "px";
  fly.style.width = from.width + "px";
  fly.style.height = from.height + "px";
  document.body.appendChild(fly);

  applyCardColors(fly);

  const dx = (to.left + to.width/2) - (from.left + from.width/2);
  const dy = (to.top + to.height/2) - (from.top + from.height/2);

  requestAnimationFrame(()=>{
    fly.style.transition = "transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 300ms";
    fly.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.1)`;
    fly.style.opacity = "0";
  });
  setTimeout(()=>fly.remove(), 350);
}
