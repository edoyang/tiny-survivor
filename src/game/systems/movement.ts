import type { World } from '../state.ts';

export function movePlayer(world: World, dt: number): void {
  const p = world.player;
  p.prevX = p.pos.x;
  p.prevY = p.pos.y;
  const ix = p.moveInput.x;
  const iy = p.moveInput.y;
  const len = Math.sqrt(ix * ix + iy * iy);
  if (len < 0.001) return;
  const scale = len > 1 ? 1 / len : 1;
  const vx = ix * scale * p.moveSpeed;
  const vy = iy * scale * p.moveSpeed;
  p.pos.x += vx * dt;
  p.pos.y += vy * dt;
  if (vx > 0.001) p.facing = 1;
  else if (vx < -0.001) p.facing = -1;
}
