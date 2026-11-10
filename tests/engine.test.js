// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const E = require('../js/engine.js');

test('fresh state starts with one chicken, a hut and a pickup', () => {
  const s = E.fresh();
  assert.strictEqual(s.chickens, 1);
  assert.deepStrictEqual(s.coops, [0, -1, -1, -1]);
  assert.deepStrictEqual(s.trucks, [0, -1, -1, -1, -1, -1]);
  assert.ok(E.derived(s).income > 0);
});

test('hatching is limited by tank and coop capacity', () => {
  const s = E.fresh();
  s.tank = 5;
  assert.strictEqual(E.hatch(s, 10), 5);
  assert.strictEqual(s.chickens, 6);
  s.tank = 1000;
  E.hatch(s, 1000);
  assert.strictEqual(s.chickens, E.capacity(s));
  assert.strictEqual(E.hatch(s, 1), 0);
});

test('shipping caps income', () => {
  const s = E.fresh();
  s.chickens = 50; // lays 12.5/s, pickup ships 8/s
  const d = E.derived(s);
  assert.strictEqual(d.shipped, 8);
  assert.strictEqual(d.bottleneck, 'ship');
});

test('buying slots and research spends coins', () => {
  const s = E.fresh();
  s.coins = 1e6;
  assert.ok(E.buySlot(s, 'coop', 1));
  assert.strictEqual(s.coops[1], 0);
  assert.ok(E.buySlot(s, 'truck', 0));
  assert.strictEqual(s.trucks[0], 1);
  const before = s.coins;
  assert.strictEqual(E.buyResearch(s, 'nest', 5), 5);
  assert.ok(s.coins < before);
  assert.ok(E.buyResearch(s, 'nest', Infinity) > 0);
  assert.strictEqual(s.research.nest, 30);
  assert.strictEqual(E.buyResearch(s, 'nest', 1), 0);
});

test('cannot buy without coins', () => {
  const s = E.fresh();
  s.coins = 0;
  assert.strictEqual(E.buySlot(s, 'coop', 1), false);
  assert.strictEqual(E.buyResearch(s, 'polish', 1), 0);
});

test('discovering an egg resets the farm but raises value', () => {
  const s = E.fresh();
  s.coins = 1e9;
  E.buyResearch(s, 'nest', 3);
  s.tierEarned = E.unlockCost(0);
  assert.ok(E.discover(s));
  assert.strictEqual(s.tier, 1);
  assert.strictEqual(s.research.nest, 0);
  assert.strictEqual(s.coins, 0);
  assert.ok(E.derived(s).value > 1);
});

test('prestige grants seeds and multiplies income', () => {
  const s = E.fresh();
  s.farmEarned = 1e12;
  s.tier = 4;
  const r = E.prestigeReward(s);
  assert.ok(r > 0);
  assert.strictEqual(E.prestige(s), r);
  assert.strictEqual(s.tier, 0);
  assert.strictEqual(s.seeds, r);
  assert.ok(E.derived(s).mult > 1);
});

test('boost multiplies income and expires', () => {
  const s = E.fresh();
  const base = E.derived(s).income;
  assert.ok(E.rush(s));
  assert.strictEqual(E.derived(s).income, base * 2);
  assert.strictEqual(E.rush(s), false); // cooldown
  E.tick(s, 61);
  assert.strictEqual(E.derived(s).boost, 1);
});

test('offline progress is capped and discounted', () => {
  const s = E.fresh();
  s.chickens = 30;
  const now = Date.now();
  s.last = now - 100 * 3600 * 1000;
  const r = E.offline(s, now);
  assert.strictEqual(r.counted, E.offlineCapSeconds(s));
  const expected = 30 * 0.25 * E.offlineRate(s) * r.counted;
  assert.ok(Math.abs(r.coins - expected) / expected < 1e-6);
});

test('load sanitises corrupt data and migrates the old prototype save', () => {
  const s = E.load({ v: 3, coins: 'lots', tier: 99, coops: [7, 9, 'x'], research: { nest: 1e9 } });
  assert.strictEqual(s.coins, 0);
  assert.strictEqual(s.tier, E.EGGS.length - 1);
  assert.deepStrictEqual(s.coops, [7, 7, -1, -1]);
  assert.strictEqual(s.research.nest, 30);
  const old = E.load({ coins: 5, seeds: 4, world: 2, u: {}, r: {} });
  assert.strictEqual(old.seeds, 8);
  assert.strictEqual(old.expansions, 2);
});

test('sound and music settings load separately and default to on', () => {
  assert.deepStrictEqual(E.fresh().settings, { sound: true, music: true });
  const s = E.load({ v: 3, settings: { sound: true, music: false } });
  assert.strictEqual(s.settings.sound, true);
  assert.strictEqual(s.settings.music, false);
  assert.strictEqual(E.load({ v: 3, settings: { sound: false } }).settings.music, true);
});

test('achievements award gems once', () => {
  const s = E.fresh();
  s.stats.maxChickens = 150;
  const g = s.gems;
  const got = E.checkAchievements(s);
  assert.ok(got.some(a => a.id === 'chick100'));
  assert.ok(s.gems > g);
  assert.strictEqual(E.checkAchievements(s).length, 0);
});

test('number formatting', () => {
  assert.strictEqual(E.fmt(999), '999');
  assert.strictEqual(E.fmt(1500), '1.50K');
  assert.strictEqual(E.fmt(2.5e9), '2.50B');
  assert.strictEqual(E.fmt(Infinity), '∞');
});
