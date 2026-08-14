# DECISIONS.md

Every place one reading of the spec was picked over another.

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
