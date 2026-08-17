import tuning from '../data/tuning.json' with { type: 'json' };
import { spawnIcicle } from '../entities/projectiles.ts';
import { FX_SPARK } from '../kinds.ts';
import { poolObtain, poolReleaseAt } from '../pool.ts';
import { FIXED_DT, type World } from '../state.ts';
import { findNearestEnemy } from './targeting.ts';

const ORBIT_RAD = (tuning.abilities.minionOrbitDegPerSec * Math.PI) / 180;
const MINION_SHOT_TICKS = Math.round(tuning.abilities.minionShotSeconds * 60);

export function updateMinions(world: World): void {
  const pool = world.minions;
  const p = world.player;
  while (pool.count < p.minionCount) {
    const spawned = poolObtain(pool);
    if (spawned === null) break;
    spawned.angle = (pool.count / (p.minionCount + 1)) * Math.PI * 2;
    spawned.pos.x = p.pos.x;
    spawned.pos.y = p.pos.y;
    spawned.prevX = p.pos.x;
    spawned.prevY = p.pos.y;
    spawned.timerTicks = 0;
  }
  while (pool.count > p.minionCount) poolReleaseAt(pool, pool.count - 1);
  if (pool.count === 0) return;
  for (let i = 0; i < pool.count; i++) {
    const minion = pool.items[i];
    minion.prevX = minion.pos.x;
    minion.prevY = minion.pos.y;
    minion.angle += ORBIT_RAD * FIXED_DT;
    const targetX = p.pos.x + Math.cos(minion.angle) * tuning.abilities.minionOrbitRadius;
    const targetY = p.pos.y + Math.sin(minion.angle) * tuning.abilities.minionOrbitRadius;
    minion.pos.x += (targetX - minion.pos.x) * 0.18;
    minion.pos.y += (targetY - minion.pos.y) * 0.18;
    if (minion.timerTicks > 0) {
      minion.timerTicks--;
      continue;
    }
    const idx = findNearestEnemy(world, minion.pos.x, minion.pos.y, tuning.abilities.minionRange);
    if (idx < 0) continue;
    const target = world.enemies.items[idx];
    minion.timerTicks = MINION_SHOT_TICKS;
    minion.damage = p.minionDamage * p.damageMult;
    const shot = spawnIcicle(
      world,
      minion.pos.x,
      minion.pos.y,
      target.pos.x - minion.pos.x,
      target.pos.y - minion.pos.y,
      target.id,
      FX_SPARK,
    );
    if (shot !== null) shot.damage = minion.damage;
  }
}
