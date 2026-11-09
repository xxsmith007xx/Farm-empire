# Art guide

Every picture in Farm Empire is a **sprite** listed in [`js/art.js`](js/art.js). Each one currently uses placeholder art drawn in code. To replace one with finished artwork:

1. Export the image as PNG or WebP with a transparent background, at **2×–3× the size listed below** so it stays sharp on phones.
2. Put it in an `art/` folder, e.g. `art/coop_3.png`.
3. In `js/art.js`, add `src` to that sprite. The easiest place is right after the sprite list, before `// ---------- helpers ----------`:
   ```js
   SPRITES.coop_3.src = 'art/coop_3.png';
   ```
4. Reload. The image is scaled to the listed size automatically, and anything without `src` keeps using its placeholder, so art can be swapped in one piece at a time.

**Anchor** is the point of the image that sits on the ground (or the centre for floating things), as fractions of width and height: `0.5, 1` means bottom-centre. If an image looks like it is floating or sinking, adjust `ax` / `ay` for that sprite. All game art is viewed from the same three-quarter (isometric-style) angle as the barn, lit from the top left.

## Sprite list

Sizes are in game pixels (the farm view is 800 × 530).

| Sprite key | Size | Anchor | What it is |
| --- | --- | --- | --- |
| `sky_0` … `sky_3` | 800 × 290 | top-left | Sky backdrop for each farm location (Sunny Acres, Golden Valley, Breezy Highlands, Starlight Fields) |
| `ground_0` … `ground_3` | 800 × 340 | top-left | Hills, trees, fenced field and road, placed at y = 190 |
| `barn` | 245 × 225 | 0.5, 1 | Main barn (chicks hatch from its door) |
| `silo` | 84 × 175 | 0.5, 1 | Silo beside the barn |
| `flagpole`, `flag` | 8 × 56, 42 × 26 | — | Flag on the barn; the current egg is shown on it |
| `coop_0` … `coop_7` | 160 × 200 | ground centre | Coop types: Hen Hut, Cozy Coop, Red Barn, Hen Hall, Feather Tower, Cloud Coop, Sky Citadel, Moon Dome |
| `coop_empty` | 90 × 50 | 0.5, 0.6 | Empty building plot with a "+" |
| `truck_0` … `truck_7` | 170 × 120 | ground centre | Pickup, Farm Van, Box Truck, Big Rig, Road Train, Cargo Blimp, Hover Freighter, Sky Barge (drive left → right, facing right) |
| `chicken` | 60 × 52 | 0.45, 0.92 | Hen, facing right (flipped automatically to face left) |
| `chick` | 32 × 28 | 0.45, 0.9 | Newly hatched chick, facing right |
| `shadow` | 40 × 12 | centre | Soft shadow under chickens |
| `egg_0` … `egg_11` | 40 × 48 | 0.5, 0.55 | The 12 egg varieties (see `EGGS` in `js/engine.js` for names and colours) |
| `egg_unknown` | 40 × 48 | 0.5, 0.55 | Mystery egg for "next egg" |
| `shell_top`, `shell_bottom` | 32 × 22 | — | Cracked shell halves; **draw them white**, the game tints them to the egg's colour |
| `drone`, `propeller`, `crate` | 84 × 34, 32 × 6, 34 × 32 | — | Gift drone, its spinning propeller and the crate it carries |
| `cloud`, `sun`, `rays` | 150 × 56, 110 × 110, 220 × 220 | centre | Sky decorations (rays rotate slowly behind the sun) |
| `coin`, `gem`, `star` | 32 × 32, 30 × 32, 30 × 30 | centre | Pickups and celebration stars; also used as icons in the menus |
| `arrow` | 26 × 30 | 0.5, 1 | "Upgrade available" arrow over coops |
| `puff`, `spark`, `confetti` | 48 × 48, 16 × 16, 8 × 5 | centre | Effects. **Draw puff and confetti white**: they are tinted in code |

## Animation

Movement (hopping, squash and stretch, wobbles, flying coins) is done in code by moving and scaling whole sprites, so each sprite only needs **one still image**. If you later want frame-by-frame animation (e.g. a flapping chicken), a sprite sheet can be added for that sprite in `js/scene.js`.

## Things still drawn as emoji

Menu icons (research, perks, tab bar, achievements) are still emoji. Replacing them with custom icons is the next art pass. They live in `js/engine.js` (`icon` fields) and `index.html`.
