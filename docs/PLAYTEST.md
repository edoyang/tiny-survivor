# PLAYTEST.md

Every number in the game that can only be judged by playing it, with the
`data/tuning.json` key that changes it. The owner's punch-list.

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

## Phase 3 — hero rig

None of this can be judged from code; every number is a starting guess.

- **Idle bob**: `heroRig.idleBobHeight` = 2 px at `heroRig.idleBobHz` = 1.5.
- **Walk bob**: `heroRig.walkBobHeight` = 3 px at `heroRig.walkBobHz` = 4. Walk
  uses a hop curve (abs-sine) versus the idle float (sine); if walking looks
  like stomping, lower `walkBobHeight` to 2.
- **Squash and stretch**: `heroRig.walkSquashAmount` = 0.06 (6% scale wobble).
  If heroes look rubbery, halve it.
- **Weapon walk oscillation**: `heroRig.weaponWalkSwingDeg` = 6 degrees, synced
  to the walk bob. Idle keeps 40% of it so the weapon never freezes. I cannot
  judge whether this is too subtle next to the attack swing - check first play.
- **Attack swing**: `heroRig.attackSwingDeg` = 50, out in
  `heroRig.attackOutSeconds` = 0.06, eased (cubic) return over
  `heroRig.attackReturnSeconds` = 0.25. The out speed is what makes it read as
  an attack; if it reads as a twitch, raise `attackOutSeconds` to 0.1.
- **Weapon grip**: `heroRig.weaponGripOffsetX` = 6, `weaponGripOffsetY` = 3
  (px from body centre, in facing direction), rotating about sprite pixel
  (`weaponPivotX` = 8, `weaponPivotY` = 13), i.e. the handle. If weapons hover
  or clip the body, adjust the grip offsets.
- **Priest wand tint**: `heroRig.priestWandTint` = "#ffd166" (gold, modulate
  blend). Guessed; any hex colour works there.
- **Attack cadence** per class: `cooldown` in `data/classes.json`
  (wizard 1.1 s, knight 0.9 s, dwarf 1.6 s, priest 1.2 s). Guessed.

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
