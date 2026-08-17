import type { World } from '../state.ts';

export function findNearestEnemy(world: World, x: number, y: number, maxRange: number): number {
  const pool = world.enemies;
  let best = -1;
  let bestD2 = maxRange * maxRange;
  for (let i = 0; i < pool.count; i++) {
    const e = pool.items[i];
    const dx = e.pos.x - x;
    const dy = e.pos.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = i;
    }
  }
  return best;
}

export function findNearestEnemyExcluding(
  world: World,
  x: number,
  y: number,
  maxRange: number,
  excludeIds: Int32Array,
  excludeCount: number,
): number {
  const pool = world.enemies;
  let best = -1;
  let bestD2 = maxRange * maxRange;
  for (let i = 0; i < pool.count; i++) {
    const e = pool.items[i];
    let skip = false;
    for (let x2 = 0; x2 < excludeCount; x2++) {
      if (excludeIds[x2] === e.id) {
        skip = true;
        break;
      }
    }
    if (skip) continue;
    const dx = e.pos.x - x;
    const dy = e.pos.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = i;
    }
  }
  return best;
}

export function findEnemyIndexById(world: World, id: number): number {
  const pool = world.enemies;
  for (let i = 0; i < pool.count; i++) {
    if (pool.items[i].id === id) return i;
  }
  return -1;
}
