import tuning from '../data/tuning.json' with { type: 'json' };
import { queryCircle, rebuild } from '../spatial.ts';
import { FIXED_DT, type World } from '../state.ts';

const I_FRAME_TICKS = Math.round(tuning.player.iFrameSeconds / FIXED_DT);

export function updateEnemies(world: World, dt: number): void {
  const p = world.player;
  if (p.iFrameTicks > 0) p.iFrameTicks--;
  const pool = world.enemies;
  const hash = world.enemyHash;
  rebuild(hash, pool.items, pool.count);
  const strength = tuning.enemies.separationStrength;
  for (let i = 0; i < pool.count; i++) {
    const e = pool.items[i];
    e.prevX = e.pos.x;
    e.prevY = e.pos.y;
    const toPlayerX = p.pos.x - e.pos.x;
    const toPlayerY = p.pos.y - e.pos.y;
    const dist = Math.sqrt(toPlayerX * toPlayerX + toPlayerY * toPlayerY);
    if (dist > 0.0001) {
      const nx = toPlayerX / dist;
      const ny = toPlayerY / dist;
      e.pos.x += nx * e.speed * dt;
      e.pos.y += ny * e.speed * dt;
      if (nx > 0.001) e.facing = 1;
      else if (nx < -0.001) e.facing = -1;
    }
    const sepRadius = e.radius * 2;
    queryCircle(hash, e.pos.x, e.pos.y, sepRadius);
    let pushX = 0;
    let pushY = 0;
    for (let q = 0; q < hash.queryCount; q++) {
      const j = hash.queryResults[q];
      if (j === i) continue;
      const other = pool.items[j];
      const dx = e.pos.x - other.pos.x;
      const dy = e.pos.y - other.pos.y;
      const minDist = e.radius + other.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 >= minDist * minDist) continue;
      const d = Math.sqrt(d2);
      if (d < 0.0001) {
        pushX += (i > j ? 1 : -1) * strength;
        continue;
      }
      const overlap = 1 - d / minDist;
      pushX += (dx / d) * overlap * strength;
      pushY += (dy / d) * overlap * strength;
    }
    e.pos.x += pushX * dt;
    e.pos.y += pushY * dt;
    if (e.attackTimerTicks > 0) e.attackTimerTicks--;
    const contactX = p.pos.x - e.pos.x;
    const contactY = p.pos.y - e.pos.y;
    const contactDist = e.radius + p.radius;
    if (
      contactX * contactX + contactY * contactY <= contactDist * contactDist &&
      e.attackTimerTicks === 0 &&
      p.iFrameTicks === 0 &&
      p.hp > 0
    ) {
      p.hp -= e.contactDamage;
      if (p.hp < 0) p.hp = 0;
      e.attackTimerTicks = e.attackIntervalTicks;
      p.iFrameTicks = I_FRAME_TICKS;
    }
  }
}
