# Blast Tanks v0.4.0 — online setup

This release keeps offline play and adds 2–4 human players online, with CPU tanks filling empty places. All four battle maps work offline and online: Forest Fortress, Desert Crossroads, Industrial Grid and Island Bunkers. Online human tanks have equal hull and armour; the host’s difficulty setting affects CPU tanks only.

The server is prepared, but is NOT deployed yet. You will need your own Cloudflare Worker URL. No paid domain is required. Do not use a Bounce Rush or Three-Point Rush server address: this game uses its own protocol.

## 1. GitHub: use the prepared game branch

1. Open https://github.com/Dudane104/Tank-battle/pull/2 in Safari.
2. The new v0.4.0 files are on `dev/fortress-battles`. This guide assumes that branch has been updated successfully; the chat will state whether the upload succeeded.
3. You can deploy this branch for testing without merging it. In the steps below, select `dev/fortress-battles` wherever a branch is requested. Only use `main` after you have reviewed and merged the pull request.
4. Check the branch contains `wrangler.jsonc`, `server/worker.mjs`, `server/engine.mjs` and `public/index.html`.

If the GitHub update was blocked, unzip BLAST_TANKS_V0_4_0_FULL_PACKAGE.zip and upload its contents to a new branch of your repository first. Keep the `server` and `public` folders intact. GitHub’s desktop website has Add file → Upload files; Safari’s Request Desktop Website may help on an iPad. Upload extracted files, not the ZIP itself.

## 2. Cloudflare: deploy the game server from GitHub

1. Sign in at https://dash.cloudflare.com/ using Safari.
2. Open **Workers & Pages**, then **Create application**. Choose the option to import/connect a Git repository for a **Worker**, rather than a Pages/static website project.
3. Connect GitHub if asked, allow Cloudflare access to `Dudane104/Tank-battle`, and select that repository.
4. Enter these settings. If the branch selector is in the build settings, change it there before deploying:

| Setting | Value |
| --- | --- |
| Worker name | `blast-tanks-server` |
| Production branch | `dev/fortress-battles` |
| Root directory | Repository root (leave blank or `/`) |
| Build command | Leave blank |
| Deploy command | `npx wrangler@4 deploy --config wrangler.jsonc` |

5. Let Cloudflare create its build token when offered, then select **Deploy**. The included Wrangler configuration creates the `ROOMS` binding and SQLite-backed `BattleRoom` Durable Object automatically. Do not paste just worker.mjs into a Hello World editor: it imports engine.mjs and needs this binding.
6. Once the build succeeds, copy the HTTPS `workers.dev` address shown for the Worker. It will resemble `https://blast-tanks-server.YOUR-SUBDOMAIN.workers.dev`.
7. Open that address with `/health` added. The response should include `"ok":true` and `"game":"Blast Tanks"`.

Cloudflare's labels can vary. If you see a static website/Pages build screen or cannot find the Git import option, stop at that screen and share its screenshot rather than creating a different kind of deployment.

Alternative for a computer with Node.js: extract the FULL_PACKAGE, open a terminal in it, run `npx wrangler@4 login`, then `npx wrangler@4 deploy --config wrangler.jsonc`. This produces the same Worker and bindings.

## 3. Netlify: publish the game page

**For a separate test site:**

1. Download `BLAST_TANKS_V0_4_0_NETLIFY.zip` and extract it in Files.
2. Sign in at https://app.netlify.com/ and use the manual deploy/Netlify Drop option at https://app.netlify.com/drop . Upload the extracted folder, or the ZIP if the picker offers ZIP upload.
3. Open the resulting site address in Safari landscape. The package has `index.html` at its root and all six images embedded; it needs no build command.

**To deploy from GitHub instead:** import `Dudane104/Tank-battle` into a new Netlify project, select `dev/fortress-battles`, leave the build command blank and set the publish directory to `public`. The included netlify.toml supplies the publish directory.

