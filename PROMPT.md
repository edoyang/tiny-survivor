# Tiny Survivors — Build Brief

You are building a survivor-like (bullet-heaven) mobile game in this repo. Read this
whole document before writing any code.

---

## 0. Working agreement

**Read the docs first.** This project is Expo SDK 57. The API has changed a lot.
Before using any Expo module, read its page under
https://docs.expo.dev/versions/v57.0.0/. Do not write Expo code from memory.

**Run autonomously.** Work through the phases below in order. Do not ask permission
to start the next phase. Do not stop to summarise progress and wait. Finish a phase,
verify it, commit it, begin the next one.

**Do not stop. Ever.** Run Phase 0 through Phase 8 in one continuous pass. The owner
reviews the finished game and requests fixes afterwards. He does not want to be
interrupted partway.

That means you never wait on an answer. When you hit something you would normally ask
about, write it down and keep moving:

| Situation | What you do |
|---|---|
| A number that can only be judged by feel (swing amplitude, spawn pressure, class balance) | Pick a sensible value, log it to `docs/PLAYTEST.md`, continue |
| A design question with two readings | Pick the one that matches §1–§11, log it to `docs/DECISIONS.md` with your reasoning, continue |
| A missing or ambiguous asset | Use the closest available substitute, log it to `docs/BLOCKERS.md`, continue |
| A verification step fails | Fix it. If genuinely stuck after real attempts, log it to `docs/BLOCKERS.md`, do the minimum to keep the build green, continue |

**The one hard invariant: the app must always build.** The owner is going to open the
finished thing and play it. A repo that does not compile gives him nothing to review, so
a phase never ends with a red build. If a feature cannot be made to work, ship it
disabled behind a flag and log it — do not leave broken code in the path.

Logging is not optional. `docs/PLAYTEST.md` is the punch-list the owner reads while
playing, and it is the only reason skipping the gates is safe. Every feel-dependent
number you guessed goes in it, with the file and line to change.

**Never launch the game.** The owner playtests. Do not run `expo start`, do not open a
simulator, do not take screenshots. Your verification is:

```bash
npx tsc --noEmit && npm test && npx expo export --platform android
```

All three must pass before you commit a phase.

**Code style.** Plain, boring, obvious code. No comments — name things so comments are
not needed. No clever abstractions until there are three concrete uses. No new
dependency without stating why the existing ones cannot do it.

**Push back.** If a phase requirement is scope creep, or will make the game worse, say
so in one or two sentences and then build what was asked unless told otherwise.

**Record what you verify.** Create `docs/ASSETS.md`. Every time you visually confirm a
sprite's frame layout, grid size, or anchor point, write it down there. Never guess a
frame index — if it is not in `docs/ASSETS.md`, verify it or ask.

---

## 1. What the game is

A `survivor.io`-style game. Portrait, one thumb. The player picks a class, walks around
an endless map with a virtual joystick, and attacks fire automatically. Enemies stream
in continuously and get denser over time. Killing them drops XP, XP levels you up, level
ups offer upgrades. You die, you see a results screen, you go again.

The player never taps to attack. Movement is the only input.

---

## 2. Current state of the repo

A stock `create-expo-app` template with nothing game-related in it.

- Expo SDK 57, React Native 0.86.2, React 19.2.3, TypeScript strict
- `expo-router` file-based routing, router root is `src/app/`
- Path aliases: `@/*` → `./src/*`, `@/assets/*` → `./assets/*`
- `app.json`: portrait locked, `reactCompiler` and `typedRoutes` experiments on
- Available now: `react-native-reanimated` 4.5.1, `react-native-worklets`,
  `react-native-gesture-handler`, `expo-image`
- **No renderer, no game code, no test runner, no state library**

`src/app/index.tsx` and `src/app/explore.tsx` are template welcome screens. Around 990
lines of boilerplate across `src/`. Delete all of it in Phase 0 — none of it survives.

---

## 3. Assets

Everything is in `SPRITES/` at the repo root. Note this is **outside** `assets/`; move
it to `assets/sprites/` in Phase 0 so it sits with the rest of the asset pipeline.

