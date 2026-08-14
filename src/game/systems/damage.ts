import { poolReleaseAt } from '../pool.ts';
import { spawnGem } from '../entities/pickups.ts';
import type { World } from '../state.ts';

export function damageEnemy(world: World, enemyIndex: number, amount: number): boolean {
  const enemy = world.enemies.items[enemyIndex];
  enemy.hp -= amount;
  if (enemy.hp > 0) return false;
  world.kills++;
  spawnGem(world, enemy.pos.x, enemy.pos.y, enemy.xp);
  poolReleaseAt(world.enemies, enemyIndex);
  return true;
}
