import { STATUS_DEAD, STATUS_RUNNING, STATUS_WON } from './kinds.ts';
import { FIXED_DT, type World } from './state.ts';
import { updateAbilities, updateAura } from './systems/abilities.ts';
import { updatePlayerAttack } from './systems/attacks.ts';
import { updateCamera } from './systems/camera.ts';
import { updateEnemies } from './systems/enemies.ts';
import { updateEffects, updateFields } from './systems/fields.ts';
import { checkLevelUp } from './systems/leveling.ts';
import { updateMinions } from './systems/minions.ts';
import { movePlayer } from './systems/movement.ts';
import { updateGems } from './systems/pickups.ts';
import { updateOrbiters, updateProjectiles } from './systems/projectiles.ts';
import { updateSpawning } from './systems/spawning.ts';

export { FIXED_DT };
export const MAX_FRAME_SECONDS = 0.25;

export function advance(world: World): void {
  if (world.status !== STATUS_RUNNING) return;
  world.tick++;
  world.time += FIXED_DT;
  movePlayer(world, FIXED_DT);
  updatePlayerAttack(world, FIXED_DT);
  updateSpawning(world);
  updateEnemies(world, FIXED_DT);
  updateAbilities(world);
  updateProjectiles(world);
  updateOrbiters(world);
  updateMinions(world);
  updateFields(world);
  updateAura(world);
  updateEffects(world);
  updateGems(world, FIXED_DT);
  updateCamera(world, FIXED_DT);
  if (world.player.hp <= 0) {
    world.status = STATUS_DEAD;
    return;
  }
  if (world.spawn.bossKilled) {
    world.status = STATUS_WON;
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