| Set | Size | Files |
|---|---|---|
| `HERO/` | 16×16 | `dwarf.png`, `knight.png`, `priest.png`, `wizard.png` |
| `Equipment/` | 16×16 | `axe.png`, `sword.png`, `wand.png` |
| `M_Slime/` | 24×24 | `tile_0000` … `tile_0003` |
| `M_Fly/` | 24×24 | `tile_0004` … `tile_0007` |
| `M_Bunny/` | 24×24 | `tile_0008` … `tile_0011` |
| `M_Monster/` | 24×24 | `tile_0012` … `tile_0015` |
| `Projectile/` | 256×32 strip, 100×100 | `fireball_strip.png`, `orb.png` |
| `T_Dungeon/` | 16×16 | `tile_0042`, `tile_0048`, `tile_0049` |

### Asset facts you must not assume

These are unverified. Confirm each one and write the answer into `docs/ASSETS.md`.

1. **Heroes have exactly one frame each.** There is no walk cycle spritesheet. All hero
   motion is therefore procedural — see §5.
2. **`fireball_strip.png` is 256×32.** That is *probably* 8 frames of 32×32. Verify
   before slicing. Do not hardcode 8 until you have looked.
3. **Monsters have 4 frames each.** It is not stated whether that is a 4-frame walk
   cycle or 2 idle + 2 walk. Verify. If ambiguous, treat as a 4-frame loop and note the
   assumption.
4. **The Priest has no weapon sprite.** Three equipment sprites, four classes. Assign
   `wand.png` to both Wizard and Priest, tinted differently, and log the missing priest
   staff to `docs/BLOCKERS.md`. Do not stop over it.
5. **Three floor tiles is very thin** for a 5×5 chunk layout. Build the tiler so it
   works with three and accepts more later without a rewrite.
6. **`orb.png` is 100×100**, off-grid versus everything else, and probably not from the
   same pixel-art pack. Scale it down in code; do not resample the file.

---

## 4. Architecture

### Renderer: `@shopify/react-native-skia`

Add it per the SDK 57 docs. Draw sprites with Skia's **Atlas** API — it batches hundreds
of sprites into one draw call, which is what a bullet-heaven needs. Do not draw entities
as React Native `<View>`s; that falls over around 50 entities.

Skia is **not available in Expo Go**. The owner runs `npx expo run:android` for a dev
build. Say so in the README.

### Simulation: pure TypeScript, no React

This is the most important rule in the document.

All game logic lives in `src/game/` as plain functions and plain data. No React, no
hooks, no Skia imports, no `react-native` imports anywhere under `src/game/`. The
simulation must be runnable in a bare Node test process.

```
src/game/
  state.ts        world state shape, creation, reset
  step.ts         advance(world, dt) — the entire simulation
  entities/       player.ts enemies.ts projectiles.ts pickups.ts
  systems/        movement.ts collision.ts damage.ts spawning.ts leveling.ts
  spatial.ts      uniform-grid spatial hash for broadphase
  pool.ts         object pools
  data/           monsters.json classes.json weapons.json waves.json
  rng.ts          seeded PRNG — no Math.random anywhere in src/game/
```

`src/render/` reads world state and draws it. `src/app/` is screens and routing. The
dependency arrow only ever points `app → render → game`. Never the reverse.

**Why this matters:** you are not allowed to launch the game. A pure simulation is one
you can unit test to death without a device, which is the only way you can honestly
claim a phase works.

### Fixed timestep

Step the simulation at a fixed 60 Hz with an accumulator. Render interpolates between
the last two states. Never pass a variable frame delta into game logic — a survivor-like
with hundreds of collisions must be deterministic or you cannot test it.

Run the loop on the JS thread first using Skia's frame callback. Only move it to a
Reanimated worklet if profiling on a real device proves you need to, and if you do, keep
`src/game/` free of worklet directives by keeping the sim itself pure.

### Pooling and broadphase

Enemies, projectiles, damage numbers and XP gems are pooled — allocate once, reuse,
never create garbage in the hot loop. Collision uses the uniform grid in `spatial.ts`,
never an O(n²) pair scan.

### Everything tunable is data

No magic numbers in systems. Damage, speed, cooldown, radius, HP, XP value, spawn rate
all come from JSON under `src/game/data/`, loaded into typed structs at boot.

