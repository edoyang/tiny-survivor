import { poolObtain } from '../pool.ts';
import type { World } from '../state.ts';

export function spawnGem(world: World, x: number, y: number, value: number): void {
  const gem = poolObtain(world.gems);
  if (gem === null) {
    world.xp += value;
    return;
  }
  gem.pos.x = x;
  gem.pos.y = y;
  gem.prevX = x;
  gem.prevY = y;
  gem.value = value;
}
