# DECISIONS.md

Every place one reading of the spec was picked over another.

## Gear presets rework (post-Phase 8)

- **The XP/level-up loop was kept; only the cards changed.** "Remove the idea
  we use now to level up" was read as "replace the generic upgrade list", not
  "delete levelling". Gems and the XP bar still drive it; the three cards now
  offer a new item, +1 star on an owned item, or the Awakening of a five-star
  item. `upgrades.json` was deleted.
- **Slots: five items in total, one shared pool.** First built as 5 class +
  3 general counted separately; the owner corrected it to five overall. Nine
  items are choosable in a run (six exclusive plus three general) and four
  always get left behind, so the general items now cost a build slot rather
  than being free.
- **Presets are the unit of content, classes are the unit of feel.** Each of
  the four classes has three builds; a run draws only from the chosen build's
  six items plus the three general ones. `presets.json` is metadata, and each
  item in `items.json` names its `preset`. Adding a build is a data change.
- **Awakening is the sixth pick, not a separate currency.** A five-star item
  keeps appearing in the offer; taking it again awakens it, after which it
  never appears again.
- **`recastOnKill` recasts the item's own ability**, not a random one. Items
  carrying that flag always also carry an ability.
- **Boots of the Gale slows enemies, not enemy projectiles.** The brief asked
  for a radius that slows "the projectile aiming Wizard". No enemy in this
  game fires anything - they all walk into you - so the awakening is a slow
  field applied to enemies, scaled by area (so the Hat still enhances it) as
  requested. If ranged enemies land later, this is the hook to extend.
- **The nova / shockwave damage lands instantly at full radius; the expanding
  ring is cosmetic.** A growing damage field either double-hits whatever is
  near the centre or needs per-enemy hit tracking on every field. One
  `damageInRadius` at cast time is unambiguous and testable.
- **Damage-over-time fields tick every 0.5 s** (`abilities.fieldDamageIntervalSeconds`).
  Item text says "burns"; the number in `items.json` is damage *per tick*, so a
  snowstorm listed at 11 is 22 damage per second.
- **A shield refills in one go** after `shieldRegen` seconds without taking a
  hit, rather than regenerating gradually. Any hit restarts the clock.
- **Some build ideas were mapped onto shared mechanics rather than bespoke
  ones**, so every one of the twelve builds is real rather than half of them
  being stubs. Named honestly: Lanceblade's "boomerang" is a radial volley;
  Chain Hook and Grimoire of Rifts both pull with the same field; familiars,
  spirits and ballistae are one minion that orbits and auto-fires; Warhorn's
  "fear" is knockback plus a nova, with no stun. The flavour differs, the
  underlying system does not.
- **Marks and stuns were designed and then cut** rather than shipped dead.
  Nothing in the twelve builds needed them once the above mapping was done, so
  the per-enemy fields were removed instead of left unread.

## Spawning rework (post-Phase 8)

- **The ramp given by the owner was read as the interval schedule; pack size
  is separate and always > 1.** "1 monster every 5s" for the first 30 s and
  "massive, never individually" cannot both be literal. The intervals are
  exactly as specified (5s, 3s, 2.5s, then tightening to 1.3s); the pack size
  starts at 2 and grows to 21, so nothing ever arrives alone. Both numbers are
  per-bracket in `waves.json`.
- **A pack lands on one arc, a horde lands on the full circle.** Packs pick a
  base angle and scatter within `arcDegrees`, so pressure has a direction you
  can run from. The four hordes (5:00, 8:00, 11:00, 14:00) spawn evenly around
  360 degrees, which is the "circular spawning, run or cut your way out"
  event.
- **The boss spawns at 15:00 and the run ends when it dies, not at 15:00.**
  "Maxed to 15 minutes" was read as: regular spawning, hordes and elites all
  stop when the boss appears, and the finale is however long the boss takes.
  Killing it is a win (`STATUS_WON`, "BOSS DOWN"); the timer keeps counting.
- **The concurrent cap never recycles a live boss.** The cap recycles the
  enemy furthest behind the player; bosses are excluded, or a 15:00 boss could
  be deleted by a pack spawn.
- **Ground is 99% plain / 0.5% slab / 0.5% speckled**, mapping "tile" to
  `tile_0042` (grey slab inlays) and "dirt" to `tile_0049` (speckles), with
  `tile_0048` as the plain floor. `tuning.json` `floor.weights`.

## Web / Windows-laptop support (post-Phase 8)

- **The browser build is a test target, not a product target.** Portrait phone
  stays the design; web exists so the owner can try the game on a Windows
  laptop without a device. Keyboard (WASD/arrows) is web-only, wired through a
  platform-forked module (`keyboard.web.ts` / `keyboard.ts` no-op).