**Every feel number lives in `data/tuning.json`.** Bob height and frequency, weapon
swing amplitudes, camera smoothing, i-frame duration, pickup radius, knockback, screen
shake, homing turn rates. Because nobody is playtesting mid-build, the owner's first
session will produce a list of "this feels wrong" notes — and every one of them must be
fixable by editing one JSON file, not by hunting through systems code. If a feel number
is hardcoded anywhere outside `tuning.json`, that is a defect.

---

## 5. Heroes and weapons

### Rig

Each hero renders as **two separate sprites**: the 16×16 body, and the 16×16 weapon
drawn as a child with its own position and rotation. They are never baked together.
This is what makes both the weapon swing and the throw-disappear behaviour possible.

### Motion (procedural — there is only one body frame)

- **Idle:** slow vertical bob, roughly 2 px at about 1.5 Hz.
- **Walking:** faster bob, plus a slight squash-and-stretch. The body sprite flips
  horizontally to face the movement direction.
- **Weapon while walking:** oscillates gently in sync with the bob. Small — about
  ±6° at around 4 Hz. The requirement is that it is *never* frozen in place; it should
  read as "carried by someone moving", not as a swing.
- **Weapon while attacking:** a hard swing. Fast attack-out to roughly ±50°, then an
  eased return to rest over about 0.25 s. This must be visually obvious next to the
  walk oscillation.

All of these numbers are starting values in `tuning.json`. They are guesses. Log them to
`docs/PLAYTEST.md` with the key names so the owner can retune them in one file after
playing.

### Weapon visibility on throw

| Class | Weapon | Behaviour |
|---|---|---|
| Knight | `sword.png` | **Hides on throw.** Reappears when the next attack is ready. |
| Dwarf | `axe.png` | **Hides on throw.** Reappears when the axe returns to him. |
| Wizard | `wand.png` | Always visible. It is a caster, it emits, it is never thrown. |
| Priest | `wand.png` (tinted) | Always visible. Same reason. |

There will be upgrades that throw multiple swords or axes. Model this as a **volley**:
the weapon hides when the volley starts, individual projectiles leave on a short
stagger, and the weapon reappears only when the whole volley is out and the cooldown
has run. Build the volley concept in Phase 6 even though the upgrade that uses it lands
in Phase 7 — retrofitting it later means rewriting the attack code.

---

## 6. Class attacks

All four auto-fire. All four acquire targets themselves. Cooldowns come from
`classes.json`.

**Wizard — fireball.** Fires at the nearest enemy. The projectile uses
`fireball_strip.png` as a looping animation and rotates to face travel. On first enemy
contact it explodes: damage to everything inside a radius, then despawns. Single
explosion, one damage application per enemy.

**Priest — orbiting orb plus magic missile.** Two separate systems:
- The **orb** (`orb.png`) continuously circles the priest at a fixed radius and angular
  speed. It is a persistent world entity, not a held item, and it damages enemies it
  passes through. Because it lingers on a target, it needs a **per-target re-hit
  cooldown** (default 0.5 s) or it will apply damage every single frame.
- The **magic missile** fires on its own cooldown at the nearest enemy, seeks its
  target, hits one enemy, and despawns. **No explosion, no AoE.**

  *(Assumption: the brief said "not exploding and deal an AoE"; read as single-target,
  in contrast to the wizard's explicitly-AoE fireball. Build it single-target and log
  this reading to `docs/DECISIONS.md` — it is the one place a wrong reading changes the
  class meaningfully.)*

**Knight — piercing swords.** Fast, and **must never miss.** Acquire the nearest enemy
at spawn and home toward it with a high enough turn rate that escape is not possible.
The sword **pierces**: it passes through enemies and keeps going, damaging each one it
touches, up to a pierce count from `weapons.json`. Each enemy is damaged **once per
sword** — track hit enemies per projectile.

**Dwarf — returning axe.** Three phases in one projectile:
1. **Outbound** to maximum range, spinning.
2. **Dwell** — stops and spins in place for 1.0 s at the end of its range.
3. **Return** — travels back to the dwarf, tracking him if he has moved, and despawns
   on arrival. The weapon sprite reappears here.

It damages any enemy it touches during **all three phases**. Because it dwells inside a
crowd for a full second, it needs the same **per-target re-hit cooldown** as the orb.
Without that it deals damage 60 times a second.

