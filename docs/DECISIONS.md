# DECISIONS.md

Every place one reading of the spec was picked over another.

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
