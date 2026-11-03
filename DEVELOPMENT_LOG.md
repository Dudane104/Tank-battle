# Development log

## 2026-11-01 — Rendering and input stability
Inspected the complete main-branch project (README.md and index.html), repository tree and pending asset upload PR #1. Kept the existing implementation, map, rules and difficulty settings.

### Changes
- Accept canvas-backed tinted sprites in drawSprite; previously cached CPU sprites were rejected because canvas does not expose image.complete/naturalWidth.
- Retry missing assets/ images at the repository root, matching the pending upload structure. Retain primitive rendering when both locations fail.
- Clear directional and tap input on restart, main menu, window blur and page hiding. Release directional input when pointer capture is lost.
- Add reproducible Node smoke checks: node tests/smoke.cjs.

### Validation
Smoke checks passed for movement and outer wall blocking, shooting cooldown, blur/restart input cleanup, cached canvas rendering, root-path retry, 300 simulation updates, round completion, restart and canvas backing dimensions at 844×390, 667×375, 1024×768 and 1366×1024.
Tests use mocked DOM/canvas; they do not establish visual correctness, actual image downloads, touch gesture behaviour or Safari compatibility. No real-device/browser play test was run.

### Outstanding issues and next iterations
- Main currently has no PNG assets. PR #1 contains root-level images; this change does not merge that PR.
- Viewport scaling independently stretches each axis. Evaluate an aspect-preserving arena with controls outside critical play areas on phones.
- AI greedily picks directions without pathfinding and can get stuck against walls. Add measured routing tests before changing behaviour.
- Active blasts currently damage only at detonation, not when driving into lingering flames. Keep behaviour pending a deliberate gameplay decision.
- No sound system or pause flow exists.
- Review real sprites, animation, loading and performance once assets are available; test actual iPhone/iPad Safari.
- Extend tests to destructible walls, blast damage/armour, pickups and pointer cancellation.


## 2026-11-02 — Fortress Battle: integrated assets and slower engagements

### Inspection / scope
Re-read all main-branch source and README; checked the complete repository trees and open asset-upload PR #1. Main still contains only README.md and index.html. Incorporated the six existing PNGs from the assets branch into assets/ without changing the originals. Retained the existing single-file Canvas game, four-tank survival rules, cross-blasts, upgrades and three difficulty settings. The earlier local rendering/input fixes are included in this iteration.

### Changes
- Actually load normal, damaged and wrecked tanks, rocks, crates and shells. The crate PNG was previously requested but never drawn. Fix canvas-backed CPU tints, tint the player's tank red too, and cache smaller sprites and static terrain to avoid repeated full-size image scaling.
- Replace unobstructed perimeter approaches with a symmetric fortress layout: staggered permanent baffles, protected spawn pockets and destructible gateways between sectors. No opponent is reachable through empty cells at the start; all spawn areas connect when destructible cover is removed. The nearest vertical spawn route is 18 tiles versus a 12-tile direct separation.
- Give every tank 4 hull points plus one starting armour charge (5 separated hits to destroy); show hull bars and the player's hull in the HUD. Increase hit recovery to 1.1 seconds and initial protection to 3 seconds.
- Reduce base speed from 108 to 90 world units/second and shell flight lifetime from 1.45 to 0.9 seconds. Add a visible 0.7-second impact fuse before cross-blasts so players/CPU can retreat. Retain self-blast damage and instantaneous damage at detonation; lingering flame damage remains unchanged.
- Replace greedy CPU direction selection with weighted routes through the existing grid, crate clearing, line-of-sight checks and nearby-projectile escape. CPU begins moving after 2 seconds.
- Add hold-to-fire, pause/resume/main-menu flow, automatic pause on blur/page hiding/phone portrait rotation, pointer capture cleanup and reset on restart.
- Preserve arena aspect ratio, put phone controls in side gutters, leave tablet space beneath the arena, and correct tap-coordinate mapping. Permit menu scrolling. Add match time and clearer menu instructions.
- Fix a pickup being granted to more than one overlapping tank in the same update.

