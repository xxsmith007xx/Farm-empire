/* Farm Empire — animated farm scene, rendered with PixiJS (WebGL, canvas fallback).
 * Logical size is 800×530; everything is drawn from sprites listed in js/art.js. */
(function () {
  'use strict';
  const W = 800, H = 530;
  const A = window.FarmArt, E = window.FarmEngine;
  const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const sound = (name, o) => window.FarmAudio && window.FarmAudio.play(name, o);
  const hex = c => parseInt(c.replace('#', '').slice(0, 6), 16);

  let app, getState, onDroneHit, ready = false, t = 0;
  let root, world, roadLayer, skyLayer, fxLayer, dashes, sky, ground, sun, rays, barn, flag, flagEgg;
  const clouds = [], chickens = [], hatches = [], coops = [], trucks = [], drones = [], parts = [], texts = [];
  let nextDrone = 6, layTimer = 1, spawnCooldown = 0, shakeAmt = 0, paletteIdx = -1, tierShown = -1;

  // ---------- tiny tween engine ----------
  const Ease = {
    linear: k => k,
    outQuad: k => k * (2 - k),
    inQuad: k => k * k,
    inOutSine: k => -(Math.cos(Math.PI * k) - 1) / 2,
    outBack: k => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
    outElastic: k => k === 0 || k === 1 ? k : Math.pow(2, -10 * k) * Math.sin((k * 10 - .75) * (2 * Math.PI) / 3) + 1
  };
  const anims = [];
  // Run fn(k) with k going 0→1 over `dur` seconds (after `delay`), then call done().
  function anim(dur, fn, opts) {
    opts = opts || {};
    const a = { t: -(opts.delay || 0), dur, fn, ease: Ease[opts.ease || 'outQuad'], done: opts.done, owner: opts.owner };
    anims.push(a); return a;
  }
  // Tween numeric properties. 'sx'/'sy' are scale multipliers on top of the sprite's base scale.
  function to(obj, props, dur, ease, opts) {
    let from = null;
    return anim(dur, k => {
      if (obj.destroyed) return;
      if (!from) { from = {}; for (const p in props) from[p] = getP(obj, p); }
      for (const p in props) setP(obj, p, from[p] + (props[p] - from[p]) * k);
    }, Object.assign({ ease, owner: obj }, opts));
  }
  const getP = (o, p) => p === 'sx' ? (o.sx === undefined ? 1 : o.sx) : p === 'sy' ? (o.sy === undefined ? 1 : o.sy) : o[p];
  function setP(o, p, v) { if (p === 'sx' || p === 'sy') { o[p] = v; applyScale(o); } else o[p] = v; }
  function applyScale(o) { const b = o.base || 1; o.scale.set(b * (o.sx === undefined ? 1 : o.sx) * (o.flip || 1), b * (o.sy === undefined ? 1 : o.sy)); }
  function stepAnims(dt) {
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i];
      if (a.owner && a.owner.destroyed) { anims.splice(i, 1); continue; }
      a.t += dt;
      if (a.t < 0) continue;
      const k = Math.min(1, a.t / a.dur);
      a.fn(a.ease(k));
      if (k >= 1) { anims.splice(i, 1); if (a.done) a.done(); }
    }
  }

  // ---------- textures & sprites ----------
  const tex = {}, loaded = {};
  function texture(key) {
    if (tex[key]) return tex[key];
    tex[key] = loaded[key] || PIXI.Texture.from(A.paint(key), { resolution: A.SCALE });
    return tex[key];
  }
  function sprite(key, parent) {
    const s = A.SPRITES[key], sp = new PIXI.Sprite(texture(key));
    sp.anchor.set(s.ax, s.ay);
    sp.base = s.w / sp.texture.width; sp.sx = 1; sp.sy = 1; sp.flip = 1;
    applyScale(sp);
    if (parent) parent.addChild(sp);
    return sp;
  }
  function setTexture(sp, key) {
    const s = A.SPRITES[key];
    sp.texture = texture(key); sp.anchor.set(s.ax, s.ay); sp.base = s.w / sp.texture.width; applyScale(sp);
  }
  function kill(o) { if (o && !o.destroyed) o.destroy(); }

  // ---------- particles ----------
  function particle(key, x, y, o) {
    if (parts.length > 260) return null;
    const sp = sprite(key, o.layer || fxLayer);
    sp.position.set(x, y);
    if (o.tint) sp.tint = o.tint;
    if (o.zIndex !== undefined) sp.zIndex = o.zIndex;
    const p = Object.assign({ sp, vx: 0, vy: 0, g: 0, drag: 0, life: 1, spin: 0, grow: 0, size: 1, flutter: 0, fadeIn: 0 }, o);
    p.max = p.life; sp.sx = sp.sy = p.size; applyScale(sp);
    parts.push(p);
    return p;
  }
  function stepParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i], sp = p.sp;
      p.life -= dt;
      if (p.life <= 0 || sp.destroyed) { kill(sp); parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt;
      sp.x += p.vx * dt; sp.y += p.vy * dt; sp.rotation += p.spin * dt;
      const k = p.life / p.max;
      sp.alpha = Math.min(1, k * 2.5) * (p.fadeIn ? Math.min(1, (1 - k) * p.max / p.fadeIn) : 1);
      sp.sx = p.size + p.grow * (1 - k); sp.sy = sp.sx * (p.flutter ? Math.cos(t * p.flutter + i) : 1);
      applyScale(sp);
    }
  }
  const CONFETTI = ['#f3b443', '#ef5a4c', '#5cbd70', '#5aa9d6', '#b98cff', '#ffffff', '#ff8fc7'].map(hex);
  function confetti(x, y, n, spread) {
    n = REDUCED ? Math.ceil(n / 4) : n;
    for (let i = 0; i < n; i++) particle('confetti', x + rand(-spread || 0, spread || 0), y, {
      vx: rand(-260, 260), vy: rand(-420, -140), g: 520, drag: 1.2, life: rand(1.2, 2), spin: rand(-12, 12),
      tint: CONFETTI[i % CONFETTI.length], size: rand(.8, 1.3), flutter: rand(8, 16)
    });
  }
  function stars(x, y, n, layer) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-.3, .3), sp = rand(120, 220);
      particle('star', x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, g: 300, drag: 2, life: rand(.6, .9), spin: rand(-6, 6), size: rand(.5, .9), layer });
    }
  }
  function dust(x, y, n, tint) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      particle('puff', x + Math.cos(a) * 20, y + Math.sin(a) * 6, { vx: Math.cos(a) * 90, vy: Math.sin(a) * 25 - 10, drag: 3, life: .7, size: .6, grow: .9, tint: tint || 0xe8d9b8 });
    }
  }
  function floatText(x, y, str, color, size) {
    if (texts.length > 24) return;
    const tx = new PIXI.Text(str, { fontFamily: 'system-ui,-apple-system,Segoe UI,sans-serif', fontSize: size || 24, fontWeight: '900', fill: color || '#ffffff', stroke: '#1d4a35', strokeThickness: 5, lineJoin: 'round' });
    tx.anchor.set(.5); tx.position.set(x, y); tx.base = 1; tx.sx = tx.sy = .4; applyScale(tx);
    fxLayer.addChild(tx); texts.push(tx);
    to(tx, { sx: 1, sy: 1 }, .25, 'outBack');
    to(tx, { y: y - 60 }, 1.1, 'outQuad');
    anim(.4, k => { tx.alpha = 1 - k; }, { delay: .7, owner: tx, done: () => { texts.splice(texts.indexOf(tx), 1); kill(tx); } });
  }

  // ---------- scenery ----------
  function buildScene() {
    root = new PIXI.Container(); app.stage.addChild(root);
    sky = sprite('sky_0', root);
    const sunBox = new PIXI.Container(); sunBox.position.set(660, 74); root.addChild(sunBox);
    rays = sprite('rays', sunBox); rays.alpha = .55; sun = sprite('sun', sunBox);
    for (let i = 0; i < 5; i++) { const c = sprite('cloud', root); c.position.set(i * 210 - 60, 60 + (i % 3) * 38); c.speed = rand(6, 14); c.sx = c.sy = rand(.7, 1.1); applyScale(c); c.alpha = .85; clouds.push(c); }
    ground = sprite('ground_0', root); ground.position.set(0, 190);
    dashes = new PIXI.Graphics(); dashes.beginFill(0xe8e2c8);
    for (let x = 0; x < W + 120; x += 60) dashes.drawRect(x, 506, 30, 4);
    dashes.endFill(); root.addChild(dashes);
    world = new PIXI.Container(); world.sortableChildren = true; root.addChild(world);
    barn = sprite('barn', world); barn.position.set(422, 335); barn.zIndex = 334;
    const silo = sprite('silo', world); silo.position.set(542, 333); silo.zIndex = 330;
    const pole = sprite('flagpole', world); pole.position.set(450, 142); pole.zIndex = 140;
    flag = sprite('flag', world); flag.position.set(452, 101); flag.zIndex = 141;
    flagEgg = sprite('egg_0', world); flagEgg.position.set(468, 101); flagEgg.zIndex = 142; flagEgg.sx = flagEgg.sy = .32; applyScale(flagEgg);
    COOP_GROUND.forEach((g, i) => {
      const sp = sprite('coop_empty', world); sp.position.set(g[0], g[1]); sp.zIndex = g[1]; sp.type = -1;
      const arrow = sprite('arrow', world); arrow.visible = false; arrow.zIndex = 900;
      coops.push({ sp, arrow, g });
    });
    roadLayer = new PIXI.Container(); root.addChild(roadLayer);
    skyLayer = new PIXI.Container(); root.addChild(skyLayer);
    fxLayer = new PIXI.Container(); root.addChild(fxLayer);
  }
  const COOP_GROUND = [[132, 340], [228, 428], [585, 432], [692, 342]];

  // ---------- chickens ----------
  // Field area where chickens wander (inside the fenced diamond, in front of the barn).
  function fieldPoint() {
    for (let i = 0; i < 30; i++) {
      const x = rand(140, 660), y = rand(352, 468);
      if (Math.abs(x - 400) / 300 + Math.abs(y - 345) / 140 < .86) return [x, y];
    }
    return [400, 420];
  }
  function addChicken(x, y, pop) {
    const shadow = sprite('shadow', world), sp = sprite('chicken', world);
    const c = { sp, shadow, x, y, tx: x, ty: y, state: 'idle', timer: rand(.2, 2.5), phase: 0, seed: rand(0, 6) };
    sp.flip = Math.random() < .5 ? -1 : 1; sp.sx = sp.sy = rand(.85, 1.05); c.size = sp.sx;
    if (pop) { sp.sx = sp.sy = .2; c.popUntil = t + .6; to(sp, { sx: c.size, sy: c.size }, .6, 'outElastic'); }
    applyScale(sp); chickens.push(c); placeChicken(c, 0);
    return c;
  }
  function removeChicken() {
    const c = chickens.pop(); if (!c) return;
    to(c.sp, { sx: 0, sy: 0 }, .3, 'inQuad', { done: () => { kill(c.sp); kill(c.shadow); } });
    c.shadow.alpha = 0;
  }
  function placeChicken(c, hop) {
    c.sp.position.set(c.x, c.y - hop); c.sp.zIndex = c.y;
    c.shadow.position.set(c.x, c.y); c.shadow.zIndex = c.y - 1;
    c.shadow.sx = c.shadow.sy = .9 - hop / 30; applyScale(c.shadow);
  }
  function stepChicken(c, dt) {
    const sp = c.sp;
    if (sp.destroyed) return;
    let hop = 0, sx = 1, sy = 1, rot = 0;
    c.timer -= dt;
    if (c.state === 'walk') {
      c.phase += dt * 10;
      const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy), step = 48 * dt;
      if (d <= step) { c.x = c.tx; c.y = c.ty; c.state = 'idle'; c.timer = rand(.6, 3); }
      else { c.x += dx / d * step; c.y += dy / d * step; }
      const s = Math.abs(Math.sin(c.phase)), g = 1 - s;
      hop = s * 7; sx = 1 + .14 * g - .05 * s; sy = 1 - .16 * g + .07 * s;
    } else if (c.state === 'peck') {
      const k = 1 - c.timer / .7;
      rot = Math.max(0, Math.sin(k * Math.PI * 3)) * .45;
      if (c.timer <= 0) { c.state = 'idle'; c.timer = rand(.5, 2.5); }
    } else {
      sy = 1 + Math.sin(t * 3 + c.seed) * .03;
      if (c.timer <= 0) {
        if (Math.random() < .35) { c.state = 'peck'; c.timer = .7; if (Math.random() < .12) sound('cluck'); }
        else {
          let [x, y] = fieldPoint();
          const d = Math.hypot(x - c.x, y - c.y);
          if (d > 140) { x = c.x + (x - c.x) / d * 140; y = c.y + (y - c.y) / d * 140; }
          c.tx = x; c.ty = y; c.state = 'walk'; c.phase = 0;
          sp.flip = x < c.x ? -1 : 1;
        }
      }
    }
    if (!(c.popUntil > t)) { sp.sx = c.size * sx; sp.sy = c.size * sy; applyScale(sp); }
    sp.rotation = rot * sp.flip;
    placeChicken(c, hop);
  }
  // A chicken lays an egg, which pops and turns into a coin (purely visual).
  function layEgg(tier) {
    const c = chickens[Math.floor(Math.random() * chickens.length)];
    if (!c || c.sp.destroyed) return;
    const egg = sprite('egg_' + tier, world);
    egg.position.set(c.x - 10 * c.sp.flip, c.y - 4); egg.zIndex = c.y + 1; egg.sx = egg.sy = 0; applyScale(egg);
    to(egg, { sx: .42, sy: .42 }, .3, 'outBack');
    anim(.25, () => {}, { delay: .9, owner: egg, done: () => {
      const x = egg.x, y = egg.y; kill(egg);
      particle('coin', x, y - 6, { vy: -110, g: 160, life: .7, size: .55, layer: world, zIndex: 999 });
      particle('spark', x, y - 6, { life: .3, size: 1, grow: 2 });
    } });
  }

  // ---------- hatching: egg at the barn door cracks, chick runs out ----------
  const DOOR = [391, 336];
  function hatchAnim(becomesChicken, quiet) {
    if (hatches.length >= 6) { squash(barn, .05); return false; }
    const st = getState(), h = { chicken: becomesChicken };
    hatches.push(h);
    const egg = sprite('egg_' + st.tier, world);
    egg.position.set(DOOR[0], DOOR[1]); egg.zIndex = 336; egg.sx = egg.sy = 0; applyScale(egg);
    squash(barn, .06);
    to(egg, { sx: .7, sy: .7 }, .2, 'outBack');
    anim(.35, k => { egg.rotation = Math.sin(k * Math.PI * 6) * .3 * (1 - k * .5); }, { delay: .2, owner: egg, ease: 'linear', done: () => {
      const tint = hex(E.EGGS[st.tier].color);
      sound('hatch', { quiet });
      for (const [key, vx, vy, spin] of [['shell_top', -70, -200, -8], ['shell_bottom', 60, -60, 5]])
        particle(key, DOOR[0], DOOR[1] - 4, { vx: vx + rand(-20, 20), vy, g: 600, life: .7, spin, tint, layer: world, zIndex: 340, size: .9 });
      particle('puff', DOOR[0], DOOR[1], { life: .4, size: .5, grow: 1, layer: world, zIndex: 341 });
      kill(egg);
      const chick = sprite('chick', world); chick.position.set(DOOR[0], DOOR[1] + 4); chick.zIndex = 342; chick.sx = chick.sy = .2; applyScale(chick);
      to(chick, { sx: 1, sy: 1 }, .35, 'outBack');
      const [tx, ty] = fieldPoint(), sx0 = DOOR[0], sy0 = DOOR[1] + 4;
      chick.flip = tx < sx0 ? -1 : 1; applyScale(chick);
      anim(.9, k => {
        chick.x = sx0 + (tx - sx0) * k; chick.y = sy0 + (ty - sy0) * k - Math.abs(Math.sin(k * Math.PI * 4)) * 14; chick.zIndex = chick.y + 10;
      }, { delay: .25, ease: 'linear', owner: chick, done: () => {
        hatches.splice(hatches.indexOf(h), 1);
        if (becomesChicken) { addChicken(tx, ty, true); particle('puff', tx, ty - 10, { life: .4, size: .4, grow: .8, layer: world, zIndex: ty + 2 }); }
        to(chick, { sx: 0, sy: 0 }, .2, 'inQuad', { done: () => kill(chick) });
      } });
    } });
    return true;
  }
  function squash(sp, amt) {
    sp.sx = 1 + amt; sp.sy = 1 - amt; applyScale(sp);
    to(sp, { sx: 1, sy: 1 }, .5, 'outElastic');
  }

  // Number of chickens shown for the real flock size.
  const shownFor = c => c <= 12 ? Math.ceil(c) : Math.min(40, 12 + Math.floor(Math.log10(c / 12) * 8));
  // New chickens arrive through the hatch animation; extras pop away (e.g. after a reset).
  function syncFlock(st, dt) {
    const want = shownFor(st.chickens), coming = hatches.filter(h => h.chicken).length;
    spawnCooldown -= dt;
    if (chickens.length > want && coming === 0) { while (chickens.length > want) removeChicken(); }
    else if (chickens.length + coming < want && spawnCooldown <= 0) {
      spawnCooldown = .25;
      if (!hatchAnim(true, true)) addChicken(...fieldPoint(), true);
    }
  }

  // ---------- buildings ----------
  function syncCoops(st) {
    coops.forEach((c, i) => {
      const type = st.coops[i];
      if (c.sp.type !== type) {
        const upgrade = type > c.sp.type;
        setTexture(c.sp, type >= 0 ? 'coop_' + type : 'coop_empty');
        c.sp.type = type;
        if (upgrade && c.initialised) {
          c.sp.sx = 1.35; c.sp.sy = .35; applyScale(c.sp);
          to(c.sp, { sx: 1, sy: 1 }, .9, 'outElastic');
          dust(c.g[0], c.g[1], 10); stars(c.g[0], c.g[1] - 50, 8); shake(4); sound('build');
        }
        c.initialised = true;
      }
      // Pulse empty plots / show an arrow over coops you can afford to build or upgrade
      const affordable = st.coops[i] < E.COOPS.length - 1 && st.coins >= E.coopCost(st, i);
      if (type < 0) { const k = affordable ? 1 + Math.sin(t * 6) * .08 : 1; if (!anims.some(a => a.owner === c.sp)) { c.sp.sx = c.sp.sy = k; applyScale(c.sp); } c.sp.alpha = affordable ? 1 : .6; }
      c.arrow.visible = affordable && type >= 0;
      if (c.arrow.visible) c.arrow.position.set(c.g[0] + 30, c.g[1] - 60 - type * 8 - Math.abs(Math.sin(t * 5)) * 8);
    });
  }
  const truckX = i => ((t * 55 + i * 190) % 1140) - 170;
  function syncTrucks(st, dt) {
    st.trucks.forEach((type, i) => {
      let tr = trucks[i];
      if (type < 0) { if (tr) { kill(tr.sp); trucks[i] = null; } return; }
      const len = 70 + type * 8;
      if (!tr) { tr = trucks[i] = { sp: sprite('truck_' + type, roadLayer), type, puff: 0 }; tr.sp.sx = tr.sp.sy = .2; to(tr.sp, { sx: 1, sy: 1 }, .7, 'outElastic'); }
      else if (tr.type !== type) {
        const up = type > tr.type; setTexture(tr.sp, 'truck_' + type); tr.type = type;
        if (up) { tr.sp.sx = 1.3; tr.sp.sy = .5; applyScale(tr.sp); to(tr.sp, { sx: 1, sy: 1 }, .8, 'outElastic'); stars(tr.sp.x, tr.sp.y - 30, 8); sound('build'); }
      }
      const x = truckX(i) + len / 2, air = type >= 5;
      tr.sp.position.set(x, 482 - (air ? Math.sin(t * 2.5 + i) * 4 : Math.abs(Math.sin(t * 12 + i)) * 1.5));
      tr.puff -= dt;
      if (!air && tr.puff <= 0 && x > -60 && x < W + 60) {
        tr.puff = .22;
        particle('puff', x - len / 2 - 4, 470, { vx: -30, vy: -20, life: .7, size: .25, grow: .5, tint: 0xb9c2bf, layer: roadLayer });
      }
    });
  }

  // ---------- drones ----------
  function spawnDrone() {
    const left = Math.random() < .5, c = new PIXI.Container();
    const rope = new PIXI.Graphics(); c.addChild(rope);
    const crate = sprite('crate', c); crate.position.set(0, 18);
    const body = sprite('drone', c);
    const p1 = sprite('propeller', c), p2 = sprite('propeller', c); p1.position.set(-26, -9); p2.position.set(26, -9);
    rope.lineStyle(2, 0x3a4448).moveTo(0, 0).lineTo(0, 20);
    c.position.set(left ? -50 : W + 50, rand(90, 210));
    skyLayer.addChild(c);
    drones.push({ c, crate, body, p1, p2, rope, vx: (left ? 1 : -1) * rand(55, 90), y0: c.y, phase: rand(0, 6) });
  }
  function stepDrones(dt) {
    nextDrone -= dt;
    if (nextDrone <= 0 && drones.length < 2 && !document.hidden) { spawnDrone(); nextDrone = rand(14, 36); }
    for (let i = drones.length - 1; i >= 0; i--) {
      const d = drones[i];
      d.c.x += d.vx * dt; d.c.y = d.y0 + Math.sin(t * 3 + d.phase) * 8;
      d.c.rotation = Math.sign(d.vx) * .06 + Math.sin(t * 2 + d.phase) * .03;
      d.crate.rotation = Math.sin(t * 3.3 + d.phase) * .18;
      d.p1.scale.x = Math.abs(Math.sin(t * 45)) * .9 + .1; d.p2.scale.x = Math.abs(Math.cos(t * 45)) * .9 + .1;
      if (d.c.x < -90 || d.c.x > W + 90) { kill(d.c); drones.splice(i, 1); }
    }
  }
  function catchDrone(i) {
    const d = drones.splice(i, 1)[0], c = d.c;
    const x = c.x, y = c.y + 34;
    // Crate drops and bursts; drone zips away
    d.crate.visible = false; d.rope.visible = false; sound('whoosh');
    const crate = sprite('crate', fxLayer); crate.position.set(x, y - 16);
    anim(.35, k => { crate.y = y - 16 + k * 30; crate.rotation = k * .6; }, { ease: 'inQuad', owner: crate, done: () => {
      kill(crate); confetti(x, y + 14, 24); stars(x, y + 14, 10); sound('crate');
      particle('puff', x, y + 14, { life: .5, size: .8, grow: 1.4 });
    } });
    to(c, { y: c.y - 220, x: c.x + Math.sign(d.vx) * 160 }, .8, 'inQuad', { done: () => kill(c) });
    return [x, y + 14];
  }

  // ---------- frame ----------
  function shake(n) { if (!REDUCED) shakeAmt = Math.max(shakeAmt, n); }
  function frame() {
    const dt = Math.min(.05, app.ticker.deltaMS / 1000); t += dt;
    const st = getState();
    const pi = st.expansions % A.PALETTES.length;
    if (pi !== paletteIdx) { paletteIdx = pi; setTexture(sky, 'sky_' + pi); setTexture(ground, 'ground_' + pi); if (window.FarmAudio) FarmAudio.setSong(pi); }
    if (tierShown !== st.tier) { tierShown = st.tier; setTexture(flagEgg, 'egg_' + st.tier); }
    rays.rotation += dt * .15; sun.sx = sun.sy = 1 + Math.sin(t * 1.5) * .03; applyScale(sun);
    clouds.forEach(c => { c.x += c.speed * dt; if (c.x > W + 100) c.x = -100; });
    dashes.x = -((t * 60) % 60);
    flag.skew.y = Math.sin(t * 4) * .12; flag.scale.y = flag.base * (1 + Math.sin(t * 4 + 1) * .06);
    flagEgg.y = 101 + Math.sin(t * 4) * 2;
    syncFlock(st, dt); syncCoops(st); syncTrucks(st, dt);
    chickens.forEach(c => stepChicken(c, dt));
    // Visual egg-laying: faster with a bigger, faster-laying flock
    layTimer -= dt;
    if (layTimer <= 0 && chickens.length) {
      const d = E.derived(st);
      layTimer = Math.max(.35, 3.2 / (1 + Math.log10(1 + d.shipped)));
      layEgg(st.tier);
    }
    stepDrones(dt); stepAnims(dt); stepParts(dt);
    if (shakeAmt > .1) { root.position.set(rand(-shakeAmt, shakeAmt), rand(-shakeAmt, shakeAmt)); shakeAmt *= Math.pow(.02, dt); }
    else root.position.set(0, 0);
  }

  async function start(canvas) {
    // Load any finished artwork listed in js/art.js; anything missing falls back to placeholder art.
    const withSrc = Object.keys(A.SPRITES).filter(k => A.SPRITES[k].src);
    await Promise.all(withSrc.map(k => PIXI.Assets.load(A.SPRITES[k].src).then(tx => (loaded[k] = tx)).catch(() => console.warn('Missing art:', A.SPRITES[k].src))));
    app = new PIXI.Application({ view: canvas, width: W, height: H, backgroundAlpha: 0, antialias: true, resolution: Math.min(2, window.devicePixelRatio || 1), autoDensity: false });
    app.stage.eventMode = 'none';
    canvas.style.width = '100%'; canvas.style.height = 'auto';
    buildScene();
    const st = getState();
    for (let i = 0; i < shownFor(st.chickens); i++) addChicken(...fieldPoint(), false);
    ready = true;
    app.ticker.add(frame);
  }

  window.FarmScene = {
    PALETTES: A.PALETTES,
    init(canvas, stateFn, droneHit) {
      getState = stateFn; onDroneHit = droneHit;
      start(canvas).catch(e => { console.error('Farm scene failed to start', e); });
    },
    toCanvas(canvas, clientX, clientY) {
      const b = canvas.getBoundingClientRect();
      return [(clientX - b.left) / b.width * W, (clientY - b.top) / b.height * H];
    },
    toClient(x, y) {
      const b = document.getElementById('farm').getBoundingClientRect();
      return [b.left + x / W * b.width, b.top + y / H * b.height];
    },
    // Returns true if a drone was caught at (x, y).
    tap(x, y) {
      if (!ready) return false;
      for (let i = 0; i < drones.length; i++) {
        const d = drones[i];
        if (Math.hypot(x - d.c.x, y - (d.c.y + 18)) < 55) {
          const [px, py] = catchDrone(i);
          if (onDroneHit) onDroneHit(px, py);
          return true;
        }
      }
      return false;
    },
    hatched() { if (ready && hatches.length < 4) hatchAnim(false); else if (ready) squash(barn, .04); },
    float(x, y, text, color, size) { if (ready) floatText(x, y, text, color, size); },
    burst(x, y, n) { if (ready) confetti(x, y, n); },
    celebrate() {
      if (!ready) return;
      for (let i = 0; i < 5; i++) setTimeout(() => confetti(80 + i * 160, 0, 30, 40), i * 90);
      stars(400, 260, 16); shake(10); squash(barn, .1);
    },
    shake,
    drawEgg(canvas, egg) { const i = E.EGGS.indexOf(egg); A.drawInto(canvas, i >= 0 ? 'egg_' + i : 'egg_unknown'); }
  };
})();
