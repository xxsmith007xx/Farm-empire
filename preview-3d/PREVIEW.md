# Farm Empire V2.2 preview

Playable URL: https://xxsmith007xx.github.io/Farm-empire/preview-3d/
Source: codex/compounding-momentum-v2-2 at ce6cc255377fa5eb2608f713043c59613a1527d8.

Complete runtime: index.html, farm-model.js, economy.js, farm-3d.js, bundled Three.js 0.160.1 and its MIT license. Versioned script URLs prevent old browser module caches from selecting V2.1. version.json records deployed provenance and SHA-256 hashes.

## Preview-specific save policy

The isolated preview retains sunny-acres-3d-preview-v1. All existing balances, upgrades, research, seeds, run number and property records remain; the preview explicitly enables economyVersion 2 on load and import to exercise the requested V2.2 rules. A one-time copy of an earlier preview save is retained at sunny-acres-3d-preview-v1-before-v22. Normal offline earnings still apply.

This preview-only adapter does not change the feature branch's legacy opt-in policy. No production save key is read or written, no feature or main branch changes, no PR merges and no root production file changes.

V2.2 starts at 0.7 coins/s, adds achievable purchase goals, storage/shipping with 70% local overflow sales, optional prestige at 1,000 run earnings, sqrt-based Golden Seed rewards and permanent +18% base income per seed. Prestige resets coins/run earnings/upgrades/research/stock/cooldown while keeping seeds/lifetime earnings/best harvest and all property records. Existing five-stage 3D farm growth and 2D fallback remain.
