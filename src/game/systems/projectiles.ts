import tuning from '../data/tuning.json' with { type: 'json' };
import weapons from '../data/weapons.json' with { type: 'json' };
import { spawnEffect, spawnField } from '../entities/effects.ts';
import { spawnBomb, spawnShard } from '../entities/projectiles.ts';
import {
  AXE_PHASE_DWELL,
  AXE_PHASE_OUT,
  AXE_PHASE_RETURN,
  FX_EXPLOSION,
  MAX_PIERCE_TRACKED,
  PROJ_AXE,
  PROJ_BOMB,
  PROJ_FIREBALL,
  PROJ_ICICLE,
  PROJ_MISSILE,
  PROJ_SHARD,
  PROJ_SWORD,
  REHIT_SLOTS,
} from '../kinds.ts';
import { poolReleaseAt } from '../pool.ts';
import { queryCircle, sortQueryResultsDescending } from '../spatial.ts';
import { FIXED_DT, type Orbiter, type Projectile, type World } from '../state.ts';
import { damageInRadius, hitEnemy } from './damage.ts';
import { findEnemyIndexById } from './targeting.ts';

const ENEMY_QUERY_PAD = 19;
const SWORD_TURN_RAD = (weapons.sword.turnDegPerSec * Math.PI) / 180;
const MISSILE_TURN_RAD = (weapons.missile.turnDegPerSec * Math.PI) / 180;
const ICICLE_TURN_RAD = (tuning.abilities.icicleTurnDegPerSec * Math.PI) / 180;
const ORB_ANGULAR_RAD = (tuning.items.orbiterDegPerSec * Math.PI) / 180;
const AXE_REHIT_TICKS = Math.round(weapons.axe.rehitSeconds / FIXED_DT);
const ORB_REHIT_TICKS = Math.round(tuning.items.orbiterRehitSeconds / FIXED_DT);
const AXE_POOL_TICKS = Math.round(tuning.items.axeFirePoolSeconds * 60);
const FIELD_TICK = Math.round(tuning.abilities.fieldDamageIntervalSeconds * 60);
const SHATTER_SPREAD = (tuning.items.shatterSpreadDeg * Math.PI) / 180;

function rehitReady(
  ids: Int32Array,
  nextTicks: Int32Array,
  count: number,
  enemyId: number,
  tick: number,
): boolean {
  for (let i = 0; i < count; i++) {
    if (ids[i] === enemyId) return tick >= nextTicks[i];
  }
  return true;
}

function rehitMark(
  p: { rehitIds: Int32Array; rehitNextTick: Int32Array; rehitCount: number },
  enemyId: number,
  tick: number,
  cooldownTicks: number,
): void {
  for (let i = 0; i < p.rehitCount; i++) {
    if (p.rehitIds[i] === enemyId) {
      p.rehitNextTick[i] = tick + cooldownTicks;
      return;
    }
  }
  if (p.rehitCount < REHIT_SLOTS) {
    p.rehitIds[p.rehitCount] = enemyId;
    p.rehitNextTick[p.rehitCount] = tick + cooldownTicks;
    p.rehitCount++;
    return;
  }
  let oldest = 0;
  for (let i = 1; i < REHIT_SLOTS; i++) {
    if (p.rehitNextTick[i] < p.rehitNextTick[oldest]) oldest = i;
  }
  p.rehitIds[oldest] = enemyId;
  p.rehitNextTick[oldest] = tick + cooldownTicks;
}

function alreadyHit(p: Projectile, enemyId: number): boolean {
  for (let i = 0; i < p.hitCount; i++) {
    if (p.hitIds[i] === enemyId) return true;
  }
  return false;
}

function turnToward(p: Projectile, targetX: number, targetY: number, maxTurnRad: number): void {
  const desired = Math.atan2(targetY - p.pos.y, targetX - p.pos.x);
  let delta = desired - p.angle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const step = maxTurnRad * FIXED_DT;
  if (delta > step) delta = step;
  else if (delta < -step) delta = -step;
  p.angle += delta;
  p.dirX = Math.cos(p.angle);
  p.dirY = Math.sin(p.angle);
}

