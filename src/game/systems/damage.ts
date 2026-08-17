import tuning from '../data/tuning.json' with { type: 'json' };
import { spawnEffect } from '../entities/effects.ts';
import { spawnGem } from '../entities/pickups.ts';
import { spawnSword } from '../entities/projectiles.ts';
import { BOSS_FINAL, BOSS_NONE, FX_FROST, FX_SLASH } from '../kinds.ts';
import { poolReleaseAt } from '../pool.ts';
import { nextFloat } from '../rng.ts';
import { queryCircle, sortQueryResultsDescending } from '../spatial.ts';
import { FIXED_DT, type World } from '../state.ts';
import { findNearestEnemyExcluding } from './targeting.ts';

const RIPOSTE_SCRATCH = new Int32Array(8);
const ENEMY_QUERY_PAD = 19;
const KNOCKBACK_TICKS = Math.round(tuning.abilities.knockbackSeconds * 60);

let chainDepth = 0;

function killEnemy(world: World, enemyIndex: number): void {
  const enemy = world.enemies.items[enemyIndex];
  const p = world.player;
  world.kills++;
  if (enemy.boss === BOSS_FINAL) world.spawn.bossKilled = true;
  const wasSlowed = enemy.slowTicks > 0;
  const wasBurning = enemy.burnTicks > 0;
  const x = enemy.pos.x;
  const y = enemy.pos.y;
  spawnGem(world, x, y, Math.max(1, Math.round(enemy.xp * p.xpMult)));
  poolReleaseAt(world.enemies, enemyIndex);
  if (p.lifeOnKill > 0 && p.hp > 0) {
    p.hp = Math.min(p.maxHp, p.hp + p.lifeOnKill);
  }
  if (p.cooldownOnKillTicks > 0 && p.attackTimerTicks > 0) {
    p.attackTimerTicks = Math.max(0, p.attackTimerTicks - p.cooldownOnKillTicks);
  }
  if (chainDepth === 0) {
    chainDepth++;
    if (p.freezeShatter && wasSlowed) {
      spawnEffect(world, FX_FROST, x, y, tuning.items.freezeShatterRadius);
      damageInRadius(world, x, y, tuning.items.freezeShatterRadius, tuning.items.freezeShatterDamage * p.damageMult);
    }
    if (p.burnSpread && wasBurning) {
      applyBurnInRadius(world, x, y, tuning.items.burnSpreadRadius, p.onHitBurnDps, p.onHitBurnTicks);
    }
    chainDepth--;
  }
  if (p.recastAbility >= 0 && nextFloat(world.rng) < tuning.items.recastOnKillChance) {
    world.recastQueued++;
  }
}

export function damageEnemy(world: World, enemyIndex: number, amount: number): boolean {
  const enemy = world.enemies.items[enemyIndex];
  enemy.hp -= amount;
  if (enemy.hp > 0) return false;
  killEnemy(world, enemyIndex);
  return true;
}

export function hitEnemy(
  world: World,
  enemyIndex: number,
  baseDamage: number,
  fromX: number,
  fromY: number,
): boolean {
  const p = world.player;
  const enemy = world.enemies.items[enemyIndex];
  let amount = baseDamage;
  if (p.critChance > 0 && nextFloat(world.rng) < p.critChance) amount *= p.critMult;
  if (p.onHitBurnDps > 0) {
    enemy.burnDps = Math.max(enemy.burnDps, p.onHitBurnDps);
    enemy.burnTicks = p.onHitBurnTicks;
  }
  if (p.knockback > 0) {
    const dx = enemy.pos.x - fromX;
    const dy = enemy.pos.y - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.001) {
      enemy.pos.x += (dx / dist) * p.knockback * KNOCKBACK_TICKS * FIXED_DT;
      enemy.pos.y += (dy / dist) * p.knockback * KNOCKBACK_TICKS * FIXED_DT;
    }
  }
  if (
    p.executeFrac > 0 &&
    enemy.boss === BOSS_NONE &&
    enemy.hp - amount <= enemy.maxHp * p.executeFrac
  ) {
    killEnemy(world, enemyIndex);
    return true;
  }
  return damageEnemy(world, enemyIndex, amount);
}

