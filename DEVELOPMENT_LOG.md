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


## 2026-11-03 — Larger sliding D-pad and layered combat audio (0.3.0)

### User priority / scope
The user reports that touch steering is hard to change quickly, and requests cleaner, more sensitive cardinal movement, potentially larger controls, continued visual polish and realistic sounds. Continued the current PR #2 source at fce735efb9ce357731d3b055fff2213bca589650. The daily task now prioritises these requests while retaining the wider development brief and existing schedule.

### Changes
- Replace separate captured arrow presses with a single D-pad capture surface: move a held thumb directly between up/down/left/right without lifting. The previous per-button capture prevented sliding to another arrow.
- Enlarge the D-pad from 120 to 138px on wide phones (44 to 46px arrow regions) and from 150 to 174px on tablets (50 to 58px arrows). The whole rounded pad, including corners, steers; the small centre area stops movement. Add a clear active arrow and a modest angle hysteresis to avoid flickering between directions near a diagonal. Touch remains cardinal rather than introducing diagonal movement.
- Keep the steering pointer separate from fire, ignore a second steering finger, and clear steering on release/cancel/capture loss/pause/restart. A direction change feeds the next simulation frame.
- Add touch-only corner alignment: when a turn would catch a corridor lip, align by at most 10 world units to the nearest valid lane centre, only if both the aligned position and requested next step are collision-free. Preserve the 90-unit base tank speed and existing keyboard/tap handling.
- Reserve room for the larger controls and safe-area insets without stretching the arena; align the JS/CSS breakpoint at exactly 7:4. The larger fire button is 88px on wide phones.
- Add layered Web Audio effects for firing, explosions, armour impacts and pickups, using filtered noise and pitched low-frequency percussion. Audio initialises/resumes from play/touch/keyboard gestures; no external sound files are needed. These are realistic-style synthesized effects, not recorded vehicle samples.
- Add sound on/off and 25/50/75/100% volume controls, saved preferences where storage is available, an in-game sound toggle, a limiter, quiet CPU shots and a 20-voice cap. Stop existing effects on pause/menu/restart/mute. Audio failures do not block the game. Noise uses its own seeded generator, preserving gameplay randomness.
- Keep all six artwork files unchanged. This iteration's visual changes are control size, shape and held-direction feedback.

### Validation
- npm test passes 38 groups: 12 existing gameplay, 12 projectile collision and 14 new touch/audio checks. New checks cover continuous slides, cardinal hysteresis/dead zone, simultaneous steering/fire, pointer ownership/cancellation/capture loss, next-frame turns, unchanged base speed, safe corner assistance, reset behaviour, audio gesture creation, effect layers and voice cap, mute/volume/preferences, missing/rejected audio APIs, safe-area arena containment and the exact 7:4 layout boundary.
- The gameplay suite still covers map connectivity, movement/walls, armour/hull damage, fuse timing, upgrades, pause, round completion and restarting; projectile regressions still cover solid cover and stopped-shell orientation.
- Native canvas rendering with the six actual PNGs passes at 844x390, 667x375 and 1024x768 for the arena and armed wall impact. Native canvas does not render the HTML control UI or reproduce browser audio.
- Physical iPhone/iPad Safari thumb feel, true multitouch, CSS layout and listening quality remain unverified: the environment still has no installed Playwright Chromium browser. New touch/audio tests use DOM/Web Audio mocks; they verify state/event handling and graph construction, not actual speakers or Safari policy enforcement.

### Next priorities
Obtain real-device steering feedback, especially the centre dead zone, quick corner turns and control reach with a phone notch. Refine the synthesized mix after real listening; recorded licensed samples/engine ambience can be considered later. Continue visual animation work and CPU cover navigation while keeping battles tactical. No merge or deployment performed.

## 2026-11-04 — Reliable fire ownership and interrupted audio recovery (0.3.1)

