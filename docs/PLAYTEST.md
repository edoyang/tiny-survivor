# PLAYTEST.md

## HANDOVER — read this first

### How to run it

On a phone (the real target):

```bash
npm install
npx expo run:android
```

Skia is not available in Expo Go; it must be a dev build. For a release
build: `npx expo run:android --variant release`. iOS needs a Mac or EAS.

On a Windows laptop (test target, browser):

```bash
npm install
npm run web
```

Move with WASD/arrows or mouse-drag joystick. Verification shipped with the
repo: `npx tsc --noEmit`, `npm test` (69 tests),
`npx expo export --platform android` and `npx expo export --platform web`,
all green. The scripted Chromium session predates the gear rework and was
not re-run, so nothing in the new gear, preset or spawning work has been
seen moving.

### What was never verified, stated plainly

- **The game has never run on a phone.** Every phase was verified by unit
  tests on the pure simulation and by the bundler. After web support was
  added, a scripted Chromium session verified the game *in a browser*: menu,
  class select, floor tiling, keyboard movement, enemies chasing, sword and
  fireball flight, gem drops, the level-up overlay (three cards, pick,
  resume), and pause all render and work. Touch input, device frame rate,
  and everything below still had no device test.
- **All feel numbers are guesses.** Every one lives in
  `src/game/data/tuning.json` (feel), `classes.json` / `weapons.json` /
  `monsters.json` / `waves.json` / `items.json` (balance). The sections
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
- Bosses are always the big blue `monster` sprite: mini at 2.2x (10:00),
  final at 3x (15:00).
- At the 200-enemy cap, the farthest enemy is recycled to the spawn ring;
  bosses are never recycled.
- Levelling still exists — the three cards now hand out gear stars instead of
  generic upgrades. Six items per build, hold five, plus three general slots.
- The run does not stop at 15:00; the boss spawns, everything else stops, and
  killing it wins.
- The owner's spawn ramp was read as the *interval* schedule; pack size is a
  separate number that starts at 2 so nothing ever arrives alone.
- Boots of the Gale slows enemies, since nothing in the game fires a
  projectile at you.

### Unresolved blockers (full list in BLOCKERS.md)

- No priest staff sprite — priest carries a gold-tinted wand.
- No XP gem sprite — gems are a drawn 6 px diamond.
- No magic missile sprite — missiles are a drawn 6 px bolt, and icicles and
  shards reuse it.
- No minion sprite — familiars, spirits and ballistae are all a small orb.
- The other 173 effect sheets were classified by measurement, never looked at
  as pictures; the seven in use may not depict what their names claim.
- docs.expo.dev was unreachable from the build environment; Expo usage was
  written against the installed SDK 57 package sources instead.

### Windows-laptop testing notes

- The web build exists so runs can be tested without a phone. Keyboard
  (WASD/arrows) works alongside the mouse-drag joystick; keyboard is
  web-only and compiled out of native builds.
- Judge *feel* on the phone, not the laptop: browser timing, input latency
  and pixel scaling all differ. Balance (spawn pressure, class damage,
  upgrade pacing) is fair to judge in the browser.

Every number in the game that can only be judged by playing it, with the
`data/tuning.json` key that changes it. The owner's punch-list.

## Camera zoom and attack reach (retuned twice post-Phase 8 on owner feedback)

These two numbers are locked together and a test now enforces it.

- **`tuning.json` `render.worldScale` = 1.5** (shipped at 3, then 2). On a
  360 dp phone that is a 240 x 520 world-unit view.
- **`weapons.json` `acquireRange` = 120** (was 280), which is exactly the
  visible half-width at that zoom. Nothing can now be targeted off-screen.
  `abilities.searchRange`, `beamLength` and `minionRange` are 120 for the same
  reason.
- **`projectiles.test.ts` fails if that invariant breaks.** Zoom in, or raise
  a range, and the suite says so rather than the bug reaching a play session.
  If you change `worldScale`, expect to change all four ranges with it.
- **Projectile lifetimes were cut to match**: fireball `range` 280 -> 140,
  sword `lifetimeSeconds` 2.5 -> 1.6, missile 3.0 -> 1.6,
  `abilities.icicleLifetimeSeconds` 2.5 -> 1.5, `bombRangeSeconds` 1.4 -> 0.9.
  Shots no longer fly a screen and a half off into nothing.
- **This is a real difficulty increase and is untested by play.** You now let
  enemies get roughly twice as close before anything dies, and the horde
  events at 5/8/11/14 minutes were sized against the old 280 reach. If they
  are now impossible rather than tense, cut `hordes[].count` in `waves.json`
  before touching `acquireRange` back up.
- `worldScale` 1.5 is not a whole number, so a 16 px sprite maps to 24 px and
  some art pixels are one screen pixel wider than others. It is only visible
  on a 1x display; on a 2x/3x phone it is invisible. If it bothers you, 2 is
  the nearest crisp value and 1 is the next zoom-out step (sprites get very
  small).

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

