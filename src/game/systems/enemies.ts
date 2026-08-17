import tuning from '../data/tuning.json' with { type: 'json' };
import { queryCircle, rebuild } from '../spatial.ts';
import { FIXED_DT, type World } from '../state.ts';
import { damageEnemy, damagePlayer } from './damage.ts';

const I_FRAME_TICKS = Math.round(tuning.player.iFrameSeconds / FIXED_DT);
const BURN_TICK_TICKS = 30;

export function updateEnemies(world: World, dt: number): void {
  const p = world.player;
  const pool = world.enemies;
  const hash = world.enemyHash;
  rebuild(hash, pool.items, pool.count);
  const strength = tuning.enemies.separationStrength;
  for (let i = pool.count - 1; i >= 0; i--) {
    const e = pool.items[i];
    e.prevX = e.pos.x;
    e.prevY = e.pos.y;
    if (e.slowTicks > 0) e.slowTicks--;
    else e.slowMult = 1;
    if (e.burnTicks > 0) {
      e.burnTicks--;
      e.burnTimerTicks++;
      if (e.burnTimerTicks >= BURN_TICK_TICKS) {
        e.burnTimerTicks = 0;
        if (damageEnemy(world, i, e.burnDps * (BURN_TICK_TICKS * FIXED_DT))) continue;
      }
    } else {
      e.burnDps = 0;
    }
    const speed = e.speed * e.slowMult;
    const toPlayerX = p.pos.x - e.pos.x;
    const toPlayerY = p.pos.y - e.pos.y;
    const dist = Math.sqrt(toPlayerX * toPlayerX + toPlayerY * toPlayerY);
    if (dist > 0.0001) {
      const nx = toPlayerX / dist;
      const ny = toPlayerY / dist;
      e.pos.x += nx * speed * dt;
      e.pos.y += ny * speed * dt;
      if (nx > 0.001) e.facing = 1;
      else if (nx < -0.001) e.facing = -1;
    }
    const sepRadius = e.radius * 2;
    queryCircle(hash, e.pos.x, e.pos.y, sepRadius);
    let pushX = 0;
    let pushY = 0;
    for (let q = 0; q < hash.queryCount; q++) {
      const j = hash.queryResults[q];
      if (j === i || j >= pool.count) continue;
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
      p.invulnTicks === 0 &&
      p.hp > 0
    ) {
      const contactDamage = e.contactDamage;
      e.attackTimerTicks = e.attackIntervalTicks;
      if (p.blink && dist > 0.0001) {
        p.pos.x -= (contactX / dist) * tuning.items.blinkDistance;
        p.pos.y -= (contactY / dist) * tuning.items.blinkDistance;
      }
      damagePlayer(world, contactDamage, i);
      p.iFrameTicks = I_FRAME_TICKS;
    }
  }
}
