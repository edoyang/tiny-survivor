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
- Player move speed is 70 world px/s (`PLAYER_BASE_SPEED` in `src/game/state.ts`
  until classes land; it moves to class data in a later phase).
