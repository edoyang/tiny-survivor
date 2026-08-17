import tuning from '../data/tuning.json' with { type: 'json' };
import { poolReleaseAt } from '../pool.ts';
import { queryCircle } from '../spatial.ts';
import { FIXED_DT, type Field, type World } from '../state.ts';
import { damageInRadius } from './damage.ts';

const ENEMY_QUERY_PAD = 19;
const SLOW_STICK_TICKS = Math.round(tuning.abilities.slowStickSeconds * 60);

function applyFieldPressure(world: World, field: Field): void {
  if (field.slowMult >= 1 && field.pull === 0) return;
  if (field.radius <= 0) return;
  const hash = world.enemyHash;
  queryCircle(hash, field.pos.x, field.pos.y, field.radius + ENEMY_QUERY_PAD);
  for (let q = 0; q < hash.queryCount; q++) {
    const idx = hash.queryResults[q];
    if (idx >= world.enemies.count) continue;
    const e = world.enemies.items[idx];
    const dx = field.pos.x - e.pos.x;
    const dy = field.pos.y - e.pos.y;
    const dist2 = dx * dx + dy * dy;
    const reach = field.radius + e.radius;
    if (dist2 > reach * reach) continue;
    if (field.slowMult < e.slowMult) e.slowMult = field.slowMult;
    if (field.slowMult < 1) e.slowTicks = SLOW_STICK_TICKS;
    if (field.pull !== 0) {
      const dist = Math.sqrt(dist2);
      if (dist > 0.001) {
        e.pos.x += (dx / dist) * field.pull * FIXED_DT;
        e.pos.y += (dy / dist) * field.pull * FIXED_DT;
      }
    }
  }
}

function tickFieldDamage(world: World, field: Field): void {
  if (field.damage <= 0 || field.radius <= 0) return;
  if (field.damageTimerTicks > 0) {
    field.damageTimerTicks--;
    return;
  }
  field.damageTimerTicks = field.damageIntervalTicks;
  damageInRadius(world, field.pos.x, field.pos.y, field.radius, field.damage);
}

export function updateFields(world: World): void {
  const pool = world.fields;
  const player = world.player;
  for (let i = pool.count - 1; i >= 0; i--) {
    const field = pool.items[i];
    if (field.follow) {
      field.pos.x = player.pos.x;
      field.pos.y = player.pos.y;
    }
    if (field.growPerSec !== 0) field.radius += field.growPerSec * FIXED_DT;
    applyFieldPressure(world, field);
    tickFieldDamage(world, field);
    field.ttlTicks--;
    if (field.ttlTicks <= 0) poolReleaseAt(pool, i);
  }
  applyFieldPressure(world, world.auraField);
}

export function updateEffects(world: World): void {
  const pool = world.effects;
  for (let i = pool.count - 1; i >= 0; i--) {
    const fx = pool.items[i];
    fx.ageTicks++;
    if (fx.ageTicks >= fx.lifeTicks) poolReleaseAt(pool, i);
  }
}
