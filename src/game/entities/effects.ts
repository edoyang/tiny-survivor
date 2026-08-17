import tuning from '../data/tuning.json' with { type: 'json' };
import { poolObtain } from '../pool.ts';
import type { Effect, Field, World } from '../state.ts';

const EFFECT_LIFE_TICKS = Math.round(tuning.render.effectSeconds * 60);

export function spawnEffect(
  world: World,
  kind: number,
  x: number,
  y: number,
  radius: number,
): Effect | null {
  const fx = poolObtain(world.effects);
  if (fx === null) return null;
  fx.kind = kind;
  fx.pos.x = x;
  fx.pos.y = y;
  fx.ageTicks = 0;
  fx.lifeTicks = EFFECT_LIFE_TICKS;
  fx.radius = radius;
  return fx;
}

export function spawnField(
  world: World,
  visual: number,
  x: number,
  y: number,
  radius: number,
  damage: number,
  damageIntervalTicks: number,
  slowMult: number,
  ttlTicks: number,
  follow: boolean,
  growPerSec: number,
): Field | null {
  const field = poolObtain(world.fields);
  if (field === null) return null;
  field.visual = visual;
  field.pos.x = x;
  field.pos.y = y;
  field.radius = radius;
  field.growPerSec = growPerSec;
  field.damage = damage;
  field.damageIntervalTicks = damageIntervalTicks;
  field.damageTimerTicks = 0;
  field.slowMult = slowMult;
  field.pull = 0;
  field.ttlTicks = ttlTicks;
  field.lifeTicks = ttlTicks;
  field.follow = follow;
  return field;
}
