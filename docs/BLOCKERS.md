# BLOCKERS.md

Missing assets, unfixable failures, anything shipped disabled.

## Phase 0

- **No priest weapon sprite.** Three equipment sprites for four classes. The priest
  will use `wand.png` tinted (per the brief) from Phase 3 onward. A real priest staff
  sprite is still wanted.
- **No XP gem sprite in the asset pack.** Substitute: a 6x6 px diamond drawn
  into the runtime atlas at boot (`makeGemImage` in `src/render/atlas.ts`),
  colour from `tuning.json` `pickup.gemColor`. A real gem sprite can replace it
  by adding an atlas entry named "gem".
- **docs.expo.dev is blocked by this environment's network egress proxy.** The
  instruction to read the SDK 57 docs online could not be followed. Substitute:
  reading the exact installed package sources and type declarations in
  `node_modules/`, which are version-exact for this project.