function releaseShatter(world: World, p: Projectile): void {
  if (p.shatterLeft <= 0) return;
  p.shatterLeft = 0;
  const count = tuning.items.shatterCount;
  const damage = p.damage * tuning.items.shatterDamageMult;
  for (let i = 0; i < count; i++) {
    const offset = (i / (count - 1) - 0.5) * SHATTER_SPREAD * 2;
    const angle = p.angle + offset;
    spawnShard(world, p.pos.x, p.pos.y, Math.cos(angle), Math.sin(angle), damage);
  }
}

function endPierce(world: World, p: Projectile): void {
  if (!world.player.pierceBurst) return;
  spawnEffect(world, FX_EXPLOSION, p.pos.x, p.pos.y, tuning.items.pierceBurstRadius);
  damageInRadius(
    world,
    p.pos.x,
    p.pos.y,
    tuning.items.pierceBurstRadius,
    p.damage * tuning.items.pierceBurstDamageMult,
  );
}

function explode(world: World, p: Projectile): void {
  spawnEffect(world, p.visual, p.pos.x, p.pos.y, p.aoeRadius);
  damageInRadius(world, p.pos.x, p.pos.y, p.aoeRadius, p.damage);
  if (p.clusterLeft > 0) {
    const count = tuning.items.bombClusterCount;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const shot = spawnBomb(
        world,
        p.pos.x,
        p.pos.y,
        Math.cos(angle),
        Math.sin(angle),
        p.visual,
      );
      if (shot === null) continue;
      shot.damage = p.damage * tuning.items.bombClusterDamageMult;
      shot.aoeRadius = p.aoeRadius * tuning.items.bombClusterRadiusMult;
      shot.ttlTicks = Math.round(shot.ttlTicks * 0.4);
      shot.clusterLeft = 0;
    }
  }
}

function firstContact(world: World, p: Projectile): number {
  const hash = world.enemyHash;
  queryCircle(hash, p.pos.x, p.pos.y, p.radius + ENEMY_QUERY_PAD);
  let hitIdx = -1;
  let bestD2 = Infinity;
  for (let q = 0; q < hash.queryCount; q++) {
    const idx = hash.queryResults[q];
    if (idx >= world.enemies.count) continue;
    const e = world.enemies.items[idx];
    if (alreadyHit(p, e.id)) continue;
    const dx = e.pos.x - p.pos.x;
    const dy = e.pos.y - p.pos.y;
    const reach = p.radius + e.radius;
    const d2 = dx * dx + dy * dy;
    if (d2 <= reach * reach && d2 < bestD2) {
      bestD2 = d2;
      hitIdx = idx;
    }
  }
  return hitIdx;
}

function updateFireball(world: World, p: Projectile): boolean {
  p.pos.x += p.dirX * p.speed * FIXED_DT;
  p.pos.y += p.dirY * p.speed * FIXED_DT;
  p.ttlTicks--;
  if (p.ttlTicks <= 0) return false;
  const idx = firstContact(world, p);
  if (idx < 0) return true;
  const enemy = world.enemies.items[idx];
  if (p.hitCount < MAX_PIERCE_TRACKED) {
    p.hitIds[p.hitCount] = enemy.id;
    p.hitCount++;
  }
  explode(world, p);
  if (p.pierceLeft <= 0) {
    releaseShatter(world, p);
    return false;
  }
  p.pierceLeft--;
  releaseShatter(world, p);
  return true;
}