export function damageInRadius(
  world: World,
  x: number,
  y: number,
  radius: number,
  amount: number,
): void {
  const hash = world.enemyHash;
  queryCircle(hash, x, y, radius + ENEMY_QUERY_PAD);
  sortQueryResultsDescending(hash);
  for (let q = 0; q < hash.queryCount; q++) {
    const idx = hash.queryResults[q];
    if (idx >= world.enemies.count) continue;
    const e = world.enemies.items[idx];
    const dx = e.pos.x - x;
    const dy = e.pos.y - y;
    const reach = radius + e.radius;
    if (dx * dx + dy * dy <= reach * reach) hitEnemy(world, idx, amount, x, y);
  }
}

export function applyBurnInRadius(
  world: World,
  x: number,
  y: number,
  radius: number,
  dps: number,
  ticks: number,
): void {
  if (dps <= 0 || ticks <= 0) return;
  const hash = world.enemyHash;
  queryCircle(hash, x, y, radius + ENEMY_QUERY_PAD);
  for (let q = 0; q < hash.queryCount; q++) {
    const idx = hash.queryResults[q];
    if (idx >= world.enemies.count) continue;
    const e = world.enemies.items[idx];
    const dx = e.pos.x - x;
    const dy = e.pos.y - y;
    const reach = radius + e.radius;
    if (dx * dx + dy * dy > reach * reach) continue;
    e.burnDps = Math.max(e.burnDps, dps);
    e.burnTicks = ticks;
  }
}

export function damagePlayer(world: World, rawAmount: number, attackerIndex: number): void {
  const p = world.player;
  if (p.invulnTicks > 0 || p.iFrameTicks > 0 || p.hp <= 0) return;
  let remaining = rawAmount * (1 - p.damageReduction);
  if (p.shield > 0) {
    const absorbed = Math.min(p.shield, remaining);
    p.shield -= absorbed;
    remaining -= absorbed;
    if (p.shieldReflect && attackerIndex >= 0 && attackerIndex < world.enemies.count) {
      damageEnemy(world, attackerIndex, absorbed * 2);
    }
  }
  p.hp -= remaining;
  p.shieldTimerTicks = p.shieldRegenTicks;
  if (p.lifesteal) p.hp += remaining * tuning.items.lifestealFraction;
  if (p.hp > p.maxHp) p.hp = p.maxHp;
  if (p.thorns > 0 && attackerIndex >= 0 && attackerIndex < world.enemies.count) {
    damageEnemy(world, attackerIndex, rawAmount * p.thorns * (p.thornsDouble ? 2 : 1));
  }
  if (p.riposte) fireRiposte(world);
  if (p.sprintInvuln) p.invulnTicks = Math.max(p.invulnTicks, 60);
  if (p.hp <= 0 && p.revivesLeft > 0) {
    p.revivesLeft--;
    world.reviveUsed = true;
    p.hp = p.maxHp;
    p.invulnTicks = Math.round(tuning.items.invulnPulseDurationSeconds * 60);
  }
  if (p.hp < 0) p.hp = 0;
}

function fireRiposte(world: World): void {
  const p = world.player;
  let picked = 0;
  for (let n = 0; n < tuning.items.riposteSwords && picked < RIPOSTE_SCRATCH.length; n++) {
    const idx = findNearestEnemyExcluding(
      world,
      p.pos.x,
      p.pos.y,
      tuning.abilities.searchRange,
      RIPOSTE_SCRATCH,
      picked,
    );
    if (idx < 0) break;
    const target = world.enemies.items[idx];
    RIPOSTE_SCRATCH[picked] = target.id;
    picked++;
    const shot = spawnSword(
      world,
      p.pos.x,
      p.pos.y,
      target.pos.x - p.pos.x,
      target.pos.y - p.pos.y,
      target.id,
      1,
    );
    if (shot !== null) shot.damage *= p.damageMult;
  }
  if (picked > 0) spawnEffect(world, FX_SLASH, p.pos.x, p.pos.y, tuning.render.castEffectRadius);
}
