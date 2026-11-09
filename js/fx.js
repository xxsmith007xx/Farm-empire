/* Farm Empire — interface effects (outside the farm canvas): flying coins,
 * rolling counters, button pops and sparkles. Uses the Web Animations API. */
(function () {
  'use strict';
  const A = window.FarmArt;
  const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const center = el => { const b = el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; };

  function pop(el, amount) {
    if (!el || !el.animate) return;
    const k = 1 + (amount || .15);
    el.animate([{ transform: 'scale(1)' }, { transform: `scale(${k})` }, { transform: 'scale(.96)' }, { transform: 'scale(1)' }],
      { duration: 320, easing: 'ease-out' });
  }
  function nudge(el) {
    if (!el || !el.animate) return;
    el.animate([0, -6, 6, -4, 4, 0].map(x => ({ transform: `translateX(${x}px)` })), { duration: 300, easing: 'ease-out' });
  }
  function shake(el, px) {
    if (REDUCED || !el || !el.animate) return;
    px = px || 6;
    el.animate(Array.from({ length: 8 }, (_, i) => ({ transform: i === 7 ? 'none' : `translate(${rand(-px, px)}px,${rand(-px, px)}px)` })), { duration: 380 });
  }
  function sprite(key, size) {
    const img = document.createElement('img');
    img.src = A.dataURL(key); img.className = 'fx-sprite'; img.alt = '';
    img.style.width = img.style.height = size + 'px';
    document.body.append(img);
    return img;
  }
  // Little stars bursting out around an element (e.g. a buy button).
  function sparkle(el, n) {
    if (!el) return;
    const [x, y] = center(el);
    n = REDUCED ? 3 : n || 8;
    for (let i = 0; i < n; i++) {
      const s = sprite('star', rand(12, 20)), a = (i / n) * Math.PI * 2, d = rand(30, 60);
      s.animate([
        { transform: `translate(${x}px,${y}px) translate(-50%,-50%) scale(.2) rotate(0)`, opacity: 1 },
        { transform: `translate(${x + Math.cos(a) * d}px,${y + Math.sin(a) * d}px) translate(-50%,-50%) scale(1) rotate(${rand(-180, 180)}deg)`, opacity: 0 }
      ], { duration: rand(450, 650), easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => s.remove();
    }
  }
  // Coins (or gems) burst out from a screen point, then swoop into a target element.
  function flyTo(from, target, n, key, onEach) {
    if (!target) return;
    const [fx, fy] = Array.isArray(from) ? from : center(from);
    n = Math.max(1, Math.min(REDUCED ? 3 : 12, n || 8));
    for (let i = 0; i < n; i++) {
      const c = sprite(key || 'coin', 26);
      const a = rand(0, Math.PI * 2), r = rand(20, 55), sx = fx + Math.cos(a) * r, sy = fy + Math.sin(a) * r * .7;
      const [tx, ty] = center(target);
      const cx = (sx + tx) / 2 + rand(-80, 80), cy = Math.min(sy, ty) - rand(40, 120);
      const frames = [{ transform: `translate(${fx}px,${fy}px) translate(-50%,-50%) scale(.3)`, offset: 0 }];
      frames.push({ transform: `translate(${sx}px,${sy}px) translate(-50%,-50%) scale(1.1)`, offset: .3 });
      for (let j = 1; j <= 6; j++) { // quadratic curve into the counter
        const k = j / 6, x = (1 - k) * (1 - k) * sx + 2 * (1 - k) * k * cx + k * k * tx, y = (1 - k) * (1 - k) * sy + 2 * (1 - k) * k * cy + k * k * ty;
        frames.push({ transform: `translate(${x}px,${y}px) translate(-50%,-50%) scale(${1.1 - k * .5})`, offset: .3 + k * .7 });
      }
      const an = c.animate(frames, { duration: 850, delay: i * 45, easing: 'ease-in', fill: 'both' });
      an.onfinish = () => { c.remove(); pop(target, .1); if (onEach) onEach(i); };
    }
  }
  // A number display that smoothly rolls toward its target value.
  const counters = [];
  function counter(el, format) {
    const c = { el, format, shown: 0, target: 0, init: false, set(v) { this.target = v; if (!this.init || v < this.shown || REDUCED) { this.shown = v; this.init = true; this.draw(); } },
      draw() { const s = this.format(this.shown); if (this.el.textContent !== s) this.el.textContent = s; } };
    counters.push(c); return c;
  }
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    counters.forEach(c => {
      if (c.shown === c.target) return;
      c.shown += (c.target - c.shown) * Math.min(1, dt * 9);
      if (Math.abs(c.target - c.shown) <= Math.max(.5, Math.abs(c.target) * 1e-4)) c.shown = c.target;
      c.draw();
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  window.FarmFX = { pop, nudge, shake, sparkle, flyTo, counter, icon: (key, cls) => `<img class="${cls || 'ci'}" src="${A.dataURL(key)}" alt="">`, REDUCED };
})();
