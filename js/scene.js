/* Farm Empire — animated farm canvas (800×530 logical pixels). */
(function () {
  'use strict';
  const W = 800, H = 530;
  const PALETTES = [ // cycles with each farm expansion
    { sky: ['#8fd6f7', '#cdeeff'], hill: '#8acb80', grass: '#71b865', sun: '#fff1a0', cloud: '#ffffffb0', name: 'Sunny Acres' },
    { sky: ['#ffb27d', '#ffe3b8'], hill: '#9ac77a', grass: '#7ab560', sun: '#fff3c9', cloud: '#fff2e4b0', name: 'Golden Valley' },
    { sky: ['#7fb8e8', '#d4e9ff'], hill: '#a9d48e', grass: '#86c46d', sun: '#ffffff', cloud: '#ffffffc0', name: 'Breezy Highlands' },
    { sky: ['#2c3e74', '#7d8fc6'], hill: '#5f9a6a', grass: '#4f8a5b', sun: '#fff5c2', cloud: '#c9d4f066', name: 'Starlight Fields' }
  ];
  const COOP_SPOTS = [[95, 300], [190, 388], [545, 392], [652, 302]];
  const COOP_COLORS = [
    ['#d8b27a', '#a98250', '#f0d3a2', '#8a5a3c'], ['#f0c062', '#b88a3c', '#ffe08f', '#b5543d'],
    ['#d7544b', '#a63d40', '#f4c9aa', '#7e2a2a'], ['#6aa7d8', '#3f78a8', '#bfe0fa', '#2f5a86'],
    ['#c9cfd6', '#8d97a3', '#eef2f6', '#5a6573'], ['#ffffff', '#c8d8e8', '#ffffff', '#9fb4d8'],
    ['#b48ae6', '#7d5bb5', '#e2cdff', '#5a3d8e'], ['#e9ecf5', '#aab3cc', '#ffffff', '#6f7aa0']
  ];
  const TRUCK_COLORS = ['#e9734b', '#5aa9d6', '#f3bf45', '#4fae6d', '#c75f9e', '#f6f1e6', '#8a7dff', '#ff9b2f'];

  let ctx, getState, t = 0, lastFrame = 0;
  const chicks = [], floats = [], drones = [], confetti = [];
  let nextDrone = 6;
  let onDroneHit = null;

  // ---------- primitives ----------
  function poly(pts, fill, stroke, lw) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 3; ctx.stroke(); }
  }
  function ell(x, y, rx, ry, c) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); }
  function box(x, y, w, h, d, front, side, top) {
    poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], front);
    poly([[x + w, y], [x + w + d, y - d * .5], [x + w + d, y + h - d * .5], [x + w, y + h]], side);
    poly([[x, y], [x + d, y - d * .5], [x + w + d, y - d * .5], [x + w, y]], top);
  }
  function egg(x, y, r, color, spot) {
    ell(x, y, r * .78, r, color);
    ell(x - r * .25, y - r * .35, r * .2, r * .3, '#ffffff88');
    if (spot) { ell(x + r * .2, y + r * .1, r * .12, r * .1, spot); ell(x - r * .25, y + r * .4, r * .1, r * .08, spot); ell(x + r * .3, y - r * .4, r * .08, r * .07, spot); }
  }

  function chicken(x, y, k, scale) {
    const s = scale || 1, b = Math.sin(t * 6 + k * 1.7) * 2.5 * s, face = (k % 2 ? 1 : -1);
    ell(x, y + 15 * s, 14 * s, 4.5 * s, '#276e4250');
    ell(x, y + b, 14 * s, 13 * s, '#fffdf0');
    ell(x - face * 6 * s, y + 2 * s + b, 7 * s, 5 * s, '#ebeddf');
    ell(x + face * 9 * s, y - 8 * s + b, 8 * s, 8 * s, '#fffdf0');
    ell(x + face * 12 * s, y - 10 * s + b, 2 * s, 2.5 * s, '#172b2c');
    poly([[x + face * 15 * s, y - 6 * s + b], [x + face * 23 * s, y - 3 * s + b], [x + face * 15 * s, y]], '#e9a52c');
    ell(x + face * 6 * s, y - 17 * s + b, 3.5 * s, 5 * s, '#e84e49');
    ctx.strokeStyle = '#e9a52c'; ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.moveTo(x - 3 * s, y + 12 * s); ctx.lineTo(x - 3 * s, y + 16 * s); ctx.moveTo(x + 4 * s, y + 12 * s); ctx.lineTo(x + 4 * s, y + 16 * s); ctx.stroke();
  }
  function chick(x, y, s) { ell(x, y, 8 * s, 7 * s, '#ffe45c'); ell(x + 5 * s, y - 6 * s, 5 * s, 5 * s, '#ffe45c'); ell(x + 7 * s, y - 7 * s, 1.2 * s, 1.4 * s, '#222'); poly([[x + 9 * s, y - 5 * s], [x + 13 * s, y - 4 * s], [x + 9 * s, y - 3 * s]], '#f08a24'); }

  // ---------- scenery ----------
  function sky(p) {
    const g = ctx.createLinearGradient(0, 0, 0, 280); g.addColorStop(0, p.sky[0]); g.addColorStop(1, p.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 285);
    if (p === PALETTES[3]) for (let i = 0; i < 40; i++) ell((i * 137) % W, (i * 71) % 200, 1.4, 1.4, `rgba(255,255,255,${.4 + .4 * Math.sin(t * 2 + i)})`);
    ell(660, 74, 54, 54, p.sun + '44'); ell(660, 74, 40, 40, p.sun);
    for (let i = 0; i < 4; i++) {
      const x = (i * 260 + t * 9) % 1060 - 130, y = 70 + (i % 2) * 48;
      ell(x, y, 62, 18, p.cloud); ell(x + 22, y - 12, 38, 22, p.cloud); ell(x - 22, y - 6, 28, 15, p.cloud);
    }
  }
  function ground(p, st) {
    poly([[0, 275], [170, 208], [370, 258], [580, 198], [800, 262], [800, 530], [0, 530]], p.hill);
    for (let i = 0; i < 9; i++) { const x = 30 + i * 95, y = 250 + Math.sin(i * 1.3) * 18; ell(x, y, 16, 22, '#4d9b53'); ell(x, y + 22, 4, 9, '#7a5a3a'); }
    poly([[0, 345], [400, 150], [800, 345], [400, 540]], p.grass, '#438d52');
    poly([[78, 345], [400, 188], [724, 345], [400, 500]], '#c5a474');
    poly([[100, 345], [400, 205], [702, 345], [400, 485]], '#8bd170');
    // crop rows
    for (let i = 0; i < 6; i++) { const x = 240 + i * 52; poly([[x, 252 - i * 9], [x + 24, 240 - i * 9], [x + 30, 248 - i * 9], [x + 6, 260 - i * 9]], i % 2 ? '#71c266' : '#9cdd79'); }
    // road
    poly([[0, 478], [800, 478], [800, 530], [0, 530]], '#7b8a86');
    poly([[0, 478], [800, 478], [800, 484], [0, 484]], '#9aa8a4');
    ctx.fillStyle = '#e8e2c8';
    for (let x = -((t * 60) % 60); x < W; x += 60) ctx.fillRect(x, 506, 30, 4);
    const egg0 = FarmEngine.EGGS[st.tier];
    // barn
    box(322, 216, 142, 116, 66, '#d7544b', '#a63d40', '#f4c9aa');
    poly([[305, 218], [394, 147], [481, 214], [462, 236], [393, 176], [322, 240]], '#a83736');
    poly([[394, 147], [450, 120], [537, 187], [481, 214]], '#d95448');
    box(363, 263, 55, 69, 0, '#653f37', '#653f37', '#653f37');
    poly([[365, 266], [391, 247], [418, 266]], '#f4c98b');
    ctx.strokeStyle = '#f7dfbd'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(365, 267); ctx.lineTo(418, 330); ctx.moveTo(418, 267); ctx.lineTo(365, 330); ctx.stroke();
    box(337, 248, 23, 22, 0, '#c6eced', '#c6eced', '#c6eced');
    // flag shows the current egg
    ctx.fillStyle = '#5d4037'; ctx.fillRect(448, 92, 4, 50);
    const wave = Math.sin(t * 4) * 4;
    poly([[452, 94], [490, 98 + wave], [452, 116]], '#fff');
    egg(466, 104 + wave * .4, 7, egg0.color, egg0.spot);
    // silo
    box(502, 204, 55, 125, 26, '#e5e8df', '#abbcb6', '#fff');
    ell(530, 201, 27, 12, '#c1d3d0');
    poly([[502, 204], [530, 161], [557, 204]], '#b3c2bd');
  }

  function coop(i, type) {
    const [x, y] = COOP_SPOTS[i];
    if (type < 0) { // empty plot
      ctx.globalAlpha = .55;
      poly([[x - 4, y + 30], [x + 34, y + 12], [x + 74, y + 30], [x + 34, y + 48]], '#b89a68');
      ctx.fillStyle = '#5b4a2c'; ctx.font = 'bold 26px system-ui'; ctx.textAlign = 'center'; ctx.fillText('+', x + 34, y + 39); ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
      return;
    }
    const c = COOP_COLORS[type], sc = 1 + type * .07, w = 54 * sc, h = (34 + type * 7) * sc, d = 20 * sc, top = y + 40 - h;
    ell(x + w / 2 + 8, y + 44, w * .75, 10, '#2a5a3540');
    if (type === 7) { // moon dome
      ell(x + w / 2 + 6, y + 38, w * .7, 6, '#8892b0');
      ctx.beginPath(); ctx.ellipse(x + w / 2 + 6, y + 38, w * .7, h * .9, 0, Math.PI, 0); ctx.fillStyle = '#dfe6ff'; ctx.fill();
      ell(x + w / 2 - 6, y + 10, 8, 12, '#ffffffaa');
      ell(x + w / 2 + 6, y + 30, 9, 9, '#5d6a8f');
      return;
    }
    box(x, top, w, h, d, c[0], c[1], c[2]);
    poly([[x - 5, top], [x + w / 2, top - 22 * sc], [x + w + 5, top], [x + w, top + 5], [x + w / 2, top - 14 * sc], [x, top + 5]], c[3]);
    poly([[x + w / 2, top - 22 * sc], [x + w / 2 + d, top - 22 * sc - d * .5], [x + w + d + 5, top - d * .5], [x + w + 5, top]], c[3] + 'cc');
    ell(x + w / 2, y + 40 - 12 * sc, 9 * sc, 12 * sc, '#5e4636');
    if (type >= 4) for (let r = 0; r < Math.min(3, type - 2); r++) box(x + 8, top + 8 + r * 14, 9, 7, 0, '#ffe9a8', '#ffe9a8', '#ffe9a8');
    if (type === 5) { ell(x + 10, top - 4, 16, 8, '#ffffffcc'); ell(x + w - 4, top - 6, 18, 9, '#ffffffcc'); }
    if (type === 6) { box(x - 6, top - 6, 10, h + 6, 4, c[1], c[3], c[2]); box(x + w - 2, top - 6, 10, h + 6, 4, c[1], c[3], c[2]); }
  }

  function truck(x, type, st) {
    const c = TRUCK_COLORS[type], len = 70 + type * 8, y = 470;
    ell(x + len / 2, y + 26, len * .6, 7, '#2229');
    if (type === 5) { // blimp floats above the road
      const by = 420 + Math.sin(t * 2 + x) * 5;
      ell(x + 50, by, 55, 22, '#f5f0e6'); ell(x + 35, by - 6, 18, 6, '#ffffff99');
      poly([[x - 5, by], [x - 18, by - 14], [x - 18, by + 14]], '#d9cdb8');
      box(x + 35, by + 22, 30, 12, 0, '#8a6a4a', '#8a6a4a', '#8a6a4a');
      return;
    }
    if (type >= 6) { // hover craft
      const hy = 452 + Math.sin(t * 3 + x) * 3;
      ell(x + len / 2, hy + 12, len * .55, 9, c);
      ell(x + len / 2, hy + 4, len * .35, 12, '#ffffffcc');
      ell(x + len / 2, hy + 20, len * .4, 3, '#7ff6ffaa');
      return;
    }
    const cab = 34;
    box(x, y - 34, len - cab, 32, 10, c, shade(c), '#ffffff88');
    box(x + len - cab, y - 22, cab, 20, 8, '#eef4f2', '#b5cfc6', '#fff');
    box(x + len - cab + 8, y - 19, 16, 9, 0, '#6ba9bb', '#6ba9bb', '#6ba9bb');
    const e = FarmEngine.EGGS[st.tier];
    egg(x + (len - cab) / 2, y - 18, 8, e.color, e.spot);
    for (const wx of [x + 14, x + len - 14]) { ell(wx, y + 2, 9, 9, '#303b40'); ell(wx, y + 2, 4, 4, '#d6d8d2'); }
    if (type >= 3) ell(x + len * .35, y + 2, 9, 9, '#303b40');
  }
  function shade(hex) { // darker side colour
    const n = parseInt(hex.slice(1, 7), 16), f = .72;
    return '#' + [16, 8, 0].map(s => Math.round(((n >> s) & 255) * f).toString(16).padStart(2, '0')).join('');
  }

  function drawDrone(d) {
    const x = d.x, y = d.y + Math.sin(t * 3 + d.phase) * 8;
    ctx.strokeStyle = '#3a4448'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x, y + 22); ctx.stroke();
    box(x - 13, y + 22, 26, 20, 6, '#c9874a', '#9c6533', '#e6a96a');
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.fillText('?', x, y + 38); ctx.textAlign = 'left';
    ell(x, y, 22, 8, '#3a4448'); ell(x, y - 3, 10, 6, '#69c2e8');
    for (const s of [-1, 1]) {
      ctx.strokeStyle = '#3a4448'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s * 26, y - 9); ctx.stroke();
      const w = Math.abs(Math.sin(t * 40 + s)) * 14 + 4;
      ell(x + s * 26, y - 11, w, 2.5, '#2a3236aa');
    }
  }

  // ---------- frame ----------
  function frame(now) {
    const dt = Math.min(.05, (now - lastFrame) / 1000 || .016); lastFrame = now; t += dt;
    const st = getState();
    const p = PALETTES[st.expansions % PALETTES.length];
    ctx.clearRect(0, 0, W, H);
    sky(p); ground(p, st);
    // back coops (behind chickens)
    coop(0, st.coops[0]); coop(3, st.coops[3]);
    // flock
    const c = st.chickens, n = c <= 12 ? Math.ceil(c) : Math.min(40, 12 + Math.floor(Math.log10(c / 12) * 8));
    for (let i = 0; i < n; i++) {
      const x = 215 + ((i * 71) % 380) + Math.sin(t * (.4 + (i % 3) * .2) + i * 3) * 22;
      const y = 345 + ((i * 47) % 108) + Math.cos(t * .6 + i) * 7;
      chicken(x, y, i, .85 + (i % 3) * .08);
    }
    coop(1, st.coops[1]); coop(2, st.coops[2]);
    // chicks running from the barn
    for (let i = chicks.length - 1; i >= 0; i--) {
      const k = chicks[i]; k.life += dt;
      const f = Math.min(1, k.life / .9), hop = Math.abs(Math.sin(f * Math.PI * 3)) * 16;
      chick(390 + (k.tx - 390) * f, 330 + (k.ty - 330) * f - hop, 1.1);
      if (k.life > 1.1) chicks.splice(i, 1);
    }
    // trucks
    const trucks = st.trucks.map((ty, i) => [ty, i]).filter(a => a[0] >= 0);
    trucks.forEach(([ty, i]) => truck(((t * 55 + i * 190) % 1140) - 170, ty, st));
    // drones
    nextDrone -= dt;
    if (nextDrone <= 0 && drones.length < 2 && !document.hidden) {
      const fromLeft = Math.random() < .5;
      drones.push({ x: fromLeft ? -40 : W + 40, y: 90 + Math.random() * 120, vx: (fromLeft ? 1 : -1) * (55 + Math.random() * 35), phase: Math.random() * 6 });
      nextDrone = 14 + Math.random() * 22;
    }
    for (let i = drones.length - 1; i >= 0; i--) { const d = drones[i]; d.x += d.vx * dt; drawDrone(d); if (d.x < -80 || d.x > W + 80) drones.splice(i, 1); }
    // confetti
    for (let i = confetti.length - 1; i >= 0; i--) {
      const q = confetti[i]; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 300 * dt; q.life -= dt;
      ctx.fillStyle = q.c; ctx.fillRect(q.x, q.y, 6, 6);
      if (q.life <= 0) confetti.splice(i, 1);
    }
    // floating text
    ctx.textAlign = 'center';
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; f.life -= dt * 1.2; f.y -= 50 * dt;
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 1.5));
      ctx.font = `900 ${f.size}px system-ui`; ctx.lineWidth = 5; ctx.strokeStyle = '#1d4a35aa';
      ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
      if (f.life <= 0) floats.splice(i, 1);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
    requestAnimationFrame(frame);
  }

  window.FarmScene = {
    PALETTES,
    init(canvas, stateFn, droneHit) {
      ctx = canvas.getContext('2d'); getState = stateFn; onDroneHit = droneHit;
      requestAnimationFrame(frame);
    },
    toCanvas(canvas, clientX, clientY) {
      const b = canvas.getBoundingClientRect();
      return [(clientX - b.left) / b.width * W, (clientY - b.top) / b.height * H];
    },
    // Returns true if a drone was caught at (x, y).
    tap(x, y) {
      for (let i = 0; i < drones.length; i++) {
        const d = drones[i], dy = d.y + Math.sin(t * 3 + d.phase) * 8 + 15;
        if (Math.hypot(x - d.x, y - dy) < 52) {
          drones.splice(i, 1);
          this.burst(d.x, dy, 18);
          if (onDroneHit) onDroneHit(d.x, dy);
          return true;
        }
      }
      return false;
    },
    hatched(count) {
      for (let i = 0; i < Math.min(count, 3) && chicks.length < 14; i++)
        chicks.push({ life: -i * .12, tx: 220 + Math.random() * 360, ty: 360 + Math.random() * 90 });
    },
    float(x, y, text, color, size) { if (floats.length < 30) floats.push({ x, y, text, color: color || '#fff', size: size || 24, life: 1 }); },
    burst(x, y, n) {
      const cols = ['#f3b443', '#ef5a4c', '#5cbd70', '#5aa9d6', '#b98cff', '#fff'];
      for (let i = 0; i < n; i++) confetti.push({ x, y, vx: (Math.random() - .5) * 320, vy: -120 - Math.random() * 220, life: 1 + Math.random() * .6, c: cols[i % cols.length] });
    },
    drawEgg(canvas, e) {
      const c = canvas.getContext('2d'), keep = ctx; ctx = c;
      c.clearRect(0, 0, canvas.width, canvas.height);
      if (e) egg(canvas.width / 2, canvas.height / 2 + 4, canvas.height * .4, e.color, e.spot);
      else { egg(canvas.width / 2, canvas.height / 2 + 4, canvas.height * .4, '#d5dbd8'); c.fillStyle = '#fff'; c.font = '900 30px system-ui'; c.textAlign = 'center'; c.fillText('?', canvas.width / 2, canvas.height / 2 + 14); }
      ctx = keep;
    }
  };
})();
