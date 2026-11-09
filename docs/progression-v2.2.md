# V2.2 progression and compatibility

V2.2 begins at 0.7 coins/s. The existing six production upgrades, three research upgrades, tapping, collection, Golden Seeds and 45-second express delivery remain. New runs use cheaper early upgrades and a production/shipping buffer. There is no second property economy or building-placement system.

## Save boundary

The browser key remains `sunny-acres-v2`. Schema 4 adds `economyVersion` and a coin-valued egg inventory in `logistics.stock`. Existing saves without an economy version load as **legacy version 1**. Their balances, upgrade levels/prices, exact income formula, offline efficiency/cap, express reward and current prestige threshold/reward remain. No balance or production levels are exchanged on load. Import fills missing upgrade/research defaults.

A legacy player opts into version 2 only by confirming prestige. Fresh games and explicit full resets start version 2. All property records, the stable Sunny Acres identity, Golden Seeds, lifetime earnings and the best completed harvest survive prestige. Coins, current harvest, production upgrades, run research, egg inventory and delivery cooldown reset. Other properties remain metadata and earn no income.

## Compounding and bottlenecks

The six upgrades multiply production across chickens, coops, feed, hatcheries and drones. Speed research and the permanent seed multiplier multiply the result. Delivery trucks increase shipping throughput; coops also increase storage. New-run hatcheries use ×1.65 production per level and ×2.25 price growth, so their cost eventually outpaces their direct return. Other prices and curves are in `economy.js`; legacy formulas remain separate and exact.

Stored eggs are expressed as their full coin value. Production fills a buffer, trucks sell at full value, and overflow sells locally at 70% value. There is no hard production stop or manual inventory management. At full storage, sustained earnings are at least 70% of production; a truck can recover more of that value. The same conservation equation runs in both offline accounting and simulations. Offline time remains capped at eight hours at 35% + 10 percentage points per Night Shift level. Changing tick size does not create earnings. Hidden tabs suspend foreground ticks and claim away earnings once on resume; that claim is saved immediately.

New express delivery becomes available after 45 seconds and pays max(15 coins, 12 seconds of steady income). This avoids the previous immediate 100-coin payout skipping the opening. Legacy runs keep the original reward and cooldown state. Existing direct collect/tap rewards are retained; fast repeated collection will progress faster than the benchmark below.

## Optional prestige and higher goals

New runs unlock prestige at 1,000 earned coins, independent of run number. The old ×12-per-run gate would repeatedly move familiar progress out of reach. The reward is floor(5 × sqrt(run earnings / 1,000)) Golden Seeds. Each seed retains its existing +18% of base income, so 5 seeds change ×1.00 to ×1.90, the next 5 change ×1.90 to ×2.80, and relative gains gradually diminish. Waiting until 10,000 coins earns at least 15 seeds; 100,000 earns at least 50. Longer runs earn larger rewards rather than a separate forced reset.

Goals advance through the existing upgrade unlocks and the 1K / 3K / 10K / 30K / 100K harvest ladder. The panel shows the next achievable purchase, storage/shipping pressure, and the exact permanent multiplier before/after prestige. The prestige panel and cancelable confirmation both explain resets and retained progress. Prestige never happens automatically.

## Measured pacing

Reproduce with `node scripts/simulate-economy.cjs docs/progression-v2.2.json`. The simulator calls the actual game economy. One purchase decision per second chooses the best affordable marginal income per coin across production/speed research (and tap research for active play). It has no lookahead. Idle has no taps or express boosts. Active uses one tap per second and express whenever ready, not rapid collection spam. It uses no away time. These are deterministic balance benchmarks, not observed player behavior or guarantees of human completion times.

| Run | Starting seeds | Idle to 1K / prestige | Active to 1K / prestige |
| --- | ---: | ---: | ---: |
| 1 | 0 | 4m42s | 2m49s |
| 2 | 5 | 3m14s | 1m47s |
| 3 | 10 | 2m43s | 1m25s |
| 4 | 15 | 2m17s | 1m07s |
| 5 | 20 | 2m00s | 0m51s |

The first purchase is 18 seconds idle or 8 seconds active. On the first idle run, 100 earned coins takes 96 seconds and 500 takes 200 seconds; on run five those same milestones take 26 and 93 seconds. First-run purchase gaps stay at or below 28 seconds idle / 16 seconds active under this policy. First-run income reaches more than 20 coins/s by the unlock, from 0.7 at the start. Holding the first active run to 10K takes 4m10s and earns 16 seeds; to 100K takes 4m32s and earns 50 seeds in the current benchmark. Higher records remain optional; the saved JSON includes those runs and a three-cycle 1K → 10K → 100K record chase.

An initial trial gave new players an instant express boost and 100 coins in one second; that skipped the opening and was removed. Another trial used ×1.85 hatchery costs and production, allowing long-run inflation too cheaply; the current cost/return separation is deliberate. Later economy tuning should inspect higher-goal simulation output as well as first-prestige time.

## Checks

- `node tests/model.cjs`: additive metadata and visual milestone bounds.
- `node tests/economy.cjs`: legacy formula/pricing/offline compatibility, modern save roundtrips, optional prestige/identity retention, storage conservation, offline time-step invariance and cap, no-stall earnings floor, cooldowns, upgrade purchases and five-cycle pacing budgets.
- `node tests/momentum-browser.cjs`: new-run income, purchase/goals UI, cancel/confirm prestige and exact rewards, property preservation, hidden-tab/offline/resume/reload behavior without double claims.
- `node tests/gameplay.cjs`: original legacy-game parity until the explicit prestige boundary, save import/export, 3D/2D/failure paths and layout.
- `node tests/milestones.cjs` and `node tests/rendering.cjs`: mobile progression scenes and animated rendering.

Serve the repository on localhost:8765 for browser suites. Playwright and Chromium are required as described in README.md. WebKit in this environment remains blocked by missing GTK4, Graphene, HarfBuzz ICU, Manette, Hyphen and GLESv2 libraries. No physical iPhone Safari or device performance tests were completed.