function updateSword(world: World, p: Projectile): boolean {
  if (!alreadyHit(p, p.targetId)) {
    const targetIdx = findEnemyIndexById(world, p.targetId);
    if (targetIdx >= 0) {
      const target = world.enemies.items[targetIdx];
      turnToward(p, target.pos.x, target.pos.y, SWORD_TURN_RAD);
    }
  }
  p.pos.x += p.dirX * p.speed * FIXED_DT;
  p.pos.y += p.dirY * p.speed * FIXED_DT;
  p.ttlTicks--;
  if (p.ttlTicks <= 0) return false;
  const hash = world.enemyHash;
  queryCircle(hash, p.pos.x, p.pos.y, p.radius + ENEMY_QUERY_PAD);
  sortQueryResultsDescending(hash);
  for (let q = 0; q < hash.queryCount; q++) {
    const idx = hash.queryResults[q];
    if (idx >= world.enemies.count) continue;
    const e = world.enemies.items[idx];
    if (alreadyHit(p, e.id)) continue;
    const dx = e.pos.x - p.pos.x;
    const dy = e.pos.y - p.pos.y;
    const reach = p.radius + e.radius;
    if (dx * dx + dy * dy > reach * reach) continue;
    if (p.hitCount < MAX_PIERCE_TRACKED) {
      p.hitIds[p.hitCount] = e.id;
      p.hitCount++;
    }
    hitEnemy(world, idx, p.damage, p.pos.x, p.pos.y);
    releaseShatter(world, p);
    p.pierceLeft--;
    if (p.pierceLeft <= 0) {
      endPierce(world, p);
      return false;
    }
  }
  return true;
}

function updateAxe(world: World, p: Projectile): boolean {
  const w = weapons.axe;
  if (p.axePhase === AXE_PHASE_OUT) {
    const step = p.speed * FIXED_DT;
    p.pos.x += p.dirX * step;
    p.pos.y += p.dirY * step;
    p.traveled += step;
    if (p.traveled >= w.maxRange) {
      p.axePhase = AXE_PHASE_DWELL;
      if (world.player.axeFirePool) {
        spawnField(
          world,
          FX_EXPLOSION,
          p.pos.x,
          p.pos.y,
          tuning.items.axeFirePoolRadius * world.player.aoeMult,
          tuning.items.axeFirePoolDamage * world.player.damageMult,
          FIELD_TICK,
          1,
          AXE_POOL_TICKS,
          false,
          0,
        );
      }
    }
  } else if (p.axePhase === AXE_PHASE_DWELL) {
    p.dwellTicksLeft--;
    if (p.dwellTicksLeft <= 0) p.axePhase = AXE_PHASE_RETURN;
  } else {
    const player = world.player;
    const dx = player.pos.x - p.pos.x;
    const dy = player.pos.y - p.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = p.speed * w.returnSpeedMult * FIXED_DT;
    if (dist <= step + player.radius) return false;
    p.pos.x += (dx / dist) * step;
    p.pos.y += (dy / dist) * step;
  }
  p.ttlTicks--;
  if (p.ttlTicks <= 0) return false;
  const hash = world.enemyHash;
  queryCircle(hash, p.pos.x, p.pos.y, p.radius + ENEMY_QUERY_PAD);
  sortQueryResultsDescending(hash);
  for (let q = 0; q < hash.queryCount; q++) {
    const idx = hash.queryResults[q];
    if (idx >= world.enemies.count) continue;
    const e = world.enemies.items[idx];
    const dx = e.pos.x - p.pos.x;
    const dy = e.pos.y - p.pos.y;
    const reach = p.radius + e.radius;
    if (dx * dx + dy * dy > reach * reach) continue;
    if (!rehitReady(p.rehitIds, p.rehitNextTick, p.rehitCount, e.id, world.tick)) continue;
    rehitMark(p, e.id, world.tick, AXE_REHIT_TICKS);
    hitEnemy(world, idx, p.damage, p.pos.x, p.pos.y);
  }
  return true;
}

function updateSeeker(world: World, p: Projectile, turnRad: number): boolean {
  const targetIdx = findEnemyIndexById(world, p.targetId);
  if (targetIdx >= 0) {
    const target = world.enemies.items[targetIdx];
    turnToward(p, target.pos.x, target.pos.y, turnRad);
  }
  p.pos.x += p.dirX * p.speed * FIXED_DT;
  p.pos.y += p.dirY * p.speed * FIXED_DT;
  p.ttlTicks--;
  if (p.ttlTicks <= 0) return false;
  const idx = firstContact(world, p);
  if (idx < 0) return true;
  const enemy = world.enemies.items[idx];
  if (p.hitCount < MAX_PIERCE_TRACKED) {
    p.hitIds[p.hitCount] = enemy.id;
    p.hitCount++;
  }
  if (p.kind === PROJ_ICICLE) {
    spawnEffect(world, p.visual, p.pos.x, p.pos.y, tuning.render.hitEffectRadius);
  }
  hitEnemy(world, idx, p.damage, p.pos.x, p.pos.y);
  releaseShatter(world, p);
  p.pierceLeft--;
  if (p.pierceLeft <= 0) {
    endPierce(world, p);
    return false;
  }
  return true;
}

