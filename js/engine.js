/* Farm Empire — game engine.
 * Pure game logic with no DOM access, so it can run in the browser and in Node tests.
 * All timers are stored as "seconds remaining" so offline simulation is exact. */
(function (root) {
  'use strict';

  // ---------- Static data ----------
  // Egg varieties: each tier multiplies egg value. Discovering the next egg resets
  // the farm (buildings + research) but everything gets more valuable.
  const EGGS = [
    { id: 'farm',     name: 'Farm Egg',          value: 1,      color: '#fff6e4', desc: 'Humble, honest and delicious.' },
    { id: 'range',    name: 'Free-Range Egg',    value: 7,      color: '#d29a68', desc: 'Happy hens make tastier eggs.' },
    { id: 'blue',     name: 'Blue Heritage Egg', value: 50,     color: '#93cfe9', desc: 'A rare heirloom breed with sky-blue shells.' },
    { id: 'speckled', name: 'Speckled Egg',      value: 350,    color: '#eadcc0', spot: '#8a6a4a', desc: 'Every shell is one of a kind.' },
    { id: 'honey',    name: 'Honey Egg',         value: 2500,   color: '#f3c14b', desc: 'Sweet golden yolks loved by bakers.' },
    { id: 'cocoa',    name: 'Cocoa Egg',         value: 1.8e4,  color: '#7a4a2e', desc: 'Smells faintly of chocolate. Nobody knows why.' },
    { id: 'mint',     name: 'Mint Egg',          value: 1.3e5,  color: '#9fe3c4', desc: 'Cool, crisp and very refreshing.' },
    { id: 'ruby',     name: 'Ruby Egg',          value: 9e5,    color: '#d8334a', desc: 'Sparkles like a gemstone in the sun.' },
    { id: 'moon',     name: 'Moonstone Egg',     value: 6.5e6,  color: '#c9d3f2', spot: '#9aa6cf', desc: 'Glows softly at night.' },
    { id: 'solar',    name: 'Solar Egg',         value: 4.5e7,  color: '#ff9b2f', desc: 'Warm to the touch. Handle with mitts.' },
    { id: 'prism',    name: 'Prism Egg',         value: 3.2e8,  color: '#b98cff', desc: 'Splits sunlight into rainbows.' },
    { id: 'star',     name: 'Star Egg',          value: 2.3e9,  color: '#fff27a', desc: 'The legendary egg at the end of the universe.' }
  ];

  const COOPS = [
    { name: 'Hen Hut',       icon: '🛖', cap: 50,     cost: 50 },
    { name: 'Cozy Coop',     icon: '🏠', cap: 250,    cost: 900 },
    { name: 'Red Barn',      icon: '🏚️', cap: 1200,   cost: 1.2e4 },
    { name: 'Hen Hall',      icon: '🏡', cap: 6000,   cost: 1.6e5 },
    { name: 'Feather Tower', icon: '🏢', cap: 3e4,    cost: 2.2e6 },
    { name: 'Cloud Coop',    icon: '☁️', cap: 1.5e5,  cost: 3e7 },
    { name: 'Sky Citadel',   icon: '🏰', cap: 7.5e5,  cost: 4e8 },
    { name: 'Moon Dome',     icon: '🌕', cap: 4e6,    cost: 6e9 }
  ];

  const TRUCKS = [
    { name: 'Pickup',        icon: '🛻', cap: 8,      cost: 40 },
    { name: 'Farm Van',      icon: '🚐', cap: 40,     cost: 700 },
    { name: 'Box Truck',     icon: '🚚', cap: 200,    cost: 9000 },
    { name: 'Big Rig',       icon: '🚛', cap: 1000,   cost: 1.2e5 },
    { name: 'Road Train',    icon: '🚆', cap: 5000,   cost: 1.7e6 },
    { name: 'Cargo Blimp',   icon: '🎈', cap: 2.5e4,  cost: 2.3e7 },
    { name: 'Hover Freighter', icon: '🛸', cap: 1.25e5, cost: 3e8 },
    { name: 'Sky Barge',     icon: '🚀', cap: 6.5e5,  cost: 4.5e9 }
  ];
  const COOP_SLOTS = 4, TRUCK_SLOTS = 6;

  // Research: costs coins, resets when you discover a new egg or expand.
  // kind 'add' = +step per level, 'mul' = ×step per level.
  const RESEARCH = [
    { id: 'nest',      icon: '🪺', name: 'Comfy Nests',      desc: '+10% laying rate',            stat: 'lay',   kind: 'add', step: 0.10, base: 15,    growth: 1.28, max: 30 },
    { id: 'polish',    icon: '✨', name: 'Egg Polish',       desc: '+10% egg value',              stat: 'value', kind: 'add', step: 0.10, base: 40,    growth: 1.32, max: 30 },
    { id: 'incub',     icon: '🔥', name: 'Warm Incubators',  desc: '+25% hatchery refill speed',  stat: 'refill',kind: 'add', step: 0.25, base: 30,    growth: 1.30, max: 20 },
    { id: 'tank',      icon: '🧺', name: 'Bigger Hatchery',  desc: '+25% hatchery size',          stat: 'tank',  kind: 'add', step: 0.25, base: 60,    growth: 1.35, max: 15 },
    { id: 'roost',     icon: '🪵', name: 'Roomy Roosts',     desc: '+10% coop capacity',          stat: 'cap',   kind: 'add', step: 0.10, base: 120,   growth: 1.38, max: 25 },
    { id: 'routes',    icon: '🗺️', name: 'Route Planning',   desc: '+10% shipping capacity',      stat: 'ship',  kind: 'add', step: 0.10, base: 100,   growth: 1.36, max: 25 },
    { id: 'autohatch', icon: '🤖', name: 'Auto Hatchery',    desc: 'Hatches chickens automatically (+0.15% of capacity/s)', stat: 'auto', kind: 'add', step: 1, base: 250, growth: 1.45, max: 30 },
    { id: 'genetics',  icon: '🧬', name: 'Super Genetics',   desc: '×1.25 laying rate',           stat: 'lay',   kind: 'mul', step: 1.25, base: 5000,  growth: 3.2,  max: 10 },
    { id: 'branding',  icon: '🏷️', name: 'Farm Branding',    desc: '×1.25 egg value',             stat: 'value', kind: 'mul', step: 1.25, base: 2e4,   growth: 3.4,  max: 10 },
    { id: 'housing',   icon: '🏗️', name: 'Vertical Housing', desc: '×1.25 coop capacity',         stat: 'cap',   kind: 'mul', step: 1.25, base: 1.2e4, growth: 3.3,  max: 10 },
    { id: 'logistics', icon: '📦', name: 'Smart Logistics',  desc: '×1.25 shipping capacity',     stat: 'ship',  kind: 'mul', step: 1.25, base: 8000,  growth: 3.3,  max: 10 }
  ];

  // Perks: bought with gems, permanent forever (survive expansions).
  const PERKS = [
    { id: 'seedPower', icon: '🌟', name: 'Seed Power',      desc: '+1% bonus per Golden Seed',            base: 5,  growth: 3, max: 20 },
    { id: 'layPerk',   icon: '🐔', name: 'Prize Hens',      desc: '+5% laying rate, forever',             base: 4,  growth: 2, max: 20 },
    { id: 'headStart', icon: '🎒', name: 'Head Start',      desc: 'Start every egg & farm with bonus coins', base: 6, growth: 4, max: 10 },
    { id: 'tankPerk',  icon: '🐣', name: 'Mega Hatchery',   desc: '+20% hatchery size & refill',          base: 4,  growth: 2, max: 10 },
    { id: 'offline',   icon: '🌙', name: 'Night Shift',     desc: '+1h offline time & +6% offline rate',  base: 5,  growth: 3, max: 8 },
    { id: 'droneLuck', icon: '🚁', name: 'Drone Spotter',   desc: '+25% drone rewards & more gems',       base: 5,  growth: 3, max: 10 }
  ];

  const LAY_BASE = 0.25;          // eggs per chicken per second
  const TANK_BASE = 60;           // hatchery units
  const REFILL_BASE = 2;          // units per second
  const HATCH_BATCH = 0.004;      // fraction of capacity hatched per unit (min 1 chicken)
  const AUTO_STEP = 0.0015;       // fraction of capacity per second per Auto Hatchery level
  const UNLOCK_BASE = 2.5e4;      // coins to earn on an egg before the next egg is discovered
  const SEED_BONUS = 0.10;        // +10% income per Golden Seed
  const RUSH = { mult: 2, duration: 60, cooldown: 240 };
  const FEAST = { mult: 3, duration: 600, gems: 8 };
  const GIFT_EVERY = 240;

  // ---------- Helpers ----------
  const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'UDc', 'DDc', 'TDc'];
  function fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + fmt(-n);
    if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : Math.floor(n).toLocaleString('en-US');
    const i = Math.floor(Math.log10(n) / 3);
    if (i >= SUFFIX.length) return n.toExponential(2).replace('+', '');
    const v = n / Math.pow(1000, i);
    return (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.floor(v)) + SUFFIX[i];
  }
  const fmtRound = n => fmt(n).replace(/\.0+(?=[A-Za-z])/, '');
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);

  // ---------- State ----------
  function newRun(s) {
    s.coins = headStartCoins(s);
    s.tierEarned = 0;
    s.chickens = 0;
    s.coops = [0, -1, -1, -1];
    s.trucks = [0, -1, -1, -1, -1, -1];
    s.research = {};
    RESEARCH.forEach(r => (s.research[r.id] = 0));
    s.tank = tankMax(s);
    return s;
  }

  function fresh() {
    const s = {
      v: 3,
      tier: 0, coins: 0, tierEarned: 0, farmEarned: 0, lifetime: 0,
      chickens: 0, tank: TANK_BASE,
      coops: [], trucks: [], research: {},
      seeds: 0, expansions: 0, bestTier: 0,
      gems: 3, perks: {}, achievements: {},
      boostLeft: 0, boostMult: 1, rushCooldown: 0, giftIn: GIFT_EVERY,
      stats: { hatched: 0, drones: 0, gifts: 0, taps: 0, maxChickens: 0, maxIncome: 0 },
      last: Date.now(), created: Date.now(),
      settings: { sound: true, music: true }
    };
    PERKS.forEach(p => (s.perks[p.id] = 0));
    newRun(s);
    s.chickens = 1;
    return s;
  }

  // Sanitise any loaded object into a valid state (handles old/partial/corrupt saves).
  function load(raw) {
    const base = fresh();
    if (!raw || typeof raw !== 'object') return base;
    if (raw.v !== 3) return migrateV2(raw, base);
    const s = base;
    ['tier', 'coins', 'tierEarned', 'farmEarned', 'lifetime', 'chickens', 'tank', 'seeds', 'expansions',
      'bestTier', 'gems', 'boostLeft', 'boostMult', 'rushCooldown', 'giftIn', 'last', 'created'].forEach(k => (s[k] = Math.max(0, num(raw[k], s[k]))));
    s.tier = Math.min(EGGS.length - 1, Math.floor(s.tier));
    s.bestTier = Math.max(s.tier, Math.floor(s.bestTier));
    const slots = (arr, n, max) => Array.from({ length: n }, (_, i) => {
      const v = Array.isArray(arr) ? arr[i] : undefined;
      return typeof v === 'number' && v >= -1 ? Math.min(max - 1, Math.floor(v)) : -1;
    });
    s.coops = slots(raw.coops, COOP_SLOTS, COOPS.length);
    s.trucks = slots(raw.trucks, TRUCK_SLOTS, TRUCKS.length);
    if (s.coops.every(c => c < 0)) s.coops[0] = 0;
    if (s.trucks.every(c => c < 0)) s.trucks[0] = 0;
    RESEARCH.forEach(r => (s.research[r.id] = Math.min(r.max, Math.floor(num(raw.research && raw.research[r.id], 0)))));
    PERKS.forEach(p => (s.perks[p.id] = Math.min(p.max, Math.floor(num(raw.perks && raw.perks[p.id], 0)))));
    if (raw.achievements && typeof raw.achievements === 'object') for (const k in raw.achievements) if (raw.achievements[k]) s.achievements[k] = 1;
    if (raw.stats && typeof raw.stats === 'object') for (const k in s.stats) s.stats[k] = Math.max(0, num(raw.stats[k], 0));
    if (raw.settings && typeof raw.settings === 'object') { s.settings.sound = raw.settings.sound !== false; s.settings.music = raw.settings.music !== false; }
    s.chickens = Math.min(s.chickens, capacity(s));
    s.tank = Math.min(s.tank, tankMax(s));
    if (s.boostMult < 1) s.boostMult = 1;
    return s;
  }

  // The original prototype ('sunny-acres-v2') stored seeds/world; convert them generously.
  function migrateV2(raw, s) {
    s.seeds = Math.max(0, Math.floor(num(raw.seeds, 0) * 2));
    s.gems += Math.max(0, Math.floor(num(raw.world, 0) * 3));
    s.expansions = Math.max(0, Math.floor(num(raw.world, 0)));
    s.lifetime = Math.max(0, num(raw.allTime, 0));
    s.migrated = true;
    return s;
  }

  // ---------- Derived stats ----------
  function researchFactor(s, stat) {
    let add = 1, mul = 1;
    RESEARCH.forEach(r => {
      if (r.stat !== stat) return;
      const lv = s.research[r.id] || 0;
      if (r.kind === 'add') add += r.step * lv; else mul *= Math.pow(r.step, lv);
    });
    return add * mul;
  }
  const costMult = tier => EGGS[tier].value * Math.pow(1.25, tier);
  const seedMult = s => 1 + s.seeds * (SEED_BONUS + 0.01 * (s.perks.seedPower || 0));
  const tankMax = s => TANK_BASE * researchFactor(s, 'tank') * (1 + 0.2 * (s.perks.tankPerk || 0));
  const refillRate = s => REFILL_BASE * researchFactor(s, 'refill') * (1 + 0.2 * (s.perks.tankPerk || 0));
  const capacity = s => s.coops.reduce((a, t) => a + (t >= 0 ? COOPS[t].cap : 0), 0) * researchFactor(s, 'cap');
  const shipCap = s => s.trucks.reduce((a, t) => a + (t >= 0 ? TRUCKS[t].cap : 0), 0) * researchFactor(s, 'ship');
  const layRate = s => LAY_BASE * researchFactor(s, 'lay') * (1 + 0.05 * (s.perks.layPerk || 0));
  const eggValue = s => EGGS[s.tier].value * researchFactor(s, 'value');
  const hatchBatch = s => Math.max(1, capacity(s) * HATCH_BATCH);
  const autoHatch = s => (s.research.autohatch || 0) * AUTO_STEP * capacity(s);
  const unlockCost = tier => UNLOCK_BASE * EGGS[tier].value * Math.pow(3.2, tier);
  function headStartCoins(s) { const lv = (s.perks && s.perks.headStart) || 0; return lv ? 250 * lv * lv * costMult(s.tier || 0) : 0; }

  function derived(s) {
    const lay = layRate(s), laid = s.chickens * lay, ship = shipCap(s), shipped = Math.min(laid, ship);
    const value = eggValue(s), mult = seedMult(s), boost = s.boostLeft > 0 ? s.boostMult : 1;
    return {
      lay, laid, ship, shipped, value, mult, boost,
      cap: capacity(s), tankMax: tankMax(s), refill: refillRate(s), batch: hatchBatch(s), auto: autoHatch(s),
      income: shipped * value * mult * boost,
      bottleneck: laid > ship * 1.001 ? 'ship' : s.chickens >= capacity(s) * 0.999 ? 'cap' : null
    };
  }

  // ---------- Actions ----------
  function earn(s, v) { s.coins += v; s.tierEarned += v; s.farmEarned += v; s.lifetime += v; }

  function tick(s, dt, offlineRate) {
    if (!(dt > 0)) return 0;
    const cap = capacity(s);
    s.tank = Math.min(tankMax(s), s.tank + refillRate(s) * dt);
    const before = s.chickens;
    s.chickens = Math.min(cap, s.chickens + autoHatch(s) * dt);
    s.stats.hatched += Math.max(0, s.chickens - before);
    const d = derived(s);
    // Split boost across the step if it runs out mid-tick
    const boosted = Math.min(dt, s.boostLeft);
    const base = d.shipped * d.value * d.mult;
    const gained = (base * (dt - boosted) + base * s.boostMult * boosted) * (offlineRate || 1);
    earn(s, gained);
    s.boostLeft = Math.max(0, s.boostLeft - dt);
    if (s.boostLeft === 0) s.boostMult = 1;
    s.rushCooldown = Math.max(0, s.rushCooldown - dt);
    s.giftIn = Math.max(0, s.giftIn - dt);
    s.stats.maxChickens = Math.max(s.stats.maxChickens, s.chickens);
    if (!offlineRate) s.stats.maxIncome = Math.max(s.stats.maxIncome, d.income);
    return gained;
  }

  // Hatch up to `units` from the hatchery tank. Returns chickens hatched.
  function hatch(s, units) {
    const cap = capacity(s);
    const room = cap - s.chickens;
    if (room <= 0) return 0;
    const use = Math.min(units, Math.floor(s.tank));
    if (use <= 0) return 0;
    const batch = hatchBatch(s);
    const n = Math.min(room, use * batch);
    s.tank -= Math.ceil(n / batch);
    s.chickens += n;
    s.stats.hatched += n;
    return n;
  }

  function slotCost(list, tier, slot, type) { return list[type].cost * (1 + 0.6 * slot) * costMult(tier); }
  const coopCost = (s, slot) => s.coops[slot] + 1 < COOPS.length ? slotCost(COOPS, s.tier, slot, s.coops[slot] + 1) : Infinity;
  const truckCost = (s, slot) => s.trucks[slot] + 1 < TRUCKS.length ? slotCost(TRUCKS, s.tier, slot, s.trucks[slot] + 1) : Infinity;

  function buySlot(s, kind, slot) {
    const arr = kind === 'coop' ? s.coops : s.trucks;
    const cost = kind === 'coop' ? coopCost(s, slot) : truckCost(s, slot);
    if (!(slot >= 0 && slot < arr.length) || !isFinite(cost) || s.coins < cost) return false;
    s.coins -= cost;
    arr[slot]++;
    return true;
  }

  const researchCost = (s, r, lv) => r.base * Math.pow(r.growth, lv === undefined ? s.research[r.id] : lv) * costMult(s.tier);
  // Cost/levels for buying `want` levels (Infinity = as many as affordable).
  function researchBulk(s, r, want) {
    let lv = s.research[r.id], total = 0, n = 0, coins = s.coins;
    while (lv + n < r.max && n < want) {
      const c = researchCost(s, r, lv + n);
      if (want === Infinity && total + c > coins) break;
      total += c; n++;
    }
    return { n, total };
  }
  function buyResearch(s, id, want) {
    const r = RESEARCH.find(x => x.id === id);
    if (!r) return 0;
    const { n, total } = researchBulk(s, r, want || 1);
    if (n === 0 || total > s.coins) return 0;
    s.coins -= total;
    s.research[id] += n;
    return n;
  }

  const perkCost = (s, p) => p.base + p.growth * (s.perks[p.id] || 0);
  function buyPerk(s, id) {
    const p = PERKS.find(x => x.id === id);
    if (!p || s.perks[id] >= p.max) return false;
    const c = perkCost(s, p);
    if (s.gems < c) return false;
    s.gems -= c;
    s.perks[id]++;
    return true;
  }

  const canDiscover = s => s.tier < EGGS.length - 1 && s.tierEarned >= unlockCost(s.tier);
  function discover(s) {
    if (!canDiscover(s)) return false;
    s.tier++;
    s.bestTier = Math.max(s.bestTier, s.tier);
    newRun(s);
    s.chickens = 1;
    return true;
  }

  // Golden Seeds earned from everything made since the last expansion.
  const prestigeReward = s => Math.floor(Math.pow(s.farmEarned / 1e7, 0.25));
  function prestige(s) {
    const r = prestigeReward(s);
    if (r < 1) return 0;
    s.seeds += r;
    s.expansions++;
    s.tier = 0;
    s.farmEarned = 0;
    s.boostLeft = 0; s.boostMult = 1;
    newRun(s);
    s.chickens = 1;
    return r;
  }

  function rush(s) {
    if (s.rushCooldown > 0) return false;
    s.boostMult = Math.max(s.boostLeft > 0 ? s.boostMult : 1, RUSH.mult);
    s.boostLeft = Math.max(s.boostLeft, RUSH.duration);
    s.rushCooldown = RUSH.cooldown;
    return true;
  }
  function feast(s) {
    if (s.gems < FEAST.gems) return false;
    s.gems -= FEAST.gems;
    s.boostMult = FEAST.mult;
    s.boostLeft = (s.boostMult === FEAST.mult ? s.boostLeft : 0) + FEAST.duration;
    return true;
  }

  // Coins worth `seconds` of un-boosted income, with a floor so it's never zero early on.
  function incomeWorth(s, seconds) {
    const d = derived(s);
    return Math.max(10 * costMult(s.tier), d.shipped * d.value * d.mult * seconds);
  }

  function droneReward(s, rng) {
    rng = rng || Math.random;
    const luck = s.perks.droneLuck || 0;
    s.stats.drones++;
    if (rng() < 0.06 + 0.01 * luck) { s.gems += 1; return { gems: 1 }; }
    const coins = incomeWorth(s, 20 + rng() * 40) * (1 + 0.25 * luck);
    earn(s, coins);
    return { coins };
  }

  function openGift(s, rng) {
    rng = rng || Math.random;
    if (s.giftIn > 0) return null;
    s.giftIn = GIFT_EVERY;
    s.stats.gifts++;
    if (rng() < 0.45) { const g = 1 + Math.floor(rng() * 3); s.gems += g; return { gems: g }; }
    const coins = incomeWorth(s, 90 + rng() * 120);
    earn(s, coins);
    return { coins };
  }

  // ---------- Offline progress ----------
  const offlineCapSeconds = s => (2 + (s.perks.offline || 0)) * 3600;
  const offlineRate = s => 0.5 + 0.06 * (s.perks.offline || 0);
  function offline(s, now) {
    const away = Math.max(0, ((now || Date.now()) - s.last) / 1000);
    const t = Math.min(away, offlineCapSeconds(s));
    s.last = now || Date.now();
    if (t < 30) return null;
    let coins = 0;
    const steps = 60, dt = t / steps;
    for (let i = 0; i < steps; i++) coins += tick(s, dt, offlineRate(s));
    return { seconds: away, counted: t, coins };
  }

  // ---------- Achievements (one-time gem rewards) ----------
  const ACHIEVEMENTS = [];
  [[100, 1], [1000, 2], [1e4, 2], [1e5, 3], [1e6, 4], [1e7, 5]].forEach(([n, g]) =>
    ACHIEVEMENTS.push({ id: 'chick' + n, icon: '🐔', name: 'Flock of ' + fmtRound(n), desc: 'Have ' + fmtRound(n) + ' chickens at once', gems: g, test: s => s.stats.maxChickens >= n }));
  [[1e3, 1], [1e6, 2], [1e9, 3], [1e12, 4], [1e15, 5], [1e18, 6]].forEach(([n, g]) =>
    ACHIEVEMENTS.push({ id: 'life' + n, icon: '🪙', name: 'Egg Tycoon ' + fmtRound(n), desc: 'Earn ' + fmtRound(n) + ' coins in total', gems: g, test: s => s.lifetime >= n }));
  EGGS.slice(1).forEach((e, i) =>
    ACHIEVEMENTS.push({ id: 'egg' + (i + 1), icon: '🥚', name: e.name, desc: 'Discover the ' + e.name, gems: 2 + Math.floor(i / 2), test: s => s.bestTier >= i + 1 }));
  [[10, 1], [50, 2], [200, 4]].forEach(([n, g]) =>
    ACHIEVEMENTS.push({ id: 'drone' + n, icon: '🚁', name: 'Drone Catcher ' + n, desc: 'Catch ' + n + ' drones', gems: g, test: s => s.stats.drones >= n }));
  [[1, 3], [3, 4], [10, 6]].forEach(([n, g]) =>
    ACHIEVEMENTS.push({ id: 'exp' + n, icon: '🌍', name: 'Land Baron ' + n, desc: 'Expand your farm ' + n + ' time' + (n > 1 ? 's' : ''), gems: g, test: s => s.expansions >= n }));
  ACHIEVEMENTS.push({ id: 'fleet', icon: '🚛', name: 'Full Fleet', desc: 'Fill every truck slot', gems: 2, test: s => s.trucks.every(t => t >= 0) });
  ACHIEVEMENTS.push({ id: 'estate', icon: '🏘️', name: 'Estate', desc: 'Fill every coop slot', gems: 2, test: s => s.coops.every(t => t >= 0) });

  function checkAchievements(s) {
    const got = [];
    ACHIEVEMENTS.forEach(a => {
      if (!s.achievements[a.id] && a.test(s)) { s.achievements[a.id] = 1; s.gems += a.gems; got.push(a); }
    });
    return got;
  }

  const api = {
    EGGS, COOPS, TRUCKS, RESEARCH, PERKS, ACHIEVEMENTS, RUSH, FEAST, GIFT_EVERY,
    fmt, fresh, load, derived, tick, hatch, earn,
    coopCost, truckCost, buySlot, researchCost, researchBulk, buyResearch, perkCost, buyPerk,
    unlockCost, canDiscover, discover, prestigeReward, prestige, rush, feast,
    droneReward, openGift, offline, offlineCapSeconds, offlineRate, checkAchievements, costMult, capacity
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FarmEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