- **CanvasKit loads before any route renders.** On web,
  `Skia = JsiSkApi(global.CanvasKit)` is captured at module import, so the
  root layout blocks rendering until `LoadSkiaWeb()` resolves. The wasm file
  is copied to `public/` by the `postinstall` script rather than committed
  (8 MB binary).
- **The sprite atlas is built on a CPU raster surface (`Surface.Make`), not
  `MakeOffscreen`.** On web, `MakeOffscreen` uses a separate WebGL context and
  its snapshots silently draw nothing on the main canvas - the floor, enemies
  and gems were invisible in the first browser run. A raster surface works on
  both platforms; the atlas is built once at boot, so the CPU path costs
  nothing per frame.

## Phase 0

- **Monster frame 3 is a death frame, not part of the walk loop.** The brief said
  "treat as a 4-frame loop" if ambiguous, but visual inspection removed the ambiguity:
  in all four sets frame 3 shows the monster flattened on its side with dead eyes.
  Walk animation loops frames 0–2; frame 3 is reserved for the death effect.
- **Test runner is Node's built-in `node:test`, not jest-expo.** The simulation is pure
  TypeScript and the brief allows a plain runner. Node 22 runs `.ts` test files
  directly, so this adds zero dependencies. Imports inside `src/game/` use explicit
  `.ts` extensions (enabled via `allowImportingTsExtensions`) so the same files run
  under both Metro and bare Node.
- **Attack timers and i-frames are integer tick counters, not float seconds.**
  Accumulated 1/60 floats made a 1.0 s interval land on 61 ticks and wobble by
  a tick between enemies. Integer ticks make "two staggered enemies stay
  staggered forever" exact and testable. `attackInterval` in monsters.json
  stays in seconds; it is converted once at spawn.
- **Level-up offers are drawn without replacement from upgrades below their
  stack cap.** If fewer than three remain, fewer cards show; if none remain,
  the level-up resolves silently and play continues.
- **Banked XP chains level-ups**: picking a card resumes the sim for one tick;
  if the xp bar is still over threshold the next overlay appears immediately.
- **Priest magic missile is single-target, no explosion.** The brief's "not
  exploding and deal an AoE" was read as: no explosion, no AoE, in contrast to
  the wizard's explicitly-AoE fireball. Built single-target; if the owner meant
  "explodes but no AoE damage", only the renderer needs a hit flash.
- **A sword stops homing once it has hit its acquired target.** Piercing
  continues in a straight line. With homing left on, a 900 deg/s sword orbited
  its still-alive victim forever instead of passing through the crowd (caught
  by the pierce test).
- **Knight weapon visibility reads literally: hidden from volley start until
  the next attack is ready.** Because attacks auto-fire the instant they are
  ready, the sword is effectively only in-hand when no enemy is in acquire
  range. The dwarf's axe reappears whenever no thrown axe is live.
- **A new volley cannot start while the previous volley is still dispatching**
  (relevant only at high volley counts where stagger x count approaches the
  cooldown); pending shots are never dropped mid-volley.
- **The boss is always the `monster` type.** waves.json brackets drive regular
  and elite type choice, but the periodic boss reads best as the biggest sprite
  in the pack scaled 2x, rather than a random bracket pick (a "boss slime" at
  minute 3 read as a bug, not a feature).
- **Elites pick a random type from the active bracket**, so late elites are
  bunnies/monsters and early ones are slimes/flies.
- **When the gem pool (512) is full, new XP is credited directly to the player**
  instead of being dropped or merged. No XP is ever lost; the only cost is a
  missing visual gem in an already extremely dense scene.
- **Skia installed as `@shopify/react-native-skia@2.6.2`** — the exact version pinned
  in Expo SDK 57's `bundledNativeModules.json`. `npx expo install` could not reach
  Expo's API from this environment, so the pin was read from the installed `expo`
  package instead.

## Effect sizing (post-Phase 8, owner feedback)

- **An effect sprite is sized from the damage radius it represents**, not from
  a fixed art scale. `spawnEffect` takes world-space radius and the renderer
  draws `radius * 2 * effectRadiusMult / 64`. Area upgrades therefore change
  the picture as well as the numbers, which was the point of the complaint —
  "it says increasing blast size but the visual should be bigger as well".
- **Effects with no area of their own get a radius from tuning** rather than
  an invented scale: single-target impacts use `render.hitEffectRadius`,
  self-centred casts (volley, heal, riposte) use `render.castEffectRadius`.
- **The meteor still damages instantly, with no falling telegraph.** A real
  delayed impact needs scheduled events in the sim; the 0.6 s burst animation
  sized to the full blast was judged enough to read. Logged rather than
  silently skipped.
