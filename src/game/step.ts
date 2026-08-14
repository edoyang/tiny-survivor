import { rebuild } from './spatial.ts';
import { updateCamera } from './systems/camera.ts';
import { movePlayer } from './systems/movement.ts';
import type { World } from './state.ts';

export const FIXED_DT = 1 / 60;
export const MAX_FRAME_SECONDS = 0.25;

export function advance(world: World): void {
  world.tick++;
  world.time += FIXED_DT;
  movePlayer(world, FIXED_DT);
  updateCamera(world, FIXED_DT);
  rebuild(world.enemyHash, world.enemies.items, world.enemies.count);
}

export function accumulate(world: World, frameSeconds: number): number {
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
