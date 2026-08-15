# PLAYTEST.md

## HANDOVER — read this first

### How to run it

```bash
npm install
npx expo run:android
```

Skia is not available in Expo Go; it must be a dev build. For a release
build: `npx expo run:android --variant release`. Neither could be run in the
build environment (no Android SDK, no device) — the shipped verification is
`npx tsc --noEmit`, `npm test` (57 tests), and
`npx expo export --platform android`, all green at every phase commit.

### What was never verified, stated plainly

- **Nobody has ever seen this game run.** Every phase was verified by unit
  tests on the pure simulation and by the bundler, never on a screen. The
  first launch you do is the first launch, period.
- **All feel numbers are guesses.** Every one lives in
  `src/game/data/tuning.json` (feel), `classes.json` / `weapons.json` /
  `monsters.json` / `waves.json` / `upgrades.json` (balance). The sections
  below name each key, its shipped value, and what to change if it feels
  wrong. Nothing needs a code edit.
- **Class balance is a guess**: wizard > knight > dwarf > priest is my
  ranking on paper, unverified (Phase 6 section).
- **Frame rate on device is unmeasured.** The sim itself costs ~8 us per
  60 Hz tick in Node on this machine with ~190 live enemies
  (`node --expose-gc scripts/bench-sim.ts` to re-run), which leaves the whole
  frame budget for rendering — but Hermes and the GPU were never profiled.
  The renderer draws everything in 4 drawAtlas batches + 2 hero sprites +
  2 joystick circles per frame, with off-view entities culled, so batching
  is structurally right; whether it holds 60 fps at the 200-enemy cap on
  your phone is unknown. If it stutters, lower `concurrentCap` in
  `waves.json` first.
- **Allocation in the hot loop**: verified in Node — retained heap is flat
  over 6000-tick runs at enemy cap; the V8 allocation profiler samples only
  transient boxed-number noise (~20 B/tick), no objects. Hermes was not
  profiled.
- **The renderer records one SkPicture per frame** (unavoidable garbage of
  the picture-per-frame pattern, outside the sim). If device profiling shows
  GC hitches, the fix is moving to Skia buffers/worklets — noted in
  BACKLOG.md, not done.

### Decisions where I picked one reading (full list in DECISIONS.md)

- Priest missile is single-target, no explosion of any kind.
- Monster frame 3 is a death frame, excluded from the walk loop (verified
  visually, so walk cycles are 3 frames, not 4).
- Knight's sword stops homing after it hits its acquired target, then flies
  straight while piercing.
- Knight weapon literally reappears only when the next attack is ready — in
  combat that means his hand is usually empty; if that looks wrong in play,
  say so and it becomes "reappear after the volley's last sword despawns".
- The periodic boss is always the big blue `monster` sprite at 2x.
- At the 200-enemy cap, the farthest enemy is recycled to the spawn ring.

### Unresolved blockers (full list in BLOCKERS.md)

- No priest staff sprite — priest carries a gold-tinted wand.
- No XP gem sprite — gems are a drawn 6 px diamond.
- No magic missile sprite — missiles are a drawn 6 px bolt.
- docs.expo.dev was unreachable from the build environment; Expo usage was
  written against the installed SDK 57 package sources instead.

Every number in the game that can only be judged by playing it, with the
`data/tuning.json` key that changes it. The owner's punch-list.

## Phase 2 — camera, view, joystick

All guessed, none playtested:

- `camera.stiffness` = 8. Higher snaps harder to the player, lower drifts more.
  If the camera feels laggy walking fast, try 12; if it feels rigid, try 5.
- `render.worldScale` = 3. Screen pixels per world pixel. At 3 a 16 px hero is
  48 px on screen. If sprites feel too small on a dense screen, try 3.5 or 4.
- `joystick.radius` = 60, `joystick.knobRadius` = 22 (screen px). Thumb travel
  for full speed. If full tilt is hard to reach, lower `radius`.
- `joystick.deadZone` = 0.1. Raise if the hero creeps when the thumb rests.
- Player move speed now comes from `data/classes.json` per class
  (`moveSpeed`: wizard 70, knight 75, dwarf 72, priest 68). All guessed.

## Phase 3 — hero rig

None of this can be judged from code; every number is a starting guess.

- **Idle bob**: `heroRig.idleBobHeight` = 2 px at `heroRig.idleBobHz` = 1.5.
- **Walk bob**: `heroRig.walkBobHeight` = 3 px at `heroRig.walkBobHz` = 4. Walk
  uses a hop curve (abs-sine) versus the idle float (sine); if walking looks
  like stomping, lower `walkBobHeight` to 2.
- **Squash and stretch**: `heroRig.walkSquashAmount` = 0.06 (6% scale wobble).
  If heroes look rubbery, halve it.
- **Weapon walk oscillation**: `heroRig.weaponWalkSwingDeg` = 6 degrees, synced
  to the walk bob. Idle keeps 40% of it so the weapon never freezes. I cannot
  judge whether this is too subtle next to the attack swing - check first play.
- **Attack swing**: `heroRig.attackSwingDeg` = 50, out in
  `heroRig.attackOutSeconds` = 0.06, eased (cubic) return over
  `heroRig.attackReturnSeconds` = 0.25. The out speed is what makes it read as
  an attack; if it reads as a twitch, raise `attackOutSeconds` to 0.1.
- **Weapon grip**: `heroRig.weaponGripOffsetX` = 6, `weaponGripOffsetY` = 3
  (px from body centre, in facing direction), rotating about sprite pixel
  (`weaponPivotX` = 8, `weaponPivotY` = 13), i.e. the handle. If weapons hover
  or clip the body, adjust the grip offsets.