function updateShard(world: World, p: Projectile): boolean {
  p.pos.x += p.dirX * p.speed * FIXED_DT;
  p.pos.y += p.dirY * p.speed * FIXED_DT;
  p.ttlTicks--;
  if (p.ttlTicks <= 0) return false;
  const idx = firstContact(world, p);
  if (idx < 0) return true;
  hitEnemy(world, idx, p.damage, p.pos.x, p.pos.y);
  return false;
}

function updateBomb(world: World, p: Projectile): boolean {
  p.pos.x += p.dirX * p.speed * FIXED_DT;
  p.pos.y += p.dirY * p.speed * FIXED_DT;
  p.ttlTicks--;
  const contact = firstContact(world, p);
  if (p.ttlTicks > 0 && contact < 0) return true;
  explode(world, p);
  return false;
}

export function updateProjectiles(world: World): void {
  const pool = world.projectiles;
  for (let i = pool.count - 1; i >= 0; i--) {
    const p = pool.items[i];
    p.prevX = p.pos.x;
    p.prevY = p.pos.y;
    let alive: boolean;
    if (p.kind === PROJ_FIREBALL) alive = updateFireball(world, p);
    else if (p.kind === PROJ_SWORD) alive = updateSword(world, p);
    else if (p.kind === PROJ_AXE) alive = updateAxe(world, p);
    else if (p.kind === PROJ_MISSILE) alive = updateSeeker(world, p, MISSILE_TURN_RAD);
    else if (p.kind === PROJ_ICICLE) alive = updateSeeker(world, p, ICICLE_TURN_RAD);
    else if (p.kind === PROJ_SHARD) alive = updateShard(world, p);
    else if (p.kind === PROJ_BOMB) alive = updateBomb(world, p);
    else alive = false;
    if (!alive) {
      if (p.kind === PROJ_AXE) world.liveAxes--;
      poolReleaseAt(pool, i);
    }
  }
}

function updateOneOrbiter(world: World, orbiter: Orbiter): void {
  const hash = world.enemyHash;
  queryCircle(hash, orbiter.pos.x, orbiter.pos.y, tuning.items.orbiterHitRadius + ENEMY_QUERY_PAD);
  sortQueryResultsDescending(hash);
  for (let q = 0; q < hash.queryCount; q++) {
    const idx = hash.queryResults[q];
    if (idx >= world.enemies.count) continue;
    const e = world.enemies.items[idx];
    const dx = e.pos.x - orbiter.pos.x;
    const dy = e.pos.y - orbiter.pos.y;
    const reach = tuning.items.orbiterHitRadius + e.radius;
    if (dx * dx + dy * dy > reach * reach) continue;
    if (!rehitReady(orbiter.rehitIds, orbiter.rehitNextTick, orbiter.rehitCount, e.id, world.tick)) {
      continue;
    }
    rehitMark(orbiter, e.id, world.tick, ORB_REHIT_TICKS);
    hitEnemy(world, idx, orbiter.damage, orbiter.pos.x, orbiter.pos.y);
  }
}

export function updateOrbiters(world: World): void {
  const count = world.orbiterCount;
  if (count === 0) return;
  world.orbiterAngle += ORB_ANGULAR_RAD * FIXED_DT;
  if (world.orbiterAngle > Math.PI * 2) world.orbiterAngle -= Math.PI * 2;
  const player = world.player;
  for (let i = 0; i < count; i++) {
    const orbiter = world.orbiters[i];
    orbiter.prevX = orbiter.pos.x;
    orbiter.prevY = orbiter.pos.y;
    orbiter.angle = world.orbiterAngle + (i / count) * Math.PI * 2;
    orbiter.pos.x = player.pos.x + Math.cos(orbiter.angle) * orbiter.radius;
    orbiter.pos.y = player.pos.y + Math.sin(orbiter.angle) * orbiter.radius;
    updateOneOrbiter(world, orbiter);
  }
}