### Scope / changes
- Inspected current PR #2, open PRs, the full project and development log at d8dd3463e722f79f3374ebe1f7c81fc612e5e4eb. No repository AGENTS.md was present. Continued dev/fortress-battles; no duplicate PR. Preserved the larger sliding D-pad, hysteresis/dead zone, turn assistance, wall occlusion, 90-unit speed, fortified map, hull/armour and combat timing.
- Give FIRE a single pointer owner. Ignore additional fingers and unrelated/stale pointer releases or capture-loss events. Previously another finger could steal capture and stop held fire.
- Separate Space and touch firing so releasing one input does not cancel the other; held feedback remains active while either source fires. Pause/restart/blur clear both owners and keyboard state. Ignore gameplay key presses while paused; held Escape no longer repeatedly toggles pause.
- Catch fire capture failures and add owner-matched window pointerup/cancel fallback for both controls, preventing stuck input when release occurs outside the control after a failed capture.
- Resume audio from the Resume gesture, including an interrupted context. Rebuild a closed context on the next enabled gesture with saved volume/mute behaviour intact. Failed resume remains harmless and retryable. Preserve the existing synthesized layers, limiter and 20-voice cap; no new sound timbres or vehicle samples in this focused bug-fix iteration.
- Verify all six PNG bytes against the current GitHub tree and preserve artwork unchanged. No new visual art or gameplay balance changes.
- Add a reproducible npm run package:standalone command to embed original artwork into an offline HTML; its packaging assertions verify six valid PNGs and identical game code after restoring the manifest. Native render tests also accept embedded-image builds. Output is dist/BLAST_TANKS_V0_3_1.html (3,016,434 bytes).

### Actual validation
- Before the fix, the new fire-ownership regression failed: second pointer captured FIRE (21 rather than owner 20). Afterward it passes.
- npm test: 44 passing groups (12 gameplay, 12 projectile, 20 touch/audio). Six added groups cover fire ownership/stale capture loss, independent Space/touch firing, failed capture/window release, interrupted/closed audio recovery, held Escape/reset events and retry after a synchronous resume failure. Existing rejected-promise/missing-audio, mute/volume, voice-cap, simultaneous steering/fire, responsive steering, speed, wall/corner collision, damage, routing, round completion and restart tests still pass. Pointercancel mock now includes the real event's pointerId.
- The fallback-audio test uses shared mock listeners, so it runs last to avoid replacing the primary game's handlers before input checks. Asset fallback assertion now uses the supplied build's source URL, allowing the same checks on an embedded manifest.
- Ran all 44 groups again against the standalone HTML: pass. The packaging byte-restoration check passes.
- npm run test:render passes for repository source and again for the standalone HTML: six original PNGs decoded; arena and armed wall-impact scenes rendered at 844x390, 667x375 and 1024x768. Inspected the 844x390 wall-impact image. This is native Canvas, not HTML/CSS browser rendering.
- Playwright Chromium launch attempted and failed: executable absent at /root/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell. Browser layout, genuine multitouch, Safari audio policy and physical-device listening remain unverified. Audio tests use mocks and do not establish acoustic realism.

### Next priorities / limitations
Get iPhone/iPad landscape feedback on fast cardinal slides, notch-side reach, simultaneous fire and sound after app switching. Listen to the existing mix before changing timbres or adding a vehicle loop/recorded samples. Continue CPU cover navigation and animation polish after that; no uncertain major design changes made here. No merge or deployment performed.

## 2026-11-05 — Turn-and-fire responsiveness (0.3.2)

