[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/qienzdork/heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/qienzdork/heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

# Midnight Vault — The Meridian Job

A top-down stealth heist game in three acts. You are **Vex**, a thief working
one impossible night: the **Meridian Gallery**, the **Halcyon Bank**, and the
**Gilded Casino**. Cross each room, read the patrols, crack the vault target,
and reach the exit — rich, or not at all.

## How it plays

- **Move** with WASD or the arrow keys. Walls and crates block you — and block
  every line of sight, so cover is real.
- **Guards** patrol in loops with raycast vision cones. Being seen fills their
  suspicion; a full meter means a chase, and a touch means busted. A thrown
  coin (click, $100) pulls the nearest guard off to investigate the noise.
- **Cameras** sweep their cones on a timer. An EMP (Q, $500) blinds every
  camera for 6 seconds.
- **The vault**: stand close and hold **E** for 1.2 seconds to crack it. The
  alarm jumps +15 and the green exit unlocks.
- **The alarm** (0–100) rises while you are seen and decays while you are
  hidden. At 100% the building locks down and the job is over.
- **Score**: loot stashes, a time bonus, an alarm penalty, and the tools you
  spent. Finish with a rank: **GHOST / CLEAN / PRO / LOUD**.

Title, per-act briefing, pause, busted, act-complete breakdown and
game-complete screens are all in the game. All sound is synthesised with
WebAudio — no audio files, no network requests, no libraries. Every pixel is
drawn in canvas code.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` directly in a desktop browser. Screenshots are
taken from the game's own code: `?shot=cover|play|vault|win&seed=1`.

## Layout

- `game/` — the playable game (`index.html`, `style.css`, `js/`)
  - `js/main.js` — game loop and state machine
  - `js/levels.js` — the three act maps, patrols and briefings
  - `js/world.js` — tile grid, collision and raycast line of sight
  - `js/guards.js` — guard AI (patrol / investigate / chase)
  - `js/cameras.js` — sweeping cameras and the EMP blind
  - `js/render.js` — all canvas drawing: rooms, cones, HUD, screens
  - `js/audio.js` — WebAudio synth sounds
  - `js/input.js` — keyboard and mouse
  - `js/random.js` — seeded RNG
  - `js/selftest.js` — in-page assertions (`?selftest=1`, 10 checks)
- `main.ts` — the make.fun hand-in program (copies `game/` + `screenshots/`,
  writes `dossier.json` with the vendored library)
- `screenshots/` — 4 real renders of the game's own code (1280x800 JPEG)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

## Self-test

Open `game/index.html?selftest=1` in a browser: 10 checks run in the page —
map validation, raycast blocked by walls, alarm decay/rise, EMP blinding
cameras, coin pulling a guard, the vault channel opening the exit, wall
collision, camera sight raising the alarm, guard touch busting the player,
and a full level-1 playthrough. Current result: **10/10 PASS**.

## License

MIT — see `LICENSE`.