## Phase 3 — hero rig (retuned post-Phase 8 on owner feedback)

All keys in `tuning.json` `heroRig`.

- **Idle is now completely still**: `idleBobHeight` = 0 and
  `weaponIdleSwingDeg` = 0. The hero does not move at all when standing.
  `idleBobHz` = 1.5 is still there and does nothing until a height is set —
  put `idleBobHeight` back to 2 if a gentle breathing bob is wanted.
- **Walking was softened**: `walkBobHeight` 3 -> 1.5, `walkBobHz` 4 -> 3,
  `walkSquashAmount` 0.06 -> 0.025, `weaponWalkSwingDeg` 6 -> 3. If it now
  reads as a slide rather than a walk, raise `walkBobHeight` first.
- **Level-up shows three portrait cards side by side**, each with a coloured
  banner (NEW / STAR n / AWAKEN), a crest, the item name, five star pips
  filled to what the pick would give you, and the effect text. Cards are
  `minHeight` 260 and flex to the screen width, so three across is the design
  limit — a fourth offer slot would need a rethink.
- **Menu cards fill the screen height** (four flex cards, no scrolling) with
  an 80 px hero and 40 px weapon icon. Picking a build opens a panel listing
  that build's six exclusive items — star effect and awakening for each — with
  an X to back out and "LET'S GO TO BATTLE" to start. The three shared items
  are not repeated there; they are the same in every build.
- **"Skip confirmation" sits at the bottom of the hero screen**, not inside
  the panel, so it can be set before ever opening one. It lives in memory only
  (`src/render/skipConfirm.ts`) and resets when the app restarts — persisting
  it needs a storage dependency, which was not added without being asked.
- **The attack swing was not touched** and still fires while standing still:
  `attackSwingDeg` = 50 over `attackOutSeconds` 0.06 then an eased return over
  `attackReturnSeconds` 0.25. It is the only hero motion left when idle, which
  is the point — it has to read clearly now that nothing else moves.
- **Weapon grip/pivot**: `weaponGripOffsetX` 6, `weaponGripOffsetY` 3,
  `weaponPivotX` 8, `weaponPivotY` 13. These place the weapon in the hand;
  they are eyeballed against 16x16 sprites and were never checked per class.

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

## Gear, builds and the 15-minute run (post-Phase 8) — every number guessed

Nothing in this section has been played. It is the part of the game most
likely to need retuning, and every number is one JSON edit away.

### The shape of a run

- **15:00 is the finale, not a stop.** Packs, hordes and elites all stop the
  moment the boss spawns at `boss.atSeconds` = 900. Killing the boss shows
  "BOSS DOWN"; dying shows "YOU FELL". If the boss is a slog, drop
  `boss.hpMult` (260) first — with a five-item build I have no idea whether it
  takes 30 seconds or five minutes.
- **Mini boss at 10:00** (`miniBoss.hpMult` = 90). Meant as a difficulty
  check, not a wall.

### Difficulty curve, minute by minute (`data/waves.json` → `packs`)

Every entry is `intervalSeconds` (how often a pack lands) and `packSize` (how
many arrive together). Enemies never spawn alone.

| Window | Every | Pack | Types | HP scale |
|---|---|---|---|---|
| 0:00–0:30 | 5.0 s | 2 | slime | 1.0 |
| 0:30–1:00 | 3.0 s | 3 | slime, fly | 1.0 |
| 1:00–1:30 | 2.5 s | 5 | slime, fly | 1.1 |
| 1:30–2:30 | 2.2 s | 7 | + bunny | 1.2 |
| 2:30–3:30 | 2.0 s | 9 | slime, fly, bunny | 1.35 |
| 3:30–5:00 | 1.8 s | 11 | + monster | 1.5 |
| 5:00–7:00 | 1.7 s | 13 | fly, bunny, monster | 1.8 |
| 7:00–9:00 | 1.6 s | 15 | bunny, monster | 2.2 |
| 9:00–11:00 | 1.5 s | 17 | fly, bunny, monster | 2.7 |
| 11:00–13:00 | 1.4 s | 19 | all four | 3.3 |
| 13:00–15:00 | 1.3 s | 21 | all four | 4.0 |

- To make a window harder or easier: change that row's `packSize` first,
  `intervalSeconds` second, `hpScale` last.
- **Hordes** at 5:00, 8:00, 11:00, 14:00 — 60 / 80 / 100 / 120 enemies
  spawned evenly around the full circle in a single tick. This is the "cut
  your way out or run" moment. If a horde is unsurvivable rather than tense,
  drop `count` before touching anything else. If it lands on top of a pack
  and the cap swallows half of it, move `atSeconds` off the pack beat.
- **Elites** from 2:00, every 90 s. hp x10, damage x2, xp x12, drawn 1.5x.
- **Concurrent cap** stays at 200 (`concurrentCap`). A 120-strong horde plus
  standing pressure will sit near it; the furthest enemy behind you is
  recycled, and bosses are never recycled.

