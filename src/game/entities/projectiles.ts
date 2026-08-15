import weapons from '../data/weapons.json' with { type: 'json' };
import { poolObtain } from '../pool.ts';
import {
  AXE_PHASE_OUT,
  FIXED_DT,
  PROJ_AXE,
  PROJ_FIREBALL,
  PROJ_MISSILE,
  PROJ_SWORD,
  type Projectile,
  type World,
} from '../state.ts';

function obtainProjectile(world: World, kind: number, x: number, y: number): Projectile | null {
  const p = poolObtain(world.projectiles);
  if (p === null) return null;
  p.id = world.nextEntityId;
  world.nextEntityId++;
  p.kind = kind;
  p.pos.x = x;
  p.pos.y = y;
  p.prevX = x;
  p.prevY = y;
  p.targetId = 0;
  p.pierceLeft = 0;
  p.hitCount = 0;
  p.axePhase = AXE_PHASE_OUT;
  p.traveled = 0;
  p.dwellTicksLeft = 0;
  p.rehitCount = 0;
  return p;
}

function aim(p: Projectile, dirX: number, dirY: number): void {
  const len = Math.sqrt(dirX * dirX + dirY * dirY);
  if (len > 0.0001) {
    p.dirX = dirX / len;
    p.dirY = dirY / len;
  } else {
    p.dirX = 1;
    p.dirY = 0;
  }
  p.angle = Math.atan2(p.dirY, p.dirX);
}

export function spawnFireball(
  world: World,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
): Projectile | null {
  const p = obtainProjectile(world, PROJ_FIREBALL, x, y);
  if (p === null) return null;
  const w = weapons.fireball;
  aim(p, dirX, dirY);
  p.speed = w.speed;
  p.damage = w.damage;
  p.radius = w.radius;
  p.ttlTicks = Math.round(w.range / w.speed / FIXED_DT);
  return p;
}

export function spawnSword(
  world: World,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  targetId: number,
  pierce: number,
): Projectile | null {
  const p = obtainProjectile(world, PROJ_SWORD, x, y);
  if (p === null) return null;
  const w = weapons.sword;
  aim(p, dirX, dirY);
  p.speed = w.speed;
  p.damage = w.damage;
  p.radius = w.radius;
  p.targetId = targetId;
  p.pierceLeft = Math.min(pierce, p.hitIds.length);
  p.ttlTicks = Math.round(w.lifetimeSeconds / FIXED_DT);
  return p;
}

export function spawnAxe(
  world: World,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
): Projectile | null {
  const p = obtainProjectile(world, PROJ_AXE, x, y);
  if (p === null) return null;
  const w = weapons.axe;
  aim(p, dirX, dirY);
  p.speed = w.speed;
  p.damage = w.damage;
  p.radius = w.radius;
  p.axePhase = AXE_PHASE_OUT;
  p.dwellTicksLeft = Math.round(w.dwellSeconds / FIXED_DT);
  p.ttlTicks = Math.round(30 / FIXED_DT);
  world.liveAxes++;
  return p;
}

export function spawnMissile(
  world: World,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  targetId: number,
): Projectile | null {
  const p = obtainProjectile(world, PROJ_MISSILE, x, y);
  if (p === null) return null;
  const w = weapons.missile;
  aim(p, dirX, dirY);
  p.speed = w.speed;
  p.damage = w.damage;
  p.radius = w.radius;
  p.targetId = targetId;
  p.ttlTicks = Math.round(w.lifetimeSeconds / FIXED_DT);
  return p;
}
