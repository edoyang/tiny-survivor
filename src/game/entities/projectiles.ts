import tuning from '../data/tuning.json' with { type: 'json' };
import weapons from '../data/weapons.json' with { type: 'json' };
import {
  AXE_PHASE_OUT,
  FX_EXPLOSION,
  FX_FROST,
  PROJ_AXE,
  PROJ_BOMB,
  PROJ_FIREBALL,
  PROJ_ICICLE,
  PROJ_MISSILE,
  PROJ_SHARD,
  PROJ_SWORD,
} from '../kinds.ts';
import { poolObtain } from '../pool.ts';
import { FIXED_DT, type Projectile, type World } from '../state.ts';

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
  p.aoeRadius = 0;
  p.visual = FX_EXPLOSION;
  p.axePhase = AXE_PHASE_OUT;
  p.traveled = 0;
  p.dwellTicksLeft = 0;
  p.shatterLeft = 0;
  p.clusterLeft = 0;
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

function applyPierceRules(world: World, p: Projectile, basePierce: number): void {
  const player = world.player;
  const pierce = basePierce + player.bonusPierce + (player.pierceAll ? 1 : 0);
  p.pierceLeft = Math.min(Math.max(1, pierce), p.hitIds.length);
  p.shatterLeft = player.shatter ? 1 : 0;
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
  p.aoeRadius = w.aoeRadius * world.player.aoeMult;
  p.visual = FX_EXPLOSION;
  p.pierceLeft = world.player.pierceAll ? 1 + world.player.bonusPierce : 0;
  p.shatterLeft = world.player.shatter ? 1 : 0;
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
  applyPierceRules(world, p, pierce);
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
  applyPierceRules(world, p, world.player.pierceAll ? 0 : 1);
  p.ttlTicks = Math.round(w.lifetimeSeconds / FIXED_DT);
  return p;
}

export function spawnIcicle(
  world: World,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  targetId: number,
  visual: number,
): Projectile | null {
  const p = obtainProjectile(world, PROJ_ICICLE, x, y);
  if (p === null) return null;
  const a = tuning.abilities;
  aim(p, dirX, dirY);
  p.speed = a.icicleSpeed;
  p.damage = 0;
  p.radius = a.icicleRadius;
  p.targetId = targetId;
  p.visual = visual;
  applyPierceRules(world, p, world.player.pierceAll ? 0 : 1);
  p.ttlTicks = Math.round(a.icicleLifetimeSeconds / FIXED_DT);
  return p;
}

export function spawnShard(
  world: World,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  damage: number,
): Projectile | null {
  const p = obtainProjectile(world, PROJ_SHARD, x, y);
  if (p === null) return null;
  const a = tuning.abilities;
  aim(p, dirX, dirY);
  p.speed = a.icicleSpeed;
  p.damage = damage;
  p.radius = a.icicleRadius;
  p.visual = FX_FROST;
  p.pierceLeft = 1;
  p.shatterLeft = 0;
  p.ttlTicks = Math.round(a.icicleLifetimeSeconds / FIXED_DT);
  return p;
}

export function spawnBomb(
  world: World,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  visual: number,
): Projectile | null {
  const p = obtainProjectile(world, PROJ_BOMB, x, y);
  if (p === null) return null;
  const a = tuning.abilities;
  aim(p, dirX, dirY);
  p.speed = a.bombSpeed;
  p.damage = 0;
  p.radius = a.bombRadius;
  p.visual = visual;
  p.ttlTicks = Math.round(a.bombRangeSeconds / FIXED_DT);
  return p;
}
