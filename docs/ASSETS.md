# ASSETS.md

Every fact here was verified by decoding the PNG headers and visually inspecting
upscaled renders of the files. If a number is not in this file, it is not verified.

## Heroes — `assets/sprites/HERO/`, 16x16, one frame each

| File | Verified facts |
|---|---|
| `dwarf.png` | 16x16, single frame, faces the viewer, horned helmet, braided beard |
| `knight.png` | 16x16, single frame, faces the viewer, full helm, grey armour |
| `priest.png` | 16x16, single frame, faces the viewer, grey hair, holds a small brown staff baked into the body sprite |
| `wizard.png` | 16x16, single frame, faces the viewer, purple hat and robe |

No walk cycle exists for any hero. All hero motion must be procedural.

## Equipment — `assets/sprites/Equipment/`, 16x16, one frame each

| File | Verified facts |
|---|---|
| `axe.png` | 16x16, double-headed axe, drawn upright (head up, handle down) |
| `sword.png` | 16x16, drawn upright, blade up, handle down |
| `wand.png` | 16x16, drawn upright, brown shaft, pink tip at top |

There is no priest weapon sprite. See BLOCKERS.md.

## Monsters — 24x24, four files per set

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

## Projectiles — `assets/sprites/Projectile/`

| File | Verified facts |
|---|---|
| `fireball_strip.png` | 256x32. Exactly 8 frames of 32x32, all non-empty (checked per-frame pixel bounding boxes). The ball faces RIGHT, flame tail trails LEFT. Base orientation of frame art = travelling in +X. |
| `orb.png` | 100x100. Blue disc with a white ring and white core, drawn content spans (2,2)–(98,98). Not on the 16px grid; scale in code, do not resample the file. |

## Floor tiles — `assets/sprites/T_Dungeon/`, 16x16

| File | Verified facts |
|---|---|
| `tile_0042.png` | orange floor with grey slab inlays |
| `tile_0048.png` | plain orange floor |
| `tile_0049.png` | orange floor with light speckles |
