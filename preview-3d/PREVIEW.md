# Farm Empire V2.1 preview

Source: codex/living-farm-v2-1 at d48129833c0a37e8d2a53b741a1b44df7779ef90.
Playable URL: https://xxsmith007xx.github.io/Farm-empire/preview-3d/

Contains the complete game, shared milestone/save model, 3D renderer and locally bundled Three.js (with MIT license). Module URL versions prevent stale renderer code after updates. A preview CSS fix ensures the hidden Three.js canvas cannot intercept 2D fallback taps (overrides its inline display style). version.json records provenance and file hashes.

Preview retains the existing sunny-acres-3d-preview-v1 localStorage key. Existing preview saves migrate additively; production sunny-acres-v2 storage is never read or written. Explicitly imported saves are written to preview storage only. Root production files and main are unchanged.

Five stages: Homestead, Growing Acres, Country Estate, Harvest Hub, Sunny Acres Landmark. Existing upgrades and prestige drive scenery; earnings and costs remain unchanged. Property metadata is reserved for future ownership, with no extra property income implemented.
