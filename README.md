# Blast Tanks — Fortress Battle

An offline HTML5 arcade battle for four tanks, built on the original Tank-battle implementation. Designed for iPhone/iPad landscape, with keyboard support.

## Play / host
Upload `index.html` and the entire `assets/` directory together to your web host. No build step, API key or multiplayer server is required. Serve over HTTP for reliable asset loading (`python3 -m http.server 8000` for local development).

Move using the D-pad, WASD/arrow keys, or tap a clear route. Hold FIRE/Space to launch shells. Amber impact rings warn of a cross-blast after 0.7 seconds. Retreat from your own shells too. Crates break; rocks stop blasts. All tanks start with four hull points and one armour charge. The last survivor wins. Pause with the top-right button or Escape.

## Validation
`npm test` runs the gameplay suite and projectile regressions with a mocked DOM/canvas and no dependencies. Projectile checks cover point-blank stone impacts in four directions, clipped barrels, swept wall/tank contacts, crate fuse timing and restart cleanup.

Optional native rendering checks: `npm install`, then `npm run test:render`. This loads all six real PNG assets and produces `artifacts/arena-*.png` and `artifacts/impact-*.png`. Native rendering is not a browser test.

The build has not been verified on physical iPhone/iPad Safari. Check safe areas, simultaneous movement/fire, menu scrolling, rotating, returning from another app and audio expectations before releasing. There is no sound system in this version.

## Assets
The six PNGs are the user's existing artwork from the repository's `assets` branch (upload PR #1), now included at the paths used by the game. Original source images are preserved. Runtime canvases cache smaller copies for drawing. The large blast-reference sheet is not loaded; the cross-blast is rendered in code.

See DEVELOPMENT_LOG.md for changes, measurements and remaining work.

