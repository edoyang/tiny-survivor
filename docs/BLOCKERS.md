# BLOCKERS.md

Missing assets, unfixable failures, anything shipped disabled.

## Phase 0

- **No priest weapon sprite.** Three equipment sprites for four classes. The priest
  will use `wand.png` tinted (per the brief) from Phase 3 onward. A real priest staff
  sprite is still wanted.
- **No magic missile sprite in the asset pack.** Substitute: a 6x6 drawn bolt
  (`makeMissileImage`), colour from `tuning.json` `projectiles.missileColor`.
  Replace via an atlas entry named "missile".
- **No XP gem sprite in the asset pack.** Substitute: a 6x6 px diamond drawn
  into the runtime atlas at boot (`makeGemImage` in `src/render/atlas.ts`),
  colour from `tuning.json` `pickup.gemColor`. A real gem sprite can replace it
  by adding an atlas entry named "gem".
- **docs.expo.dev is blocked by this environment's network egress proxy.** The
  instruction to read the SDK 57 docs online could not be followed. Substitute:
  reading the exact installed package sources and type declarations in
  `node_modules/`, which are version-exact for this project.

## Gear presets rework (post-Phase 8)

- **The 173 unused effect sheets were never looked at as pictures.** Only
  seven are wired in, chosen by measured motion and size (see ASSETS.md), not
  by seeing what they depict. If `FX_BOLT` does not read as lightning or
  `FX_SLASH` does not read as a slash, swap the file in
  `src/render/sources.ts` - the rest of the code does not care.
- **No dedicated sprite for icicles, shards or bombs.** Icicles and shards
  reuse the drawn missile bolt; bombs reuse the fireball strip. They are
  distinguishable by their impact effect, not by their in-flight sprite.
- **Minions have no sprite.** Familiars, spirits and ballistae all render as a
  small `orb.png` (`projectiles.minionScale`). Four different builds summon
  something and they all look identical.
- **The Priest still has no weapon sprite** (carried over from Phase 0).
- **The menu hero icons went blank once in the browser and came back on
  reload.** Each `MenuSprite` is its own Skia `<Canvas>`, so the class select
  screen holds eight WebGL contexts and the game screen holds a ninth;
  browsers cap live contexts and drop the oldest. It has not reproduced since
  the menu stopped using a ScrollView. If it returns after playing a run and
  going back, the fix is one canvas for the whole menu, or a `.web.tsx` fork
  of `MenuSprite` drawing an `<img>` with `image-rendering: pixelated`.
- **"Skip confirmation" does not survive an app restart.** It is a module
  variable; persisting it needs a storage dependency (AsyncStorage or
  expo-sqlite), which was not added without being asked.

## UI art direction pass

- **No pixel font.** The interface uses the platform monospace face
  (`MONO` in `src/render/theme.ts`) because no font file could be fetched -
  this environment's egress proxy blocks font and asset hosts. A real bitmap
  face (m5x7, Press Start 2P or similar) dropped into `assets/fonts/` and
  loaded with `expo-font` would finish the look; only `MONO` has to change.
- **Design reference sites are blocked by the egress proxy.** Web *search*
  works, `WebFetch` does not: gameuidatabase.com, wikipedia.org and every
  design blog returned `EGRESS_BLOCKED`. The redesign therefore follows genre
  convention plus search-result summaries, not a specific studied reference.
- **Items still have no icons**, so the level-up card crest and the HUD gear
  chips are coloured blocks. This is the single biggest remaining gap: a build
  is currently identified by colour and name only.

## Meta shell

- **Progress only persists in a browser.** `src/meta/storage.ts` writes to
  `localStorage` when it exists, which covers the web build the owner tests on.
  On a phone there is no storage module installed (no AsyncStorage, no
  expo-sqlite, no expo-file-system), so coins, gear and summons reset when the
  app restarts. Fixing it means adding one dependency, which was not done
  without being asked. `expo-sqlite` is the Expo-recommended option and only
  `loadRaw`/`saveRaw` have to change.
- **In-app purchases are not connected.** The three gem packs in the shop are
  priced placeholders; tapping one says payments are not connected. A real
  build needs an IAP module plus store configuration, which is account work,
  not code work.
- **Summon has no rarity, no pity and no animation.** It resolves instantly
  into a grid of results.
- **Item icons are vector silhouettes, not pixel art.** They read clearly at
  30px in the HUD but they do not match the 16x16 sprite style. Replacing them
  means drawing 75 pixel icons; the file names in
  `assets/ui/icons/sources.json` say exactly what each one has to depict.