**For your existing PJC Games Hub:** do not upload this game-only ZIP over the whole hub: a full manual deploy replaces the site's files. This ZIP is not a rebuilt Games Hub package. When integrating it, place its index.html in the hub's existing Blast Tanks folder and redeploy the complete hub. Its Back to Games Hub link points to https://pjc-games.netlify.app/ .

## 4. Connect the game and play with a friend

1. Open the Netlify game page on both devices.
2. On the host's device, choose a map and CPU difficulty in the main menu, then select **Online Multiplayer**.
3. Paste your Cloudflare HTTPS Worker address into **Server address**. Leave **Room code** blank and tap **Create / Join Room**.
4. A six-letter code appears. Share that code and the SAME server address with your friend.
5. Your friend opens Online Multiplayer, pastes the server address, enters the code and taps Create / Join Room.
6. Once at least two people are connected, the host taps **Start Battle / Rematch**. Up to four people can join before the battle starts; remaining tanks are CPU controlled.
7. Each screen identifies its tank colour and marks that tank YOU. Use the sliding D-pad and hold FIRE. Only the host can start a rematch.

The server address is remembered on that browser, so you normally paste it only once. Private browsing or clearing website data can remove it. Once you send me the real address, I can embed it in the next package so new players do not need to paste it.

## 5. Quick check before sharing widely

- Try an offline battle and each map first.
- Host on an iPad and join on a phone, ideally on separate internet connections.
- Check one player cannot steer the other player's tank; check firing, cover destruction, pickups and the winner agree on both devices.
- Finish a battle and try a host rematch. Check the chosen map is preserved.
- Switch away from one device: its steering/fire should stop. The match continues; online pause opens room controls and does not freeze the other players.
- Leaving a room hands that tank to the CPU. The host role transfers if the host leaves. When everyone leaves, the room is discarded.
- A dropped connection requires leaving/rejoining after the round, or creating a fresh room. There is no mid-round reconnection or saved match recovery in this first online version.

## Troubleshooting

- **Connection failed:** confirm the HTTPS Worker address, successful deployment, and /health response. WebSocket handshake errors can also mean a missing/full room or a battle already in progress. Clear the old code to create a new room.
- **Only one player:** the host needs one friend before starting; offline Deploy is available for solo play.
- **Host cannot start:** check the other player entered the same server address and room code. Only the host has start permission.
- **Cloudflare build fails:** check the production branch and root directory, then read the build log. `ROOMS` and `BattleRoom` must match the supplied wrangler.jsonc. This release uses a SQLite migration, not a KV-backed Durable Object.
- **Netlify page not found:** check index.html is at the manual ZIP/folder root, or publish `public` for a Git build.

## What is verified, and what remains

The existing 60 gameplay/control groups pass. Additional tests cover all four maps, independent human input, equal online hull, server damage/cover rules, room host permissions, CPU slots, stale input, rematches, disconnections, rate limits and the client room/winner flow. Real-image native canvas rendering passes at 667×375, 844×390 and 1024×768. These are local automated checks with simulated socket sessions; they do not prove deployed Cloudflare connectivity.

A local Chromium launch is blocked by this environment. Actual Cloudflare deployment, cross-device internet latency, physical Safari multitouch/audio and live billing/limits remain unverified. Match state is held in memory, so deployment/server restarts end current rooms. Battles stop at four minutes and draw if several tanks remain. The real-time simulation keeps its Durable Object active while a battle runs; monitor Cloudflare usage before opening the server to substantial traffic.

## Official setup references

- Cloudflare Git builds settings: https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- Durable Object WebSocket example and bindings: https://developers.cloudflare.com/durable-objects/examples/websocket-server/
- SQLite migration guidance: https://developers.cloudflare.com/changelog/post/2026-07-09-restrict-new-kv-backed-namespaces/
- Netlify manual deployment: https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/

## Artwork / credits

This release uses the six tank, rock, crate and rocket PNG files supplied for this project. No new third-party artwork, music or sampled sound was added. Combat audio is synthesised in code. Keep any attribution required by the original provenance of the supplied artwork; this update does not establish new licensing evidence for it.
