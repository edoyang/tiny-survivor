# ASSETS.md

Every fact here was verified by decoding the PNG headers and visually inspecting
upscaled renders of the files. If a number is not in this file, it is not verified.

## Heroes - `assets/sprites/HERO/`, 16x16, one frame each

| File | Verified facts |
|---|---|
| `dwarf.png` | 16x16, single frame, faces the viewer, horned helmet, braided beard |
| `knight.png` | 16x16, single frame, faces the viewer, full helm, grey armour |
| `priest.png` | 16x16, single frame, faces the viewer, grey hair, holds a small brown staff baked into the body sprite |
| `wizard.png` | 16x16, single frame, faces the viewer, purple hat and robe |

No walk cycle exists for any hero. All hero motion must be procedural.

## Equipment - `assets/sprites/Equipment/`, 16x16, one frame each

| File | Verified facts |
|---|---|
| `axe.png` | 16x16, double-headed axe, drawn upright (head up, handle down) |
| `sword.png` | 16x16, drawn upright, blade up, handle down |
| `wand.png` | 16x16, drawn upright, brown shaft, pink tip at top |

There is no priest weapon sprite. See BLOCKERS.md.

## Monsters - 24x24, four files per set

| Set | Files | Verified facts |
|---|---|---|
| `M_Slime/` | `tile_0000`–`tile_0003` | teal slime |
| `M_Fly/` | `tile_0004`–`tile_0007` | tan moth with purple wings |
| `M_Bunny/` | `tile_0008`–`tile_0011` | orange rabbit with purple ears |
| `M_Monster/` | `tile_0012`–`tile_0015` | blue square beast with ears |

**Frame roles (verified visually, same convention in all four sets):**
frames 0, 1, 2 are an upright animation cycle (pose/squash variations of the standing
monster). Frame 3 is a death frame: the monster lies flattened on its side with
dead eyes. Frame 3 is NOT part of the walk loop.

All monster sprites have a dark outline plus a white outer border baked in.

## Projectiles - `assets/sprites/Projectile/`

| File | Verified facts |
|---|---|
| `fireball_strip.png` | 256x32. Exactly 8 frames of 32x32, all non-empty (checked per-frame pixel bounding boxes). The ball faces RIGHT, flame tail trails LEFT. Base orientation of frame art = travelling in +X. |
| `orb.png` | 100x100. Blue disc with a white ring and white core, drawn content spans (2,2)–(98,98). Not on the 16px grid; scale in code, do not resample the file. |

## Floor tiles - `assets/sprites/T_Dungeon/`, 16x16

| File | Verified facts |
|---|---|
| `tile_0042.png` | orange floor with grey slab inlays |
| `tile_0048.png` | plain orange floor |
| `tile_0049.png` | orange floor with light speckles |

## Effect sheets - `assets/effect/`, verified by decoding every PNG

180 sheets across `Part 1` … `Part 15`. Layout verified by decoding the PNGs
and measuring per-cell alpha coverage, per-frame bounding boxes and mean
colour - not guessed:

- **Frames are 64x64, laid out left to right.** Frame count = `width / 64`.
  Widths are always a multiple of 64 and vary per sheet (320 … 1472).
- **Every sheet is 576 px tall = 9 rows of 64.** The 9 rows are **9 colour
  variants of the same animation**, not 9 frames: per-row alpha counts and
  bounding boxes are byte-identical across rows, only the RGB differs.
- **Row order (verified by mean colour of the opaque pixels, same in every
  sheet checked):** 0 orange/fire, 1 purple, 2 cyan/ice, 3 green, 4 brown,
  5 grey, 6 pink, 7 red, 8 indigo.
- Colour type 6 (RGBA8), non-interlaced.

The seven sheets wired into the game, with the row picked for each. Frame
counts below were measured, not assumed:

| Game kind | File | Frames | Colour row |
|---|---|---|---|
| `FX_EXPLOSION` | `Part 1/03.png` | 13 | 0 (orange) |
| `FX_BOLT` | `Part 13/635.png` | 14 | 1 (purple) |
| `FX_RING` | `Part 3/135.png` | 12 | 5 (grey) |
| `FX_FROST` | `Part 6/285.png` | 8 | 2 (cyan) |
| `FX_STORM` | `Part 4/197.png` | 14 | 2 (cyan) |
| `FX_SPARK` | `Part 5/223.png` | 5 | 3 (green) |
| `FX_SLASH` | `Part 8/375.png` | 8 | 7 (red) |

The mapping lives in `src/render/sources.ts` (`EFFECT_SHEETS`). To reskin an
effect, change the file or the `colourRow` there - nothing else needs editing.
Frames are cut out of the chosen row and packed into the runtime atlas at boot.

**Not verified:** which *subject* each of the other 173 sheets depicts. They
were classified only by measured motion (centroid drift across frames) and
peak coverage, and picked on that basis: `Part 1/03` is the largest radial
burst in the pack, `Part 13/635` the tallest narrow one (read as a bolt),
`Part 8/375` the widest flat one (read as a slash). Nobody has looked at them
as pictures.
