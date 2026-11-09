/* Farm Empire — sprite catalogue.
 *
 * Every picture in the game is listed here. Each entry has a logical size (w × h, in
 * game pixels), an anchor point (ax, ay as 0–1 fractions) and EITHER:
 *   • draw(ctx)  — a placeholder painter used until real artwork exists, or
 *   • src        — a path to a finished PNG/WebP (e.g. 'art/coop_3.png').
 * If `src` is set, the image is used and `draw` is ignored. Images can be any
 * resolution (2×–3× recommended); they are scaled to w × h automatically.
 * See ART_GUIDE.md for the full list and specs. */
(function () {
  'use strict';
  const E = window.FarmEngine;
  const SPRITES = {};

  // ---------- drawing primitives (placeholder art) ----------
  function kit(ctx) {
    const poly = (pts, fill, stroke, lw) => {
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 3; ctx.stroke(); }
    };
    const ell = (x, y, rx, ry, c) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); };
    const box = (x, y, w, h, d, front, side, top) => {
      poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], front);
      poly([[x + w, y], [x + w + d, y - d * .5], [x + w + d, y + h - d * .5], [x + w, y + h]], side);
      poly([[x, y], [x + d, y - d * .5], [x + w + d, y - d * .5], [x + w, y]], top);
    };
    const egg = (x, y, r, color, spot) => {
      ell(x, y + r * .08, r * .8, r * .98, '#0000001f');
      ell(x, y, r * .78, r, color);
      ell(x + r * .2, y + r * .25, r * .5, r * .65, '#00000014');
      ell(x - r * .25, y - r * .35, r * .2, r * .3, '#ffffffaa');
      if (spot) { ell(x + r * .2, y + r * .1, r * .12, r * .1, spot); ell(x - r * .25, y + r * .4, r * .1, r * .08, spot); ell(x + r * .3, y - r * .4, r * .08, r * .07, spot); }
    };
    return { ctx, poly, ell, box, egg };
  }
  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1, 7), 16);
    return '#' + [16, 8, 0].map(s => Math.min(255, Math.round(((n >> s) & 255) * f)).toString(16).padStart(2, '0')).join('');
  };
  const add = (key, w, h, ax, ay, draw) => (SPRITES[key] = { w, h, ax, ay, draw });

  // ---------- backgrounds (one per farm palette) ----------
  const PALETTES = [
    { sky: ['#8fd6f7', '#cdeeff'], hill: '#8acb80', grass: '#71b865', tree: '#4d9b53', sun: '#fff1a0', cloud: '#ffffff', name: 'Sunny Acres' },
    { sky: ['#ffb27d', '#ffe3b8'], hill: '#9ac77a', grass: '#7ab560', tree: '#5d9a48', sun: '#fff3c9', cloud: '#fff2e4', name: 'Golden Valley' },
    { sky: ['#7fb8e8', '#d4e9ff'], hill: '#a9d48e', grass: '#86c46d', tree: '#5aa35a', sun: '#ffffff', cloud: '#ffffff', name: 'Breezy Highlands' },
    { sky: ['#2c3e74', '#7d8fc6'], hill: '#5f9a6a', grass: '#4f8a5b', tree: '#3d7a4a', sun: '#fff5c2', cloud: '#c9d4f0', name: 'Starlight Fields', night: true }
  ];
  PALETTES.forEach((p, i) => {
    add('sky_' + i, 800, 290, 0, 0, ctx => {
      const g = ctx.createLinearGradient(0, 0, 0, 290); g.addColorStop(0, p.sky[0]); g.addColorStop(1, p.sky[1]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, 800, 290);
      if (p.night) { const k = kit(ctx); for (let j = 0; j < 50; j++) k.ell((j * 137) % 800, (j * 71) % 210, 1.5, 1.5, '#ffffffcc'); }
    });
    add('ground_' + i, 800, 340, 0, 0, ctx => { // drawn from y=190 down; placed at y=190
      const k = kit(ctx); ctx.translate(0, -190);
      k.poly([[0, 275], [170, 208], [370, 258], [580, 198], [800, 262], [800, 530], [0, 530]], p.hill);
      for (let j = 0; j < 9; j++) { const x = 30 + j * 95, y = 250 + Math.sin(j * 1.3) * 18; k.ell(x, y + 22, 4, 9, '#7a5a3a'); k.ell(x, y, 16, 22, p.tree); k.ell(x - 5, y - 7, 6, 8, shade(p.tree, 1.25)); }
      k.poly([[0, 345], [400, 150], [800, 345], [400, 540]], p.grass, shade(p.grass, .7));
      k.poly([[78, 345], [400, 188], [724, 345], [400, 500]], '#c5a474');
      k.poly([[100, 345], [400, 205], [702, 345], [400, 485]], '#8bd170');
      for (let j = 0; j < 6; j++) { const x = 240 + j * 52; k.poly([[x, 252 - j * 9], [x + 24, 240 - j * 9], [x + 30, 248 - j * 9], [x + 6, 260 - j * 9]], j % 2 ? '#71c266' : '#9cdd79'); }
      k.poly([[0, 478], [800, 478], [800, 530], [0, 530]], '#7b8a86');
      k.poly([[0, 478], [800, 478], [800, 484], [0, 484]], '#9aa8a4');
    });
  });

  // ---------- farm buildings ----------
  add('barn', 245, 225, .5, 1, ctx => {
    const k = kit(ctx); ctx.translate(-300, -110);
    k.box(322, 216, 142, 116, 66, '#d7544b', '#a63d40', '#f4c9aa');
    k.poly([[305, 218], [394, 147], [481, 214], [462, 236], [393, 176], [322, 240]], '#a83736');
    k.poly([[394, 147], [450, 120], [537, 187], [481, 214]], '#d95448');
    k.box(363, 263, 55, 69, 0, '#653f37', '#653f37', '#653f37');
    k.poly([[365, 266], [391, 247], [418, 266]], '#f4c98b');
    ctx.strokeStyle = '#f7dfbd'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(365, 267); ctx.lineTo(418, 330); ctx.moveTo(418, 267); ctx.lineTo(365, 330); ctx.stroke();
    k.box(337, 248, 23, 22, 0, '#c6eced', '#c6eced', '#c6eced');
  });
  add('silo', 84, 175, .5, 1, ctx => {
    const k = kit(ctx); ctx.translate(-500, -158);
    k.box(502, 204, 55, 125, 26, '#e5e8df', '#abbcb6', '#fff');
    k.ell(530, 201, 27, 12, '#c1d3d0');
    k.poly([[502, 204], [530, 161], [557, 204]], '#b3c2bd');
  });
  add('flagpole', 8, 56, .5, 1, ctx => { ctx.fillStyle = '#5d4037'; ctx.fillRect(2, 0, 4, 56); kit(ctx).ell(4, 2, 4, 4, '#f3b443'); });
  add('flag', 42, 26, 0, .5, ctx => kit(ctx).poly([[0, 1], [42, 8], [40, 16], [0, 25]], '#ffffff'));

  // Coops: 8 types + empty plot. Anchor is the middle of the coop's ground line.
  const COOP_COLORS = [
    ['#d8b27a', '#a98250', '#f0d3a2', '#8a5a3c'], ['#f0c062', '#b88a3c', '#ffe08f', '#b5543d'],
    ['#d7544b', '#a63d40', '#f4c9aa', '#7e2a2a'], ['#6aa7d8', '#3f78a8', '#bfe0fa', '#2f5a86'],
    ['#c9cfd6', '#8d97a3', '#eef2f6', '#5a6573'], ['#ffffff', '#c8d8e8', '#ffffff', '#9fb4d8'],
    ['#b48ae6', '#7d5bb5', '#e2cdff', '#5a3d8e'], ['#e9ecf5', '#aab3cc', '#ffffff', '#6f7aa0']
  ];
  for (let type = 0; type < 8; type++) {
    const c = COOP_COLORS[type], sc = 1 + type * .07, w = 54 * sc, h = (34 + type * 7) * sc, d = 20 * sc;
    const W = 160, H = 200, x = 30, base = 175, top = base - h;
    add('coop_' + type, W, H, (x + w / 2 + d / 2) / W, base / H, ctx => {
      const k = kit(ctx);
      if (type === 7) {
        const cx = x + w / 2 + 6;
        k.ell(cx, base - 2, w * .7, 6, '#8892b0');
        ctx.beginPath(); ctx.ellipse(cx, base - 2, w * .7, h * .9, 0, Math.PI, 0); ctx.fillStyle = '#dfe6ff'; ctx.fill();
        k.ell(cx - 12, base - 30, 8, 12, '#ffffffaa'); k.ell(cx, base - 10, 9, 9, '#5d6a8f');
        return;
      }
      k.box(x, top, w, h, d, c[0], c[1], c[2]);
      k.poly([[x - 5, top], [x + w / 2, top - 22 * sc], [x + w + 5, top], [x + w, top + 5], [x + w / 2, top - 14 * sc], [x, top + 5]], c[3]);
      k.poly([[x + w / 2, top - 22 * sc], [x + w / 2 + d, top - 22 * sc - d * .5], [x + w + d + 5, top - d * .5], [x + w + 5, top]], shade(c[3], .85));
      k.ell(x + w / 2, base - 12 * sc, 9 * sc, 12 * sc, '#5e4636');
      if (type >= 4) for (let r = 0; r < Math.min(3, type - 2); r++) k.box(x + 8, top + 8 + r * 14, 9, 7, 0, '#ffe9a8', '#ffe9a8', '#ffe9a8');
      if (type === 5) { k.ell(x + 10, top - 4, 16, 8, '#ffffffcc'); k.ell(x + w - 4, top - 6, 18, 9, '#ffffffcc'); }
      if (type === 6) { k.box(x - 6, top - 6, 10, h + 6, 4, c[1], c[3], c[2]); k.box(x + w - 2, top - 6, 10, h + 6, 4, c[1], c[3], c[2]); }
    });
  }
  add('coop_empty', 90, 50, .5, .6, ctx => {
    const k = kit(ctx);
    k.poly([[6, 30], [45, 10], [84, 30], [45, 48]], '#b89a68');
    ctx.fillStyle = '#5b4a2c'; ctx.font = 'bold 26px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('+', 45, 39);
  });

  // Vehicles: 8 types. Anchor = middle of the ground under the vehicle.
  const TRUCK_COLORS = ['#e9734b', '#5aa9d6', '#f3bf45', '#4fae6d', '#c75f9e', '#f6f1e6', '#8a7dff', '#ff9b2f'];
  for (let type = 0; type < 8; type++) {
    const c = TRUCK_COLORS[type], len = 70 + type * 8, W = 170, H = 120, ox = 15, road = 88;
    add('truck_' + type, W, H, (ox + len / 2) / W, (road + 14) / H, ctx => {
      const k = kit(ctx); const x = ox, y = road;
      if (type === 5) { // blimp
        const by = y - 48;
        k.ell(x + 50, by, 55, 22, '#f5f0e6'); k.ell(x + 35, by - 6, 18, 6, '#ffffff99');
        k.poly([[x - 5, by], [x - 15, by - 14], [x - 15, by + 14]], '#d9cdb8');
        ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 40, by + 20); ctx.lineTo(x + 40, by + 28); ctx.moveTo(x + 60, by + 20); ctx.lineTo(x + 60, by + 28); ctx.stroke();
        k.box(x + 35, by + 28, 30, 14, 0, '#8a6a4a', '#8a6a4a', '#8a6a4a');
        return;
      }
      if (type >= 6) { // hover craft
        const hy = y - 14;
        k.ell(x + len / 2, hy + 12, len * .55, 10, c);
        k.ell(x + len / 2, hy + 2, len * .35, 13, '#ffffffcc');
        k.ell(x + len / 2, hy + 21, len * .4, 3, '#7ff6ffaa');
        return;
      }
      const cab = 34;
      k.box(x, y - 34, len - cab, 32, 10, c, shade(c, .72), '#ffffff88');
      k.box(x + len - cab, y - 22, cab, 20, 8, '#eef4f2', '#b5cfc6', '#fff');
      k.box(x + len - cab + 8, y - 19, 16, 9, 0, '#6ba9bb', '#6ba9bb', '#6ba9bb');
      k.egg(x + (len - cab) / 2, y - 18, 8, '#fff6e4');
      for (const wx of [x + 14, x + len - 14].concat(type >= 3 ? [x + len * .35] : [])) { k.ell(wx, y + 2, 9, 9, '#303b40'); k.ell(wx, y + 2, 4, 4, '#d6d8d2'); }
    });
  }

  // ---------- animals ----------
  add('chicken', 60, 52, .45, .92, ctx => { // faces right; flip scale.x to face left
    const k = kit(ctx), x = 27, y = 30;
    k.ell(x, y, 14, 13, '#fffdf0');
    k.ell(x - 6, y + 2, 7, 5, '#ebeddf');
    k.ell(x + 9, y - 8, 8, 8, '#fffdf0');
    k.ell(x + 12, y - 10, 2, 2.5, '#172b2c');
    k.poly([[x + 15, y - 6], [x + 23, y - 3], [x + 15, y]], '#e9a52c');
    k.ell(x + 6, y - 17, 3.5, 5, '#e84e49');
    k.ell(x + 13, y - 1, 2, 3, '#e84e49');
    ctx.strokeStyle = '#e9a52c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 3, y + 12); ctx.lineTo(x - 3, y + 17); ctx.moveTo(x + 4, y + 12); ctx.lineTo(x + 4, y + 17); ctx.stroke();
  });
  add('chick', 32, 28, .45, .9, ctx => {
    const k = kit(ctx), x = 13, y = 17;
    k.ell(x, y, 9, 8, '#ffe45c'); k.ell(x + 6, y - 7, 6, 6, '#ffe45c'); k.ell(x - 3, y + 1, 4, 3, '#f5d23f');
    k.ell(x + 8, y - 8, 1.4, 1.6, '#222'); k.poly([[x + 11, y - 6], [x + 16, y - 5], [x + 11, y - 3]], '#f08a24');
  });
  add('shadow', 40, 12, .5, .5, ctx => kit(ctx).ell(20, 6, 19, 5.5, '#1f4d2d55'));

  // ---------- eggs ----------
  E.EGGS.forEach((e, i) => add('egg_' + i, 40, 48, .5, .55, ctx => kit(ctx).egg(20, 25, 21, e.color, e.spot)));
  add('egg_unknown', 40, 48, .5, .55, ctx => {
    kit(ctx).egg(20, 25, 21, '#d5dbd8');
    ctx.fillStyle = '#fff'; ctx.font = '900 22px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', 20, 33);
  });
  add('shell_top', 32, 22, .5, .9, ctx => kit(ctx).poly([[2, 21], [4, 10], [16, 1], [28, 10], [30, 21], [25, 15], [20, 21], [15, 14], [10, 21], [6, 15]], '#ffffff', '#e2d9c5', 1.5));
  add('shell_bottom', 32, 22, .5, .2, ctx => kit(ctx).poly([[2, 1], [6, 7], [10, 1], [15, 8], [20, 1], [25, 7], [30, 1], [28, 13], [16, 21], [4, 13]], '#ffffff', '#e2d9c5', 1.5));

  // ---------- drone ----------
  add('drone', 84, 34, .5, .45, ctx => {
    const k = kit(ctx), x = 42, y = 17;
    ctx.strokeStyle = '#3a4448'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 26, y - 6); ctx.lineTo(x + 26, y - 6); ctx.stroke();
    k.ell(x, y, 22, 9, '#3a4448'); k.ell(x, y - 3, 11, 6, '#69c2e8'); k.ell(x - 4, y - 5, 4, 2, '#ffffffaa');
    k.ell(x - 26, y - 6, 3, 3, '#3a4448'); k.ell(x + 26, y - 6, 3, 3, '#3a4448');
    k.ell(x - 14, y + 5, 3, 2, '#ef5a4c'); k.ell(x + 14, y + 5, 3, 2, '#5cbd70');
  });
  add('propeller', 32, 6, .5, .5, ctx => kit(ctx).ell(16, 3, 15, 2.6, '#2a3236cc'));
  add('crate', 34, 32, .5, 0, ctx => {
    const k = kit(ctx); k.box(4, 8, 24, 22, 6, '#c9874a', '#9c6533', '#e6a96a');
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', 16, 26);
  });

  // ---------- sky ----------
  add('cloud', 150, 56, .5, .5, ctx => { const k = kit(ctx); k.ell(75, 36, 62, 18, '#fff'); k.ell(97, 24, 38, 22, '#fff'); k.ell(53, 30, 28, 15, '#fff'); });
  add('sun', 110, 110, .5, .5, ctx => { const k = kit(ctx); k.ell(55, 55, 54, 54, '#ffffff33'); k.ell(55, 55, 40, 40, '#fff4b0'); k.ell(48, 47, 12, 12, '#ffffff88'); });
  add('rays', 220, 220, .5, .5, ctx => {
    ctx.translate(110, 110);
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      const g = ctx.createLinearGradient(0, 0, 0, -110); g.addColorStop(0, '#ffffff88'); g.addColorStop(1, '#ffffff00');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-12, -110); ctx.lineTo(12, -110); ctx.fill();
    }
  });

  // ---------- effects & pickups ----------
  add('coin', 32, 32, .5, .5, ctx => {
    const k = kit(ctx); k.ell(16, 17, 14, 14, '#c98a12'); k.ell(16, 15, 14, 14, '#ffd04a'); k.ell(16, 15, 10, 10, '#f3b443');
    ctx.fillStyle = '#fff3c2'; ctx.font = '900 13px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('$', 16, 20);
    k.ell(11, 10, 3, 2, '#ffffffcc');
  });
  add('gem', 30, 32, .5, .5, ctx => {
    const k = kit(ctx);
    k.poly([[15, 30], [2, 12], [8, 4], [22, 4], [28, 12]], '#3d8fd6');
    k.poly([[2, 12], [28, 12], [22, 4], [8, 4]], '#7cc4ff'); k.poly([[15, 30], [9, 12], [21, 12]], '#5aaaf0');
    k.ell(10, 8, 2.5, 1.5, '#ffffffcc');
  });
  add('star', 30, 30, .5, .5, ctx => {
    ctx.translate(15, 15); ctx.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 6 : 14, a = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fillStyle = '#ffe066'; ctx.fill(); ctx.strokeStyle = '#f3b443'; ctx.lineWidth = 2; ctx.stroke();
  });
  add('puff', 48, 48, .5, .5, ctx => {
    const g = ctx.createRadialGradient(24, 24, 2, 24, 24, 24); g.addColorStop(0, '#ffffffee'); g.addColorStop(.6, '#ffffff99'); g.addColorStop(1, '#ffffff00');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 48, 48);
  });
  add('spark', 16, 16, .5, .5, ctx => {
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#ffffff00');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16);
  });
  add('arrow', 26, 30, .5, 1, ctx => {
    const k = kit(ctx);
    k.poly([[13, 1], [25, 14], [18, 14], [18, 29], [8, 29], [8, 14], [1, 14]], '#5cbd70', '#2f7d45', 2);
  });
  add('confetti', 8, 5, .5, .5, ctx => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 8, 5); });

  // ---------- helpers ----------
  const SCALE = 2; // placeholder art is painted at 2× for sharp phones
  function paint(key, scale) {
    const s = SPRITES[key], c = document.createElement('canvas');
    scale = scale || SCALE;
    c.width = Math.ceil(s.w * scale); c.height = Math.ceil(s.h * scale);
    const ctx = c.getContext('2d'); ctx.scale(scale, scale); s.draw(ctx);
    return c;
  }
  const urlCache = {};
  function dataURL(key) { return urlCache[key] || (urlCache[key] = SPRITES[key].src || paint(key).toDataURL()); }
  // Draw a sprite into an existing 2D canvas (used by the "next egg" preview).
  function drawInto(canvas, key) {
    const s = SPRITES[key], ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const k = Math.min(canvas.width / s.w, canvas.height / s.h) * .95;
    const img = s.src ? Object.assign(new Image(), { src: s.src }) : paint(key, k * 2);
    const draw = () => ctx.drawImage(img, (canvas.width - s.w * k) / 2, (canvas.height - s.h * k) / 2, s.w * k, s.h * k);
    if (img.complete === false) img.onload = draw; else draw();
  }

  window.FarmArt = { SPRITES, PALETTES, SCALE, paint, dataURL, drawInto };
})();