---

## 7. Enemies

Four types, from the four monster sprite sets. All stats live in
`src/game/data/monsters.json`:

```json
{
  "slime":   { "hp": 10, "speed": 22, "damage": 4, "attackInterval": 1.0,
               "xp": 1, "radius": 8, "sprites": "M_Slime", "frames": 4 },
  "fly":     { "...": "..." },
  "bunny":   { "...": "..." },
  "monster": { "...": "..." }
}
```

Behaviour: walk straight at the player. Flip horizontally to face him. Loop the 4-frame
animation, with a small random phase offset per enemy so a crowd does not pulse in
unison. Soft separation so they spread into a mob instead of stacking into one pixel.

### Attack timing — individual, not global

**Every enemy carries its own attack timer.** `attackInterval` defaults to `1.0` (one
second). When an enemy is touching the player and its personal timer has elapsed, it
deals its damage and resets *its own* timer. There is no shared or global attack clock —
two slimes that arrive a half-second apart must stay a half-second out of phase forever.

Give the player short invulnerability frames after taking a hit so a 40-enemy pile-up
cannot delete him in one frame.

---

## 8. Map

Endless. The player has no boundary and never hits a wall.

Floor is built from 256×256 px chunks in a 5×5 arrangement (1280×1280 total), and that
whole block **tiles infinitely** — pick the chunk for any world position with a modulo
of the camera position. Nothing is allocated as the player walks; there is no chunk
streaming and no world edge.

Each 256 px chunk is 16×16 tiles of 16 px, drawn from `T_Dungeon/`. With only three
tiles, vary them with the seeded PRNG so the floor does not read as a uniform grid, and
keep the layout data-driven so more tiles slot in later without touching the renderer.

Camera follows the player with light smoothing. Cull anything outside the view plus a
small margin.

---

## 9. Spawning

Model it on `survivor.io`:

- **Continuous pressure.** A steady stream, not discrete cleared waves. Spawn rate rises
  with elapsed run time.
- **Spawn off-screen.** On a ring just outside the camera view, never in sight.
- **Time-driven difficulty.** `waves.json` defines, per time bracket, which enemy types
  are eligible, their weights, the spawn rate, and any HP/speed scaling.
- **Burst events.** At intervals, a large group of one type from one direction.
- **Elites and bosses.** Periodic tougher variants; a boss at longer intervals.
- **Concurrent cap.** Hard limit on live enemies (start at 200, tune on device). At cap,
  despawn the enemies furthest behind the player and reuse them at the spawn ring.

---

## 10. Progression

XP gems drop on kill and are drawn to the player within a pickup radius. Filling the XP
bar pauses the game and offers three upgrade choices. Upgrades are data-driven in
`upgrades.json` and include: more projectiles per volley (this is what the §5 volley
system exists for), more damage, faster cooldown, bigger AoE, more pierce, more move
speed, more max HP, larger pickup radius.

Death shows a results screen: time survived, kills, level reached, and a retry button
back to class select.

---

## 11. Screens

- **Main menu → class select.** Four cards: Wizard, Knight, Dwarf, Priest. Each shows
  the hero sprite, its weapon, and one plain-language line about how it attacks.
  Selecting one starts a run.
- **In-run HUD.** HP bar, XP bar, timer, kill count, level. Pause button.
- **Level-up overlay.** Three upgrade cards. Sim is paused.
- **Results.** Stats and retry.

Nearest-neighbour filtering on every sprite. This is 16×16 pixel art — any smoothing
will turn it to mush.

---

## 12. Phases

Work through these in order. After each: `npx tsc --noEmit`, `npm test`,
`npx expo export --platform android`, then commit with a real message.

**Phase 0 — Clear the ground.**
Delete every template screen and component. Move `SPRITES/` to `assets/sprites/`. Add
Skia. Add a test runner (follow the Expo v57 unit testing guide; the sim is pure TS so a
plain runner is fine). Create the `src/game`, `src/render`, `src/app` skeleton. Create
`docs/ASSETS.md` and record every asset fact you verified from §3. Create empty
`docs/PLAYTEST.md`, `docs/DECISIONS.md`, `docs/BLOCKERS.md` and `docs/BACKLOG.md`.
*Done when:* the app builds, boots to a blank screen, and one placeholder test passes.

