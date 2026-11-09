# 🐔 Farm Empire: Sunny Acres

An idle / incremental chicken-farm game that runs entirely in the browser. No build step, works offline, and is mobile-first. Graphics use PixiJS (WebGL, with a canvas fallback); animations respect the device's "reduce motion" setting.

**Play:** open `index.html` in a browser, or serve the folder (`npm start` → http://localhost:8080). It also works on GitHub Pages: point Pages at the repo root.

## How to play

1. **Hatch chickens.** Hold the big 🐣 button (or tap the farm, or hold <kbd>Space</kbd>). The hatchery refills over time.
2. **Chickens lay eggs, and trucks ship them.** Income = eggs shipped × egg value. If you lay more than your fleet can carry, the extra eggs go to waste, so watch the **Production** panel for bottlenecks.
3. **Build** coops (room for chickens) and trucks (shipping). Each of the 4 coop slots and 6 truck slots upgrades through 8 types.
4. **Research** boosts laying, egg value, capacity, shipping and hatching. The Auto Hatchery hatches chickens for you.
5. **Discover new eggs.** Earn enough with your current egg to unlock the next of 12 varieties (Farm → … → Star Egg). Your farm restarts, but each egg is worth about 7× more.
6. **Expand your farm (prestige).** Sell everything for **Golden Seeds 🌟**. Each seed adds +10% income forever, and each expansion moves you to new scenery.
7. **Gems 💎** come from catching drones 🚁, gifts 🎁 and achievements. Spend them on permanent **perks** or a ×3 Golden Feed boost.
8. **Offline earnings.** The farm keeps working while you're away (2h at 50% by default; upgrade with the Night Shift perk).

Progress autosaves to `localStorage`. Use *More → Copy save code* to move a save between devices. Saves from the original prototype (`sunny-acres-v2`) are converted automatically.

## Project layout

| File | Purpose |
| --- | --- |
| `index.html` | Page structure |
| `css/style.css` | Styles |
| `js/engine.js` | All game rules and balance data (pure logic, no DOM, so it's testable in Node) |
| `js/art.js` | Sprite catalogue: every picture, its size and anchor, with placeholder art (see [ART_GUIDE.md](ART_GUIDE.md) to swap in real artwork) |
| `js/scene.js` | Animated farm, rendered with [PixiJS](https://pixijs.com/): hopping chickens, hatching, buildings, trucks, drones, particles |
| `js/audio.js` | Music and sound effects, synthesised live with the Web Audio API (no audio files). Each farm location has its own tune |
| `js/native.js` | Phone-app extras (haptics, Android back button, durable saves); does nothing on the web |
| `js/fx.js` | Interface effects: coins flying to counters, rolling numbers, button pops and sparkles |
| `vendor/pixi-legacy.min.js` | PixiJS 7.4.2 (MIT licence), bundled so the game works offline and inside an app |
| `js/ui.js` | Game loop, saving/offline progress, input, menus, sound |
| `tests/engine.test.js` | Unit tests for the engine |

Balance lives at the top of `js/engine.js` (`EGGS`, `COOPS`, `TRUCKS`, `RESEARCH`, `PERKS` and the constants below them).

## Phone app

The game is also packaged as an Android and iOS app with Capacitor. See **[APP.md](APP.md)** for how to install a test build on your phone, build it yourself, and publish it.

## Development

```sh
npm test          # runs the engine unit tests (Node 22+)
npm start         # serves the game at http://localhost:8080
npm run sync      # builds www/ and copies it into the Android and iOS projects
npm run android   # …then opens Android Studio (npm run ios opens Xcode)
```