- **Priest wand tint**: `heroRig.priestWandTint` = "#ffd166" (gold, modulate
  blend). Guessed; any hex colour works there.
- **Attack cadence** per class: `cooldown` in `data/classes.json`
  (wizard 1.1 s, knight 0.9 s, dwarf 1.6 s, priest 1.2 s). Guessed.

## Phase 4 — enemies and pickups

- **Monster stats** in `data/monsters.json` are all guesses: slime 10hp/22spd/4dmg,
  fly 6/34/3, bunny 14/28/5, monster 30/18/8, xp 1/1/2/3. If early minutes feel
  spongy, cut slime and fly hp first.
- **`player.iFrameSeconds`** = 0.4. Caps damage intake at ~2.5 hits/s in a
  pile-up. Longer feels safer, shorter deadlier.
- **`enemies.separationStrength`** = 40. How hard overlapping enemies push
  apart. Too high and crowds jitter; too low and they stack into one pixel.
- **`enemies.animFps`** = 6. Walk-cycle speed of the 3-frame monster loop.
- **`pickup.radius`** = 40, **`pickup.magnetSpeed`** = 140,
  **`pickup.collectRadius`** = 6. Gem vacuum feel. If collecting feels like a
  chore, raise radius to 55.
- **`pickup.gemColor`** = #5ee9a0 (there is no gem sprite in the pack; gems are
  a 6 px drawn diamond, see BLOCKERS).

## Phase 5 — difficulty curve (all in `data/waves.json`, all guessed)

Minute by minute as shipped. Whether minute three is tense or hopeless is
yours to judge; each line names the bracket to edit.

- **0:00–0:45** — slimes + flies, 1.2 spawns/s (bracket 1). A warm-up.
- **0:45–1:45** — bunnies join, 2.0/s (bracket 2).
- **1:45–3:00** — all four types, 2.8/s, enemy hp x1.15 (bracket 3).
- **3:00–4:30** — slimes retire, 3.6/s, hp x1.35, speed x1.05 (bracket 4).
- **4:30–6:00** — monster-heavy, 4.5/s, hp x1.6 (bracket 5).
- **6:00+** — bunnies and monsters only, 6/s, hp x2.2 (bracket 6). This is
  meant to be the survival wall.
- To make any window harder/easier: edit that bracket's `spawnsPerSecond`
  first, `hpScale` second.
- **Bursts**: every `burst.intervalSeconds` = 50 s, `count` = 16 of one type
  from one direction inside a `arcDegrees` = 50 arc.
- **Elites**: every `elite.intervalSeconds` = 75 s. hp x8, damage x2, xp x10,
  10% slower, drawn 1.5x.
- **Boss**: every `boss.intervalSeconds` = 180 s. The blue monster at hp x40,
  damage x3, xp x60, 25% slower, drawn 2x. With knight damage as shipped it
  takes roughly 45-60 s of sustained fire - unverified.
- **Concurrent cap**: `concurrentCap` = 200. At cap the farthest enemy is
  recycled to the spawn ring. Raise only after profiling on device.

## Phase 7 — progression

- **XP curve**: `tuning.json` `leveling.baseXpToLevel` = 6,
  `leveling.xpGrowthPerLevel` = 4 (level N needs 6 + 4(N-1) xp). With slime
  xp 1, that is roughly a level every 15-20 early kills. If level-ups feel
  rare in minute one, drop base to 5; if they spam, raise growth to 6.
- **Upgrade amounts** in `data/upgrades.json`: +1 volley (max 3), +25% damage
  (max 5), -12% cooldown (max 5), +25% blast (max 4), +1 pierce (max 4),
  +10% speed (max 4), +20 hp (max 5), +30% pickup (max 4). All guesses; the
  volley cap of 3 is the one most likely to warp balance (4 axes dwelling in
  a crowd is a lot of free damage).
- HUD refreshes at ~7 Hz from a snapshot diff, not per frame. If bars feel
  laggy, the interval is in `src/app/game.tsx` (150 ms).

## Phase 6 — class weapons (all in `data/weapons.json` unless noted)

Every number is a guess. Honest strength ranking guess, unverified by play:
**wizard > knight > dwarf > priest**. The wizard one-shots early slimes with
AoE splash; the priest's orb dps is auto but small. If the priest feels weak,
raise `orb.damage` to 8 or shorten `missile`'s class cooldown in
`classes.json`. If the wizard trivializes minutes 1-3, drop
`fireball.aoeRadius` to 28.

- **Wizard fireball**: damage 12, speed 170, AoE radius 36, range 280.
- **Knight sword**: damage 8, speed 230, pierce 3, turn 900 deg/s,
  lifetime 2.5 s. The turn rate is what makes "never miss" true; below ~500
  fast enemies can orbit out.
- **Dwarf axe**: damage 10, speed 150, out-range 90, dwell 1.0 s, re-hit
  0.5 s, return at x1.3 speed.
- **Priest orb**: damage 6, orbit radius 34, 200 deg/s, re-hit 0.5 s.
- **Priest missile**: damage 9, speed 160, turn 600 deg/s, single target.
- **Volley stagger**: `volley.staggerSeconds` = 0.12 between shots.
- **Acquire range**: `acquireRange` = 280 (roughly one screen height at
  scale 3). Heroes hold fire with nothing in range.
- Projectile looks: `tuning.json` `projectiles.*` — fireball drawn at 0.75
  scale (32 px art next to 16 px heroes), orb at 0.2 (100 px art), axe spins
  at 540 deg/s visually. The missile is a drawn 6 px bolt, colour
  `projectiles.missileColor`.
