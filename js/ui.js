/* Farm Empire — UI controller: wires the engine to the DOM and the canvas. */
(function () {
  'use strict';
  const E = window.FarmEngine, S = window.FarmScene, fmt = E.fmt;
  const KEY = 'farm-empire-v3', OLD_KEY = 'sunny-acres-v2';
  const $ = id => document.getElementById(id);

  // ---------- Load ----------
  let s;
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY);
    s = E.load(raw ? JSON.parse(raw) : null);
  } catch (e) { s = E.fresh(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* storage full or blocked */ } };

  // ---------- Sound (tiny WebAudio blips, no assets) ----------
  let audio;
  function beep(freq, dur, type, vol) {
    if (!s.settings.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol || .06, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + dur);
      o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + dur);
    } catch (e) { /* audio unavailable */ }
  }
  const sfx = {
    hatch: () => beep(700 + Math.random() * 300, .08, 'triangle', .04),
    buy: () => { beep(520, .08, 'square', .03); setTimeout(() => beep(780, .1, 'square', .03), 70); },
    coin: () => { beep(988, .08, 'square', .03); setTimeout(() => beep(1319, .15, 'square', .03), 80); },
    big: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, .25, 'triangle', .05), i * 110)),
    no: () => beep(180, .12, 'sawtooth', .03)
  };

  // ---------- Toast & modal ----------
  let toastTimer;
  function toast(text) {
    const el = $('toast'); el.textContent = text; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }
  function modal(title, body, buttons) {
    $('mTitle').textContent = title; $('mBody').innerHTML = body;
    const box = $('mBtns'); box.innerHTML = '';
    (buttons || [{ label: 'OK' }]).forEach(b => {
      const el = document.createElement('button');
      el.className = 'action ' + (b.cls || ''); el.textContent = b.label;
      el.onclick = () => { $('modal').classList.add('hide'); if (b.fn) b.fn(); };
      box.append(el);
    });
    $('modal').classList.remove('hide');
  }
  const confirmModal = (title, body, yes, fn) => modal(title, body, [{ label: 'Cancel', cls: 'alt' }, { label: yes, fn }]);
  const dur = sec => sec >= 3600 ? Math.floor(sec / 3600) + 'h ' + Math.floor(sec % 3600 / 60) + 'm' : sec >= 60 ? Math.floor(sec / 60) + 'm ' + Math.floor(sec % 60) + 's' : Math.ceil(sec) + 's';

  // ---------- Lists (built once, refreshed in place) ----------
  let buyN = 1;
  const rows = { coop: [], truck: [], research: [], perk: [] };
  function makeRow(parent, onBuy) {
    const el = document.createElement('div'); el.className = 'item';
    el.innerHTML = '<div class="ico"></div><div class="info"><b></b><small></small><div class="pips"></div></div><button class="buy"></button>';
    const r = { el, ico: el.children[0], name: el.querySelector('b'), desc: el.querySelector('small'), pips: el.querySelector('.pips'), btn: el.querySelector('button'), key: '' };
    r.btn.onclick = onBuy; parent.append(el); return r;
  }
  const set = (el, prop, v) => { if (el[prop] !== v) el[prop] = v; };
  function pips(r, n, max, on) {
    if (r.pips.childElementCount !== n) r.pips.innerHTML = '<i></i>'.repeat(n);
    for (let i = 0; i < n; i++) r.pips.children[i].classList.toggle('on', i < on);
  }

  function buildLists() {
    for (let i = 0; i < 4; i++) rows.coop.push(makeRow($('coopList'), () => buySlot('coop', i)));
    for (let i = 0; i < 6; i++) rows.truck.push(makeRow($('truckList'), () => buySlot('truck', i)));
    E.RESEARCH.forEach(r => rows.research.push(makeRow($('researchList'), () => {
      const n = E.buyResearch(s, r.id, buyN === 'max' ? Infinity : buyN);
      if (n) { sfx.buy(); toast(r.name + (n > 1 ? ' +' + n + ' levels' : ' upgraded')); refresh(true); }
      else { sfx.no(); toast('Not enough coins'); }
    })));
    E.PERKS.forEach(p => {
      const r = makeRow($('perkList'), () => {
        if (E.buyPerk(s, p.id)) { sfx.buy(); toast(p.name + ' upgraded!'); refresh(true); save(); }
        else { sfx.no(); toast('Not enough gems'); }
      });
      r.btn.classList.add('gem'); rows.perk.push(r);
    });
    $('buyAmount').querySelectorAll('button').forEach(b => b.onclick = () => {
      buyN = b.dataset.n === 'max' ? 'max' : +b.dataset.n;
      $('buyAmount').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      refresh(true);
    });
  }

  function buySlot(kind, i) {
    const list = kind === 'coop' ? E.COOPS : E.TRUCKS, arr = kind === 'coop' ? s.coops : s.trucks;
    if (E.buySlot(s, kind, i)) {
      sfx.buy(); toast((arr[i] === 0 ? 'Built ' : 'Upgraded to ') + list[arr[i]].name + '!');
      S.burst(400, 300, 10); refresh(true); save();
    } else { sfx.no(); toast(arr[i] >= list.length - 1 ? 'Already the best!' : 'Not enough coins'); }
  }

  function refreshSlots(kind) {
    const list = kind === 'coop' ? E.COOPS : E.TRUCKS, arr = kind === 'coop' ? s.coops : s.trucks;
    const factor = kind === 'coop' ? 'chickens' : 'eggs/s';
    rows[kind].forEach((r, i) => {
      const ty = arr[i], next = list[ty + 1], cost = kind === 'coop' ? E.coopCost(s, i) : E.truckCost(s, i);
      set(r.ico, 'textContent', ty >= 0 ? list[ty].icon : list[0].icon);
      r.ico.classList.toggle('empty', ty < 0);
      set(r.name, 'textContent', ty >= 0 ? list[ty].name : 'Empty slot ' + (i + 1));
      set(r.desc, 'textContent', ty >= 0 ? 'Holds ' + fmt(list[ty].cap) + ' ' + factor + (next ? ' → ' + next.name + ' (' + fmt(next.cap) + ')' : ' · fully upgraded') : 'Build a ' + list[0].name + ' (' + fmt(list[0].cap) + ' ' + factor + ')');
      pips(r, list.length, list.length, ty + 1);
      const label = next ? (ty < 0 ? 'Build' : 'Upgrade') + '<small>🪙 ' + fmt(cost) + '</small>' : 'MAX';
      set(r.btn, 'innerHTML', label);
      r.btn.disabled = !next || s.coins < cost;
    });
  }

  function refreshResearch() {
    E.RESEARCH.forEach((def, i) => {
      const r = rows.research[i], lv = s.research[def.id], max = lv >= def.max;
      const bulk = E.researchBulk(s, def, buyN === 'max' ? Infinity : buyN);
      const n = buyN === 'max' ? Math.max(1, bulk.n) : bulk.n, total = buyN === 'max' && bulk.n === 0 ? E.researchCost(s, def) : bulk.total;
      set(r.ico, 'textContent', def.icon);
      set(r.name, 'innerHTML', def.name + ' <span class="muted">' + lv + '/' + def.max + '</span>');
      set(r.desc, 'textContent', def.desc);
      pips(r, Math.min(def.max, 10), def.max, Math.round(lv / def.max * Math.min(def.max, 10)));
      set(r.btn, 'innerHTML', max ? 'MAX' : (n > 1 ? '+' + n + ' ' : '') + '<small>🪙 ' + fmt(total) + '</small>');
      r.btn.disabled = max || s.coins < total;
    });
  }

  function refreshPerks() {
    E.PERKS.forEach((p, i) => {
      const r = rows.perk[i], lv = s.perks[p.id], max = lv >= p.max, cost = E.perkCost(s, p);
      set(r.ico, 'textContent', p.icon);
      set(r.name, 'innerHTML', p.name + ' <span class="muted">' + lv + '/' + p.max + '</span>');
      set(r.desc, 'textContent', p.desc);
      pips(r, Math.min(p.max, 10), p.max, Math.round(lv / p.max * Math.min(p.max, 10)));
      set(r.btn, 'innerHTML', max ? 'MAX' : '<small>💎 ' + cost + '</small>');
      r.btn.disabled = max || s.gems < cost;
    });
  }

  function refreshMore() {
    const done = E.ACHIEVEMENTS.filter(a => s.achievements[a.id]).length;
    $('achCount').textContent = done + ' / ' + E.ACHIEVEMENTS.length;
    const key = done + ':' + E.ACHIEVEMENTS.length;
    if ($('achList').dataset.key !== key) {
      $('achList').dataset.key = key;
      $('achList').innerHTML = E.ACHIEVEMENTS.map(a => `<div class="ach ${s.achievements[a.id] ? 'done' : ''}"><b>${a.icon} ${a.name}</b><span>${a.desc} · 💎${a.gems}</span></div>`).join('');
    }
    const st = s.stats, days = Math.floor((Date.now() - s.created) / 864e5);
    $('statList').innerHTML = [
      ['Lifetime coins', fmt(s.lifetime)], ['Best income', fmt(st.maxIncome) + '/s'], ['Most chickens', fmt(st.maxChickens)],
      ['Chickens hatched', fmt(st.hatched)], ['Drones caught', fmt(st.drones)], ['Gifts opened', fmt(st.gifts)],
      ['Best egg', E.EGGS[s.bestTier].name], ['Expansions', s.expansions], ['Farm age', days + ' day' + (days === 1 ? '' : 's')]
    ].map(([a, b]) => `<span>${a}</span><span>${b}</span>`).join('');
    $('soundBtn').textContent = s.settings.sound ? '🔊 Sound on' : '🔈 Sound off';
  }

  // ---------- Main refresh ----------
  let tab = 'farm', lastTier = '';
  function refresh(force) {
    const d = E.derived(s), egg = E.EGGS[s.tier], next = E.EGGS[s.tier + 1];
    $('coins').textContent = fmt(s.coins);
    $('rate').textContent = fmt(d.income);
    $('chickens').textContent = fmt(s.chickens);
    $('gems').textContent = '💎 ' + fmt(s.gems);
    $('farmName').textContent = S.PALETTES[s.expansions % S.PALETTES.length].name + (s.expansions ? ' · Farm #' + (s.expansions + 1) : '');
    const eggKey = s.tier + ':' + E.canDiscover(s);
    if (lastTier !== eggKey) {
      lastTier = eggKey;
      $('eggName').textContent = egg.name;
      $('eggDot').style.background = egg.color;
      // Keep the next egg a mystery until it can be discovered
      S.drawEgg($('nextEggCanvas'), next ? (E.canDiscover(s) ? next : null) : egg);
    }
    // boost
    const bb = $('boostBar');
    bb.classList.toggle('hide', !(s.boostLeft > 0));
    if (s.boostLeft > 0) bb.textContent = '⚡ ×' + s.boostMult + ' income boost · ' + dur(s.boostLeft) + ' left';

    if (tab === 'farm' || force) {
      $('tankText').textContent = Math.floor(s.tank) + ' / ' + Math.floor(d.tankMax) + (d.batch > 1 ? ' · ' + fmt(d.batch) + ' per hatch' : '');
      $('tankBar').style.width = (s.tank / d.tankMax * 100) + '%';
      $('capText').textContent = fmt(s.chickens) + ' / ' + fmt(d.cap);
      $('capBar').style.width = Math.min(100, s.chickens / d.cap * 100) + '%';
      $('autoText').textContent = d.auto > 0 ? '🤖 Auto Hatchery: +' + fmt(d.auto * 60) + ' chickens/min' : '🔄 Hatchery refills ' + fmt(d.refill) + ' per second';
      $('hatchBtn').classList.toggle('empty', s.tank < 1 || s.chickens >= d.cap);
      $('laidText').textContent = fmt(d.laid);
      $('shipText').textContent = fmt(d.ship);
      $('valueText').textContent = fmt(d.value * d.mult);
      $('shipBox').classList.toggle('limit', d.bottleneck === 'ship');
      const bn = $('bottleneck');
      bn.classList.toggle('hide', !d.bottleneck);
      if (d.bottleneck === 'ship') bn.textContent = '🚚 Your trucks can\'t keep up: ' + fmt(d.laid - d.ship) + ' eggs/s are going to waste. Upgrade your fleet in Build!';
      else if (d.bottleneck === 'cap') bn.textContent = '🏠 Your coops are full! Build or upgrade coops to fit more chickens.';
      $('rushBtn').disabled = s.rushCooldown > 0;
      $('rushBtn').textContent = s.rushCooldown > 0 ? '🚚 Ready in ' + dur(s.rushCooldown) : '🚚 Rush hour ×' + E.RUSH.mult;
      $('feastBtn').disabled = s.gems < E.FEAST.gems;
      $('feastBtn').textContent = '🌽 Feed ×' + E.FEAST.mult + ' · 💎' + E.FEAST.gems;
      $('boostHelp').textContent = 'Rush hour: ×' + E.RUSH.mult + ' income for ' + E.RUSH.duration + 's (free, every ' + E.RUSH.cooldown / 60 + ' min). Golden feed: ×' + E.FEAST.mult + ' for ' + E.FEAST.duration / 60 + ' min.';
      if (next) {
        const need = E.unlockCost(s.tier), pct = Math.min(100, s.tierEarned / need * 100);
        $('nextEggName').textContent = E.canDiscover(s) ? next.name : '???';
        $('nextEggDesc').textContent = E.canDiscover(s) ? next.desc + ' Worth ' + fmt(next.value / egg.value) + '× more!' : 'Earn coins with your ' + egg.name + 's to discover a new variety.';
        $('eggBar').style.width = pct + '%';
        $('eggProgress').textContent = fmt(s.tierEarned) + ' / ' + fmt(need) + ' coins earned (' + Math.floor(pct) + '%)';
        $('discoverBtn').disabled = !E.canDiscover(s);
        $('discoverBtn').textContent = E.canDiscover(s) ? '🥚 Discover the ' + next.name + '!' : '🔒 Keep earning to discover';
      } else {
        $('nextEggName').textContent = '';
        $('nextEggDesc').textContent = 'You produce the legendary Star Egg! Expand your farm in Legacy to earn Golden Seeds and go even further.';
        $('eggBar').style.width = '100%';
        $('eggProgress').textContent = 'All eggs discovered ⭐';
        $('discoverBtn').disabled = true; $('discoverBtn').textContent = '⭐ Every egg discovered';
      }
    }
    if (tab === 'build' || force) { refreshSlots('coop'); refreshSlots('truck'); $('coopSum').textContent = fmt(d.cap) + ' chickens'; $('truckSum').textContent = fmt(d.ship) + ' eggs/s'; }
    if (tab === 'research' || force) refreshResearch();
    if (tab === 'legacy' || force) {
      const r = E.prestigeReward(s);
      $('seeds').textContent = fmt(s.seeds) + ' 🌟';
      $('multiplier').textContent = 'Income bonus: ×' + fmt(d.mult);
      $('seedReward').textContent = '+' + fmt(r);
      $('prestigeBtn').disabled = r < 1;
      $('prestigeBtn').textContent = r < 1 ? '🔒 Earn more to expand' : '🌟 Expand farm (+' + fmt(r) + ' seeds)';
      const nextSeed = 1e7 * Math.pow(r + 1, 4);
      $('prestigeHint').textContent = r < 1 ? 'Seeds are earned from total coins since your last expansion. First seed at ' + fmt(1e7) + ' coins (' + fmt(s.farmEarned) + ' so far). Discovering better eggs gets you there much faster.' : 'Next seed at ' + fmt(nextSeed) + ' coins earned. Tip: expanding when you would at least double your seeds is a strong move.';
      refreshPerks();
    }
    if (tab === 'more' || force) refreshMore();
    // red dots on tabs when something is affordable
    const canBuild = s.coops.some((_, i) => s.coins >= E.coopCost(s, i)) || s.trucks.some((_, i) => s.coins >= E.truckCost(s, i));
    const canResearch = E.RESEARCH.some(r => s.research[r.id] < r.max && s.coins >= E.researchCost(s, r));
    document.querySelector('[data-tab=build] .dot').classList.toggle('hide', !canBuild);
    document.querySelector('[data-tab=research] .dot').classList.toggle('hide', !canResearch);
    $('gift').classList.toggle('hide', s.giftIn > 0);
  }

  // ---------- Hatching ----------
  let holdTimer = null, hatchedSinceSound = 0;
  function doHatch(units, x, y) {
    const d = E.derived(s);
    if (s.chickens >= d.cap) { toast('🏠 Coops are full! Build more in the Build tab.'); stopHold(); return; }
    const n = E.hatch(s, units);
    if (n <= 0) { if (s.tank < 1) toast('🐣 Hatchery is refilling…'); return; }
    s.stats.taps++;
    S.hatched(1);
    if (x !== undefined) S.float(x, y, '+' + fmt(n) + ' 🐔', '#fff', 22);
    if (++hatchedSinceSound % 2) sfx.hatch();
    refresh();
  }
  function startHold(e) {
    e.preventDefault();
    if (holdTimer) return;
    $('hatchBtn').classList.add('held');
    doHatch(1);
    holdTimer = setInterval(() => doHatch(1), 110);
  }
  function stopHold() { clearInterval(holdTimer); holdTimer = null; $('hatchBtn').classList.remove('held'); }

  // ---------- Events ----------
  function wire() {
    const hb = $('hatchBtn');
    hb.addEventListener('pointerdown', startHold);
    ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(ev => hb.addEventListener(ev, stopHold));
    hb.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => {
      if (e.code === 'Space' && !e.repeat && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); startHold(e); }
    });
    window.addEventListener('keyup', e => { if (e.code === 'Space') stopHold(); });

    const canvas = $('farm');
    canvas.addEventListener('pointerdown', e => {
      const [x, y] = S.toCanvas(canvas, e.clientX, e.clientY);
      if (!S.tap(x, y)) doHatch(1, x, y);
      $('hint').style.opacity = 0;
    });

    document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
      tab = b.dataset.tab;
      document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === b));
      document.querySelectorAll('.tabpage').forEach(p => p.classList.toggle('hide', p.id !== tab + 'Tab'));
      refresh(true);
      window.scrollTo({ top: $('scene').offsetTop + $('scene').offsetHeight - 140, behavior: 'smooth' });
    });

    $('eggChip').onclick = () => {
      const e = E.EGGS[s.tier], d = E.derived(s);
      modal('🥚 ' + e.name, e.desc + '<span class="big">' + fmt(d.value * d.mult) + ' coins/egg</span>Egg ' + (s.tier + 1) + ' of ' + E.EGGS.length + '.');
    };
    $('rushBtn').onclick = () => { if (E.rush(s)) { sfx.coin(); toast('🚚 Rush hour! ×' + E.RUSH.mult + ' income'); refresh(true); save(); } };
    $('feastBtn').onclick = () => confirmModal('🌽 Golden feed', 'Spend 💎' + E.FEAST.gems + ' for ×' + E.FEAST.mult + ' income for ' + E.FEAST.duration / 60 + ' minutes?', 'Feed them!', () => {
      if (E.feast(s)) { sfx.big(); toast('🌽 Golden feed! ×' + E.FEAST.mult + ' income'); refresh(true); save(); }
    });
    $('discoverBtn').onclick = () => {
      if (!E.canDiscover(s)) return;
      const next = E.EGGS[s.tier + 1];
      confirmModal('Discover the ' + next.name + '?', next.desc + '<br><br>Your farm will start over with the new egg: coins, coops, trucks and research reset, but every egg is worth <b>' + fmt(next.value / E.EGGS[s.tier].value) + '× more</b>. Golden Seeds, gems and perks are kept.', 'Discover!', () => {
        E.discover(s); sfx.big(); S.burst(400, 200, 60); refresh(true); save();
        modal('🎉 New egg!', 'You now produce the <b>' + next.name + '</b>.<span class="big">' + fmt(next.value) + ' base value</span>Hatch chickens and rebuild. It goes faster every time!');
        checkAch();
      });
    };
    $('prestigeBtn').onclick = () => {
      const r = E.prestigeReward(s);
      if (r < 1) return;
      confirmModal('🌟 Expand your farm?', 'You will move to new land with a fresh Farm Egg farm. Coins, eggs, buildings and research are reset.<span class="big">+' + fmt(r) + ' Golden Seeds</span>Income bonus goes from ×' + fmt(E.derived(s).mult) + ' to ×' + fmt(1 + (s.seeds + r) * (0.1 + 0.01 * s.perks.seedPower)) + '.', 'Expand!', () => {
        E.prestige(s); sfx.big(); S.burst(400, 200, 80); refresh(true); save();
        toast('🌍 Welcome to ' + S.PALETTES[s.expansions % S.PALETTES.length].name + '!');
        checkAch();
      });
    };
    $('gift').onclick = () => {
      const g = E.openGift(s);
      if (!g) return;
      sfx.coin(); S.burst(740, 40, 24);
      modal('🎁 Gift!', g.gems ? 'You found <span class="big">💎 ' + g.gems + ' gem' + (g.gems > 1 ? 's' : '') + '</span>' : 'A delivery bonus!<span class="big">🪙 ' + fmt(g.coins) + '</span>');
      refresh(true); save();
    };
    $('soundBtn').onclick = () => { s.settings.sound = !s.settings.sound; refresh(true); save(); };
    $('exportSave').onclick = async () => {
      save();
      const code = btoa(unescape(encodeURIComponent(JSON.stringify(s))));
      try { await navigator.clipboard.writeText(code); toast('📋 Save code copied'); }
      catch (e) { window.prompt('Copy your save code:', code); }
    };
    $('importSave').onclick = () => {
      const code = window.prompt('Paste your save code:');
      if (!code) return;
      try {
        const v = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
        if (!v || typeof v !== 'object') throw Error('bad');
        confirmModal('Import save?', 'This replaces your current farm.', 'Import', () => {
          s = E.load(v); s.last = Date.now(); lastTier = ''; save(); refresh(true); toast('📥 Save imported!');
        });
      } catch (e) { toast('Invalid save code'); }
    };
    $('resetBtn').onclick = () => confirmModal('Reset everything?', 'This permanently erases all progress, including Golden Seeds, gems and perks.', 'Erase', () => {
      s = E.fresh(); lastTier = ''; save(); refresh(true); toast('🌱 A brand new farm');
    });

    document.addEventListener('visibilitychange', () => { if (document.hidden) { stopHold(); save(); } else loop(); });
    window.addEventListener('pagehide', save);
  }

  // ---------- Achievements ----------
  function checkAch() {
    E.checkAchievements(s).forEach((a, i) => setTimeout(() => {
      sfx.coin(); toast('🏆 ' + a.name + ' · +💎' + a.gems);
    }, i * 2600));
  }

  // ---------- Game loop ----------
  function welcomeBack(r) {
    modal('🌙 Welcome back!', 'You were away for ' + dur(r.seconds) + '. Your farm kept running' + (r.counted < r.seconds ? ' (up to ' + dur(r.counted) + ')' : '') + ' at ' + Math.round(E.offlineRate(s) * 100) + '% speed.<span class="big">🪙 ' + fmt(r.coins) + '</span>', [{ label: 'Collect' , fn: sfx.coin }]);
  }
  let lastUi = 0, lastSave = Date.now(), lastAch = 0;
  function loop() {
    const now = Date.now(), dt = (now - s.last) / 1000;
    if (dt > 30) {
      const r = E.offline(s, now);
      if (r && r.coins > 0) welcomeBack(r);
      refresh(true);
    } else if (dt > 0) {
      E.tick(s, dt);
      s.last = now;
    }
    if (now - lastUi > 200) { lastUi = now; refresh(); }
    if (now - lastAch > 1000) { lastAch = now; checkAch(); }
    if (now - lastSave > 5000) { lastSave = now; save(); }
  }

  // ---------- Boot ----------
  buildLists();
  wire();
  S.init($('farm'), () => s, (x, y) => {
    const r = E.droneReward(s);
    sfx.coin();
    S.float(x, y - 20, r.gems ? '+1 💎' : '+' + fmt(r.coins), r.gems ? '#9fd8ff' : '#ffe27a', 30);
    toast(r.gems ? '🚁 Drone caught: +1 gem!' : '🚁 Drone caught: +' + fmt(r.coins) + ' coins');
    refresh();
  });
  if (s.migrated) {
    delete s.migrated;
    modal('🌱 Farm Empire upgraded!', 'Your old farm has been converted. You keep <b>' + fmt(s.seeds) + ' Golden Seeds</b> and get bonus gems for your past expansions. Enjoy the new game!');
    try { localStorage.removeItem(OLD_KEY); } catch (e) { /* ignore */ }
  }
  loop();
  refresh(true);
  setInterval(loop, 100);
  save();
})();
