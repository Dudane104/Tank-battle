# Blast Tanks — Fortress Battle

An offline HTML5 arcade battle for four tanks, built on the original Tank-battle implementation. Designed for iPhone/iPad landscape, with keyboard support.

## Play / host
Upload `index.html` and the entire `assets/` directory together to your web host. No build step, API key or multiplayer server is required. Serve over HTTP for reliable asset loading (`python3 -m http.server 8000` for local development).

Move using the larger D-pad (slide your thumb between directions without lifting), WASD/arrow keys, or tap a clear route. Touch steering chooses one cardinal direction at a time, with a small centre dead zone and slight corner alignment assistance. Hold FIRE/Space to launch shells. Amber impact rings warn of a cross-blast after 0.7 seconds. Retreat from your own shells too. Crates break; rocks stop blasts. All tanks start with four hull points and one armour charge. The last survivor wins. Pause with the top-right button or Escape.

## Validation
`npm test` runs the gameplay suite and projectile regressions with a mocked DOM/canvas and no dependencies. The touch/audio suite covers thumb sliding, independent fire touches, cancellation, next-frame steering, corner alignment, safe-area layout, gesture unlock, mute/volume, audio failure fallback and voice limits. Projectile checks cover point-blank stone impacts in four directions, clipped barrels, swept wall/tank contacts, crate fuse timing and restart cleanup.

Optional native rendering checks: `npm install`, then `npm run test:render`. This loads all six real PNG assets and produces `artifacts/arena-*.png` and `artifacts/impact-*.png`. Native rendering is not a browser test.

The build has not been verified on physical iPhone/iPad Safari. Check safe areas, simultaneous movement/fire, menu scrolling, rotating, returning from another app and audio expectations before releasing. Layered synthesized firing, armour-impact, pickup and explosion effects unlock when you start/touch the game. Sound on/off and volume settings are in the menu; SOUND ON/OFF is also available during play. Preferences are saved when browser storage is available. These are procedural effects, not recorded tank audio. Physical Safari listening remains unverified.

## Assets
The six PNGs are the user's existing artwork from the repository's `assets` branch (upload PR #1), now included at the paths used by the game. Original source images are preserved. Runtime canvases cache smaller copies for drawing. The large blast-reference sheet is not loaded; the cross-blast is rendered in code.

See DEVELOPMENT_LOG.md for changes, measurements and remaining work.




## Offline single-file build
Run `npm run package:standalone` to create `dist/BLAST_TANKS_V0_3_2.html` with all six original PNGs embedded. The script checks that packaging preserves game code. To test that output, pass its path to each `tests/gameplay.cjs`, `tests/projectiles.cjs`, `tests/touch-audio.cjs` and `tests/render.cjs` command (the last needs the optional canvas dependency).

Version 0.3.1 fixes extra-finger cancellation of held FIRE, independent Space/touch release, failed pointer capture cleanup and audio recovery on Resume after interruptions. The sliding D-pad, speed and tactical battle balance are unchanged. Native tests do not establish physical Safari touch feel or listening quality.

Version 0.3.2 resolves steering before gesture-triggered fire and turns/moves before automatic held fire. A quick D-pad slide plus FIRE now shoots in the current requested direction, including when both events arrive between animation frames. Movement speed, cooldown and tactical battle rules remain unchanged.