### Builds and items (`data/items.json`, `data/presets.json`)

- **Twelve builds, three per class.** A run can choose from that build's six
  exclusive items plus the three general ones — nine candidates — and holds
  **five in total** (`tuning.json` `items.totalSlots`). Exclusive and general
  share the one pool, so taking all three general items leaves room for only
  two build items. Four of the nine always get left behind.
- **Star scaling is linear.** An item's `stats` block is added once per star,
  so a five-star Staff of Cinders is +70% damage. If the fifth star feels
  like nothing, the fix is a curve, not bigger numbers — say so and it
  becomes one.
- **Awakening is the sixth pick.** `awakenStats`, `awakenFlags` and
  `awakenAbility` all land at once. These are the moments the build is
  supposed to change character, so if an awakening lands with no visible
  difference that is a bug worth reporting.
- **Ability intervals are the main pacing lever.** Roughly: strikes and
  seekers 2–3.5 s, bombs ~3 s, novas 4–8 s, storms and hordes-clearers 8–9 s,
  meteors 5 s. All in `items.json` per item, with `perStar.interval` shaving
  it down as stars go in.
- **`items.totalSlots` = 5** in `tuning.json`. If holding five of nine feels
  punishing rather than interesting, this is the single knob. Raising it to 9
  removes the choice entirely.
- **Damage reduction is capped at 75%** (`items.damageReductionCap`). Several
  builds stack it; without the cap the tanky priest and dwarf kits go
  untouchable.
- Untuned and most suspect, in order: `stillDamage` on Anchor Boots
  (+50% at awakening, on a build that wants to stand still anyway), the crit
  pair on Executioner (`critChance` + `critMult` + a flat +40% damage), and
  `bombCluster`, which triples the number of live explosions.

### Effects and their feel keys (`tuning.json` → `render`)

- **Every effect sprite is drawn at its real damage radius.** A meteor with a
  54-unit blast draws 54 units across; a fireball explosion draws at its
  `aoeRadius`. That means area upgrades are visible: stacking Hat of the
  Arcane widens the sprite exactly as much as it widens the damage. Before
  this, effects were drawn at a fixed 0.42 scale and a meteor's art covered
  under half its blast, which is why nothing read on screen.
- `effectRadiusMult` = 1.15 — how far the art overshoots the damage circle.
  1.0 draws the hitbox honestly; higher looks punchier and lies slightly.
- `effectSeconds` = 0.6 — how long a one-shot burst plays for, spread across
  whatever frame count that sheet has (5 to 14).
- `hitEffectRadius` = 11 / `castEffectRadius` = 24 — the size used by effects
  that have no area of their own: single-target icicle impacts, riposte
  slashes, heals and volley bursts.
- `effectFps` = 18, `fieldFps` = 12 — playback speed of bursts and of
  persistent fields.
- Persistent fields (auras, storms, trails, the nova ring) scale their sprite
  to the field's actual radius too, so they always show their true reach.

### Other new feel keys (`tuning.json` → `items` / `abilities`)

- `invulnPulseSeconds` 10 / `invulnPulseDurationSeconds` 3 — Athena Helm's
  awakened invincibility beat, taken from the brief.
- `lifestealFraction` 0.3 — Potion of Vigour heals 30% of damage taken, after
  the hit lands, so lethal damage still kills.
- `recastOnKillChance` 0.3 — as specified.
- `shatterCount` 3 / `shatterDamageMult` 0.5 / `shatterSpreadDeg` 40 — Robe of
  Magi's shards.
- `pierceBurstRadius` 42 / `pierceBurstDamageMult` 2 — Sentinel Plate.
- `blinkDistance` 26 — Treads of Ether's escape hop. Likely the twitchiest
  number in the game.
- `freezeShatterRadius` 34 / `freezeShatterDamage` 26, `burnSpreadRadius` 40,
  `gemBlastRadius` 30 / `gemBlastDamage` 14.
- `abilities.pullStrength` 70 — how hard rifts and hooks drag. Too high and
  the crowd teleports.
- `abilities.minionOrbitRadius` 26 / `minionOrbitDegPerSec` 60 /
  `minionShotSeconds` 1.5 / `minionRange` 220.
- `abilities.fieldDamageIntervalSeconds` 0.5 — how often every damage field
  ticks. Changing this rescales every field item at once.

## Phase 7 — progression

- **XP curve**: `tuning.json` `leveling.baseXpToLevel` = 6,
  `leveling.xpGrowthPerLevel` = 4 (level N needs 6 + 4(N-1) xp). With slime
  xp 1, that is roughly a level every 15-20 early kills. If level-ups feel
  rare in minute one, drop base to 5; if they spam, raise growth to 6.
- **Item balance** now lives in `data/items.json` — see the gear section below.
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