**Phase 1 — Simulation core, no rendering at all.**
World state, fixed-timestep `advance()`, entity pools, spatial hash, seeded RNG. Nothing
on screen yet.
*Done when:* unit tests cover the accumulator, pool reuse under churn, spatial hash
correctness, and determinism — the same seed and inputs produce an identical world after
1000 steps.

**Phase 2 — See something move.**
Skia canvas, infinite tiling floor, camera, player entity, joystick input.
*Done when:* a placeholder square walks around an endless floor.

**Phase 3 — Heroes and the weapon rig.**
All four hero sprites, two-part body/weapon rig, idle bob, walk bob and flip, the ±6°
walk oscillation, and the hard attack swing (triggered on a timer for now, no
projectiles yet).
*Log to `docs/PLAYTEST.md`:* whether the walk swing is too subtle or too much, and
whether the attack swing reads clearly against it. Name the exact keys in `tuning.json`
that change each one. These cannot be judged from code — do not claim they are right.

**Phase 4 — Enemies.**
`monsters.json`, all four types, 4-frame animation with random phase, chase, soft
separation, contact damage on **individual per-enemy 1 s timers**, player i-frames,
death and XP drop.
*Done when:* tests prove two enemies with staggered arrival keep independent attack
timers, and that damage never applies more than once per interval per enemy.

**Phase 5 — Spawn director.**
`waves.json`, off-screen ring spawning, time-scaled rate, burst events, elites, boss,
concurrent cap with recycling.
*Log to `docs/PLAYTEST.md`:* the difficulty curve you chose, minute by minute, and which
`waves.json` entries to edit to make any minute harder or easier. Whether minute three
feels tense or hopeless is the owner's call.

**Phase 6 — The four attacks.**
Wizard fireball with AoE. Priest orbiting orb plus single-target seeking missile. Knight
piercing homing swords. Dwarf returning axe with its 1 s dwell. The volley system.
Weapon hide-on-throw for Knight and Dwarf.
*Done when:* tests cover per-target re-hit cooldown on orb and axe, pierce counting and
one-hit-per-enemy-per-sword, all three axe phases including damage during dwell, and
that a knight sword cannot miss a moving target.
*Log to `docs/PLAYTEST.md`:* the damage, cooldown, range and AoE radius you gave each
class, and your honest guess at which class is strongest. Relative power is a hands-on
judgement — flag it as unverified.

**Phase 7 — The loop closes.**
Class select menu, HUD, XP and levelling, upgrade cards, death and results, retry.
*Done when:* a full run — pick a class, play, level up, die, retry — works end to end.

**Phase 8 — Make it hold up, then hand over.**
Reduce overdraw, verify Atlas batching, confirm zero allocation in the hot loop, tune
the concurrent cap. Release build.

Then write the handover at the top of `docs/PLAYTEST.md`:
- how to run it (`npx expo run:android`)
- every feel number you guessed, its `tuning.json` key, and what to try if it feels wrong
- everything in `docs/BLOCKERS.md` that is still unresolved
- everything in `docs/DECISIONS.md` where you picked one reading over another
- what you could **not** verify, stated plainly

*Done when:* `npx expo export` is clean, the full suite passes, and that handover exists.
This document is the deliverable as much as the game is — it is what makes the owner's
first play session productive instead of a bug hunt.

---

## 13. Reference

- Expo SDK 57 docs — https://docs.expo.dev/versions/v57.0.0/
- React Native Skia, especially the `Atlas` API for batched sprite drawing
Files you create and maintain:

- `docs/ASSETS.md` — the only trusted source for frame indices and grid layouts. If a
  number is not in there, it is not verified.
- `docs/PLAYTEST.md` — every number you guessed by feel, with its `tuning.json` key. The
  owner's punch-list.
- `docs/DECISIONS.md` — every place you picked one reading of the spec over another.
- `docs/BLOCKERS.md` — missing assets, unfixable failures, anything shipped disabled.
- `docs/BACKLOG.md` — one line for anything worth doing later. Never act on it.

Start with Phase 0. Do not stop until Phase 8 is done.