### Tests / results
- `node tests/gameplay.cjs`: 12 groups pass, covering map symmetry and connectivity, protected spawns, movement/walls/diagonal speed, armour/hull/invulnerability, blast occlusion and crate stopping, cooldown/fuse/hold-fire, routing and shooting occlusion, pause/resume/end/restart, fire pointer cancellation, viewport transforms at 667x375, 844x390, 932x430, 1024x768, 1366x1024 and 390x844, canvas-backed tints, fallback paths, pickup ownership and a seeded 60-second simulation.
- `node tests/render.cjs`: six real PNGs load; real native canvas renders at 844x390, 667x375 and 1024x768. Inspected the 844x390 arena output for sprite presence, placement and layout. These checks render canvas, not DOM/CSS.
- Five unattended normal-difficulty simulations with a stationary human: old first elimination 2.8–3.5s, round finish 4.8–9.2s; new first elimination 24.1–26.0s, finish 38.4–55.7s. These are seeded code simulations, not predictions of human match duration; changing gameplay also changes random-number consumption. One other 60s run still had three survivors and opened 23 crates.
- JS syntax validation passes.
- Actual browser checks could not run: Playwright's Chromium downloads returned invalid/truncated archives. No claim of browser, touch-device, Safari, CSS safe-area or frame-rate verification is made. No deployment or main-branch merge performed.

### Remaining / next improvements
- Play on physical iPhone and iPad Safari: button reach, simultaneous touches, notches, browser bars, rotation and menu scrolling.
- Evaluate perceived speed and four-point hull durability with the player actively fighting; the longer automated opening is not a replacement for play feedback.
- Tap movement still follows a direct line; use the D-pad for turns around cover. Add player tap pathfinding in a later iteration if desired.
- CPU routing and retreat are intentionally simple; further tuning could reduce dithering near crates and improve range-aware tactics.
- No sound added in this iteration. Add a gesture-unlocked sound system and volume toggle later.
- Existing damaged/wrecked assets have different framing; verify animation/visual centres on-device before adding more states.


## 2026-11-03 — Prevent shells and blasts bypassing rock cover

### Inspection and reproduction
Read every source/test/documentation file from the exact current PR #2 head (69a9814f6cbbb4f8fd1b1f3340d8027962f56ce9), checked the complete tree for repository instructions (none), and checked both open PRs. PR #2 remains open, so this iteration continues dev/fortress-battles. Verified all six local PNGs against their current Git blob hashes; no artwork changed.

Reproduced a gameplay bug before editing: put a tank next to a rock wall, an opposing tank on the far side, and fire into the wall. The 24-unit muzzle offset could place the new shell inside the rock. The impact code retained that position and zeroed its velocity, leaving detonate's velocity-based fallback ineffective. A blast could originate inside solid cover and damage the tank behind it (regression reproduced as 3 hull instead of the expected 4).

### Changes
- Sweep the barrel segment from the tank centre and each flight segment in steps of at most 4 world units. Stop stone impacts at the last free point; detect the first crate/tank contact along the path.
- Queue a muzzle contact for the next simulation tick, preserving the existing impact/fuse start timing instead of advancing a freshly spawned shell through cover.
- Refuse blast origins inside solid cells as a defensive check. Preserve ordinary cross-blast propagation and crate destruction.
- Store the firing angle on the shell so its sprite does not snap to the right when an impact zeroes its velocity.
- Keep the map, tank durability, speed, difficulty settings and 0.7-second warning fuse. Clip a flight segment to remaining shell lifetime so a slow update cannot extend projectile range.
- Add tests/projectiles.cjs to npm test; extend the real-image native rendering checks to armed wall impacts. Bump the package to 0.2.1.

### Validation
- Before the fix, the new point-blank wall regression failed: target behind rock lost a hull point.
- npm test passes: 12 existing gameplay groups plus 12 projectile regressions. Coverage includes four-direction point-blank wall impacts; off-centre clipped barrels; invalid solid-cell blast origins; wall/tank contacts during a long update; crate warning/detonation timing; next-tick muzzle contact; preserved sprite heading; and armed-fuse restart cleanup. Existing movement, damage/armour, map connectivity, hold-fire, pause, round completion/restart, pickup and six-size viewport checks also pass.
- npm run test:render passes: all six real PNGs load; native canvas renders both the normal arena and an armed upward wall impact at 844x390, 667x375 and 1024x768. Visually inspected the 844x390 impact render. This is canvas rendering, not DOM/CSS or Safari testing.
- Five seeded stationary-human normal simulations: first elimination 23.3–26.3s; rounds ended 61.2–102.7s. Every run reached a survivor within the 180-second cap. These are diagnostic simulations, not promises of human match duration. Correct wall occlusion changes combat outcomes and random-number consumption.
- A direct Playwright Chromium launch failed because its executable is absent at /root/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell. Browser automation, real multitouch, DOM/CSS and physical iPhone/iPad Safari remain unverified.

### Remaining / next step
Prioritise a proper browser/mobile layout and simultaneous-input pass when a browser becomes available. After that, investigate CPU retreat/recentring near cover and gesture-unlocked audio. Preserve lingering-flame damage semantics until deliberately reviewed. No merge or deployment performed.
