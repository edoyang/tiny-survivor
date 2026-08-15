import weapons from '../data/weapons.json' with { type: 'json' };
import { poolReleaseAt } from '../pool.ts';
import { queryCircle, sortQueryResultsDescending } from '../spatial.ts';
import {
  AXE_PHASE_DWELL,
  AXE_PHASE_OUT,
  AXE_PHASE_RETURN,
  FIXED_DT,
  MAX_PIERCE_TRACKED,
  PROJ_AXE,
  PROJ_FIREBALL,
  PROJ_MISSILE,
  PROJ_SWORD,
  REHIT_SLOTS,
  type Orb,
  type Projectile,
  type World,
} from '../state.ts';
import { damageEnemy } from './damage.ts';
import { findEnemyIndexById } from './targeting.ts';

const ENEMY_QUERY_PAD = 19;
const SWORD_TURN_RAD = (weapons.sword.turnDegPerSec * Math.PI) / 180;
const MISSILE_TURN_RAD = (weapons.missile.turnDegPerSec * Math.PI) / 180;
const ORB_ANGULAR_RAD = (weapons.orb.orbitDegPerSec * Math.PI) / 180;
const AXE_REHIT_TICKS = Math.round(weapons.axe.rehitSeconds / FIXED_DT);
const ORB_REHIT_TICKS = Math.round(weapons.orb.rehitSeconds / FIXED_DT);

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

function rehitMark(p: { rehitIds: Int32Array; rehitNextTick: Int32Array; rehitCount: number }, enemyId: number, tick: number, cooldownTicks: number): void {
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

function explodeFireball(world: World, p: Projectile): void {
  const hash = world.enemyHash;
  const aoe = weapons.fireball.aoeRadius;
  queryCircle(hash, p.pos.x, p.pos.y, aoe + ENEMY_QUERY_PAD);
  sortQueryResultsDescending(hash);
  for (let q = 0; q < hash.queryCount; q++) {
    const idx = hash.queryResults[q];
    const e = world.enemies.items[idx];
    const dx = e.pos.x - p.pos.x;
    const dy = e.pos.y - p.pos.y;
    const reach = aoe + e.radius;
    if (dx * dx + dy * dy <= reach * reach) {
      damageEnemy(world, idx, p.damage);
    }
  }
}

function updateFireball(world: World, p: Projectile): boolean {
  p.pos.x += p.dirX * p.speed * FIXED_DT;
  p.pos.y += p.dirY * p.speed * FIXED_DT;
  p.ttlTicks--;
  if (p.ttlTicks <= 0) return false;
  const hash = world.enemyHash;
  queryCircle(hash, p.pos.x, p.pos.y, p.radius + ENEMY_QUERY_PAD);
  for (let q = 0; q < hash.queryCount; q++) {
    const e = world.enemies.items[hash.queryResults[q]];
    const dx = e.pos.x - p.pos.x;
    const dy = e.pos.y - p.pos.y;
    const reach = p.radius + e.radius;
    if (dx * dx + dy * dy <= reach * reach) {
      explodeFireball(world, p);
      return false;
    }
  }
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
    damageEnemy(world, idx, p.damage);
    p.pierceLeft--;
    if (p.pierceLeft <= 0) return false;
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
    if (p.traveled >= w.maxRange) p.axePhase = AXE_PHASE_DWELL;
  } else if (p.axePhase === AXE_PHASE_DWELL) {
    p.dwellTicksLeft--;
    if (p.dwellTicksLeft <= 0) p.axePhase = AXE_PHASE_RETURN;
  } else {
    const player = world.player;
    const dx = player.pos.x - p.pos.x;
    const dy = player.pos.y - p.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = p.speed * w.returnSpeedMult * FIXED_DT;
    if (dist <= step + player.radius) {
      return false;
    }
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
    const e = world.enemies.items[idx];
    const dx = e.pos.x - p.pos.x;
    const dy = e.pos.y - p.pos.y;
    const reach = p.radius + e.radius;
    if (dx * dx + dy * dy > reach * reach) continue;
    if (!rehitReady(p.rehitIds, p.rehitNextTick, p.rehitCount, e.id, world.tick)) continue;
    rehitMark(p, e.id, world.tick, AXE_REHIT_TICKS);
    damageEnemy(world, idx, p.damage);
  }
  return true;
}

function updateMissile(world: World, p: Projectile): boolean {
  const targetIdx = findEnemyIndexById(world, p.targetId);
  if (targetIdx >= 0) {
    const target = world.enemies.items[targetIdx];
    turnToward(p, target.pos.x, target.pos.y, MISSILE_TURN_RAD);
  }
  p.pos.x += p.dirX * p.speed * FIXED_DT;
  p.pos.y += p.dirY * p.speed * FIXED_DT;
  p.ttlTicks--;
  if (p.ttlTicks <= 0) return false;
  const hash = world.enemyHash;
  queryCircle(hash, p.pos.x, p.pos.y, p.radius + ENEMY_QUERY_PAD);
  let hitIdx = -1;
  let bestD2 = Infinity;
  for (let q = 0; q < hash.queryCount; q++) {
    const idx = hash.queryResults[q];
    const e = world.enemies.items[idx];
    const dx = e.pos.x - p.pos.x;
    const dy = e.pos.y - p.pos.y;
    const reach = p.radius + e.radius;
    const d2 = dx * dx + dy * dy;
    if (d2 <= reach * reach && d2 < bestD2) {
      bestD2 = d2;
      hitIdx = idx;
    }
  }
  if (hitIdx >= 0) {
    damageEnemy(world, hitIdx, p.damage);
    return false;
  }
  return true;
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
    else alive = updateMissile(world, p);
    if (!alive) {
      if (p.kind === PROJ_AXE) world.liveAxes--;
      poolReleaseAt(pool, i);
    }
  }
}

export function updateOrb(world: World): void {
  const orb: Orb = world.orb;
  if (!orb.active) return;
  orb.prevX = orb.pos.x;
  orb.prevY = orb.pos.y;
  orb.angle += ORB_ANGULAR_RAD * FIXED_DT;
  if (orb.angle > Math.PI * 2) orb.angle -= Math.PI * 2;
  const player = world.player;
  orb.pos.x = player.pos.x + Math.cos(orb.angle) * weapons.orb.orbitRadius;
  orb.pos.y = player.pos.y + Math.sin(orb.angle) * weapons.orb.orbitRadius;
  const hash = world.enemyHash;
  queryCircle(hash, orb.pos.x, orb.pos.y, weapons.orb.radius + ENEMY_QUERY_PAD);
  sortQueryResultsDescending(hash);
  for (let q = 0; q < hash.queryCount; q++) {
    const idx = hash.queryResults[q];
    const e = world.enemies.items[idx];
    const dx = e.pos.x - orb.pos.x;
    const dy = e.pos.y - orb.pos.y;
    const reach = weapons.orb.radius + e.radius;
    if (dx * dx + dy * dy > reach * reach) continue;
    if (!rehitReady(orb.rehitIds, orb.rehitNextTick, orb.rehitCount, e.id, world.tick)) continue;
    rehitMark(orb, e.id, world.tick, ORB_REHIT_TICKS);
    damageEnemy(world, idx, weapons.orb.damage);
  }
}
