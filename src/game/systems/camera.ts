import tuning from '../data/tuning.json' with { type: 'json' };
import type { World } from '../state.ts';

export function updateCamera(world: World, dt: number): void {
  const cam = world.camera;
  cam.prevX = cam.pos.x;
  cam.prevY = cam.pos.y;
  const blend = 1 - Math.exp(-tuning.camera.stiffness * dt);
  cam.pos.x += (world.player.pos.x - cam.pos.x) * blend;
  cam.pos.y += (world.player.pos.y - cam.pos.y) * blend;
}
