import { updatePlayerAttack } from './systems/attacks.ts';
import { updateCamera } from './systems/camera.ts';
import { updateEnemies } from './systems/enemies.ts';
import { checkLevelUp } from './systems/leveling.ts';
import { movePlayer } from './systems/movement.ts';
import { updateGems } from './systems/pickups.ts';
import { updateOrb, updateProjectiles } from './systems/projectiles.ts';
import { updateSpawning } from './systems/spawning.ts';
import { FIXED_DT, STATUS_DEAD, STATUS_RUNNING, type World } from './state.ts';

export { FIXED_DT };
export const MAX_FRAME_SECONDS = 0.25;

export function advance(world: World): void {
  if (world.status !== STATUS_RUNNING) return;
  world.tick++;
  world.time += FIXED_DT;
  movePlayer(world, FIXED_DT);
  updatePlayerAttack(world, FIXED_DT);
  updateSpawning(world, FIXED_DT);
  updateEnemies(world, FIXED_DT);
  updateProjectiles(world);
  updateOrb(world);
  updateGems(world, FIXED_DT);
  updateCamera(world, FIXED_DT);
  if (world.player.hp <= 0) {
    world.status = STATUS_DEAD;
    return;
  }
  checkLevelUp(world);
}

export function accumulate(world: World, frameSeconds: number): number {
  if (world.status !== STATUS_RUNNING) {
    world.accumulator = 0;
    return 0;
  }
  const clamped = frameSeconds > MAX_FRAME_SECONDS ? MAX_FRAME_SECONDS : frameSeconds;
  world.accumulator += clamped;
  let steps = 0;
  while (world.accumulator >= FIXED_DT) {
    world.accumulator -= FIXED_DT;
    advance(world);
    steps++;
  }
  return steps;
}

export function interpolationAlpha(world: World): number {
  return world.accumulator / FIXED_DT;
}
