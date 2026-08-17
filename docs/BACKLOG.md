# BACKLOG.md

One line per idea. Nothing here is scheduled.

- Show monster death frame (frame 3) as a brief corpse flash before despawn.
- Y-sort enemies before the atlas draw so overlapping mobs stack front-to-back.
- If device profiling shows GC hitches, replace picture-per-frame recording
  with Skia rect/RSXform buffers updated from a Reanimated worklet.
- Damage numbers (pooled floating text) - listed in the architecture brief
  but demanded by no phase; needs a font atlas.
- Haptics/flash on player hit - the hit feedback is currently only the HP bar.
- Sprites for icicle / shard / bomb / minion, so summons and casts read apart.
- Enemy ranged attacks, which would make Boots of the Gale's awakening mean
  what the brief literally asked for (slowing incoming projectiles).
- Per-item icons on the level-up cards and HUD chips; right now items are
  identified by a coloured dot and a name.
- A build-preview screen showing all six items and their awakenings before a
  run starts, instead of the six names on the preset card.
- Damage-over-time and slow indicators on enemies (tint or icon) — burn and
  slow are currently invisible.
- Persist "Skip confirmation" (and any future settings) across restarts.
- Silence the `SkPath.moveTo/lineTo/close` deprecation warnings by moving
  `makeGemImage` to `Skia.PathBuilder`.
