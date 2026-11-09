# Farm Empire

Static idle farm game. Serve this directory over HTTP (for example `python3 -m http.server 8765`) and open `http://localhost:8765`.

The 3D farm adapts the supplied Farm Empire preview's low-poly chickens and buildings. `farm-3d.js` reads a small visual snapshot and invokes the original tap action. The original game retains ownership of all economy, upgrade, research, prestige, delivery, import/export, offline income, and save logic. The `sunny-acres-v2` localStorage key and save schema are unchanged. The preview's separate economy, reset button, and save key are not imported.

Three.js 0.160.1 is bundled in `vendor/`, with its MIT license; no runtime CDN is required. Failed module loads, unavailable WebGL, rendering errors and context loss retain the original 2D renderer. Use the scene button to select 2D manually. Rendering is capped at 30 fps and 1.5 pixel ratio, uses shared low-poly geometry, no shadows, bounded model counts, reduced-motion support, and pauses while hidden or outside the viewport. Vertical touch scrolling remains available; 3D collection happens only on a short pointer release.

Saves belong to the browser **and origin**. Keep the existing production origin to retain players' browser saves; a different preview origin has separate storage. Tests use synthetic saves in isolated browser contexts and never access real player saves.

## Validation

Install Playwright in a separate tooling directory or locally with `npm install --no-save playwright@1.62.1`. Serve the game on port 8765, then run:

```
node tests/gameplay.cjs
node tests/rendering.cjs
```

Chromium defaults to `/usr/bin/chromium`; set `CHROMIUM_PATH` for another executable. For WebKit, run `npx playwright install webkit` and install the browser's required OS libraries. The gameplay suite exits with code 2 when Chromium passes but WebKit cannot launch. It compares the original base commit against the new version with a fixed clock and synthetic legacy save; animation is disabled for deterministic economy comparisons. The separate rendering test runs actual animation and touch input, checks portrait/landscape layout, and writes screenshots to the OS temporary directory.

Validated in this environment:

- Chromium legacy-save and one-hour offline income parity; all six upgrades and three research purchases; passive, collection and delivery income; prestige; save export/import roundtrip.
- 3D/2D collection input, rejection of scrolling gestures, Three.js load failure, WebGL unavailability, and context-loss fallback.
- Animated WebGL rendering and real emulated touch input at an iPhone-sized viewport; portrait/landscape layout, screenshots visually inspected; no uncaught JS or WebGL errors.

WebKit was downloaded but could not launch because this environment lacks libgtk-4, libgraphene, libharfbuzz-icu, libmanette, libhyphen and libGLESv2. Physical iPhone Safari, device performance/thermal behavior, and real iOS background/resume behavior still require device testing. Linux browser emulation does not establish those results.

## V2.1 Living Farm Expansion

The farm grows from Homestead through Growing Acres, Country Estate, Harvest Hub and Landmark. Existing coop/feed/hatchery/drone upgrades and farm level determine property growth and landscaping. Coop purchases add visible coops (up to seven); coop and hatchery milestones enlarge the barn; feed and hatchery add silos. Truck levels 2/4/6 advance the delivery fleet, with trailers from level 4. These are visual rewards; costs and income are unchanged. Geometry is allocated once and reused, with capped scene counts.

`farm-model.js` is the shared milestone and save boundary. Legacy `sunny-acres-v2` saves migrate additively to schema 3: all economy fields stay in place, `properties` registers the stable `sunny-acres` home, and `activePropertyId` identifies it. Migration is idempotent; import fills missing upgrade/research defaults. Prestige retains property metadata while resetting the same economy fields as before. Explicit full reset still resets everything. Future property records survive but are neither selectable nor income-producing. A later ownership feature can move the unchanged economy into per-property state, retaining Sunny Acres under its stable ID; no new purchase, building-placement or passive-property economy exists yet.

Additional checks:

```
node tests/model.cjs
node tests/milestones.cjs
```

These cover legacy field preservation, migration idempotence, retained future metadata, bounded/monotonic progression, five mobile rendered milestone states and browser save migration. `tests/gameplay.cjs` compares original economy fields while independently checking property metadata survives prestige. Screenshots from the milestone suite are saved to the OS temporary directory.