### Inspection and reproduced issue
Checked the current open PRs (#2 development and #1 asset upload), recursive repository tree and all project source/tests/documentation. PR #2 is still open at 0287865c4999bc14f01a439170c0b977e1daf497, so continued dev/fortress-battles. No AGENTS.md is present. Verified cached source/artwork against the fresh Git tree and fetched the remaining test files from that exact head before editing. All six PNG originals remain unchanged.

A D-pad event changes steering intent immediately, but the tank heading used to update only during movement. Pressing FIRE between that event and the next animation frame therefore shot in the previous direction. Held fire also ran before movement, allowing a stale-heading shot on a turning frame. Added an immediate-up regression first: it failed with “Shot must follow the latest steering direction” against the current baseline.

### Changes
- Centralise reading keyboard/touch direction in playerDirection(). Gesture-triggered FIRE/Space resolves the latest directional intent before shooting, even between frames. Do not advance the tank position from input handlers.
- Process player movement/turning before automatic held fire in the simulation update. This also honours a blocked turn's heading while preserving collision checks.
- Keep shooting cooldown, shell limits/lifetime, wall sweep, warning fuse, hull/armour, protected approaches, base speed (90), CPU behaviour, D-pad dimensions/dead zone/hysteresis and separate pointer ownership intact. No new art, animation, sound timbres or vehicle loop in this focused input bug-fix iteration; existing synthesized audio and volume/mute/recovery remain intact.
- Bump to 0.3.2 and regenerate the embedded-artwork standalone HTML through the committed packaging script; README documents the behaviour.

### Actual tests and results
- npm test passes 52 groups: 12 gameplay, 12 projectile and 28 touch/audio. Eight added checks cover immediate turns plus FIRE in all four directions before any simulation frame, held-fire thumb sliding on the next update, immediate keyboard direction plus Space, wall sweep/fuse after an immediate turn, and centre dead-zone heading/cooldown preservation. The pre-frame checks also assert unchanged tank position, speed and cooldown.
- Existing tests still cover simultaneous steering/fire, pointer cancellation/capture loss/window release, damage/armour/invulnerability, map routes and protected approaches, wall occlusion, pause/completion/restart, safe-area transforms, audio creation/interruption/mute/volume/voice limits and missing/rejected Web Audio APIs. These are DOM/audio mocks, not actual browser gestures or listening.
- npm run package:standalone passes: all six valid original PNGs embedded; restoring the manifest yields identical game source. Output: dist/BLAST_TANKS_V0_3_2.html (3,016,767 bytes).
- Ran all 52 groups again against the standalone HTML: pass.
- npm run test:render passes for source and standalone: six real PNGs load and arena/armed wall-impact scenes render at 844x390, 667x375 and 1024x768. Inspected the 667x375 wall-impact render. Native Canvas does not render HTML controls or reproduce Safari.
- Fresh Playwright Chromium launch fails because /root/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell is absent. No browser CSS/multitouch, physical iPhone/iPad, frame-rate or sound-quality verification claimed.

### Next priorities / limitations
Play on physical Safari to assess rapid thumb turns while firing, dead-zone feel, reach and audio after app switching. Then refine the mix/vehicle audio with listening evidence and improve CPU escape/cover navigation and animations. Direct tap movement still has no pathfinding; lingering-blast damage rules remain unchanged pending a deliberate design decision. No merge or deployment performed.

## 2026-11-05 — Compact standalone build and startup checks (0.3.3)

The player reported that the 0.3.2 HTML no longer loaded. The exact failure could not be reproduced locally. The new standalone export embeds smaller PNG copies of the six existing sprites at up to 192 pixels on the longest edge. This brings the file down from 3,016,767 to 552,689 bytes. The repository artwork and full resolution packaging option are preserved. The page now shows an opening instruction when JavaScript is disabled and a message if the viewer cannot create a 2D canvas.

The 52 gameplay, projectile and input/audio groups passed on the source and compact export. The native render harness now checks the initial menu frame, invokes the wired Deploy button and renders the first live frame with four tanks. It also decoded all six sprites and rendered arena and wall impact scenes at 844×390, 667×375 and 1024×768 for both versions. The compact arena render was visually inspected. Packaging confirmed the game code is identical to the source once the asset URLs are restored. Physical Safari and the iOS file viewer were unavailable for testing.
