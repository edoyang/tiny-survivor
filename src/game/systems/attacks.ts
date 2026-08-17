import classes from '../data/classes.json' with { type: 'json' };
import tuning from '../data/tuning.json' with { type: 'json' };
import weapons from '../data/weapons.json' with { type: 'json' };
import {
  spawnAxe,
  spawnFireball,
  spawnMissile,
  spawnSword,
} from '../entities/projectiles.ts';
import { CLASS_DWARF, CLASS_KNIGHT, CLASS_WIZARD } from '../kinds.ts';
import { FIXED_DT, type Player, type World } from '../state.ts';
import { findNearestEnemy } from './targeting.ts';

const TWO_PI = Math.PI * 2;
const STAGGER_TICKS = Math.max(1, Math.round(weapons.volley.staggerSeconds / FIXED_DT));
const MOMENTUM_CAP_TICKS = 180;
const INVULN_PULSE_DURATION = Math.round(tuning.items.invulnPulseDurationSeconds * 60);

export function effectiveDamageMult(p: Player): number {
  let mult = p.damageMult;
  if (p.stillDamage > 0) {
    mult += p.stillDamage * Math.min(1, p.stillTicks / MOMENTUM_CAP_TICKS);
  }
  if (p.moveDamage > 0) {
    mult += p.moveDamage * Math.min(1, p.moveTicks / MOMENTUM_CAP_TICKS);
  }
  return mult;
}

export function fireVolleyShot(world: World, dirX: number, dirY: number): void {
  const p = world.player;
  const targetIdx = findNearestEnemy(world, p.pos.x, p.pos.y, weapons.acquireRange);
  const targetId = targetIdx >= 0 ? world.enemies.items[targetIdx].id : 0;
  let shot = null;
  if (p.classId === CLASS_WIZARD) {
    shot = spawnFireball(world, p.pos.x, p.pos.y, dirX, dirY);
  } else if (p.classId === CLASS_KNIGHT) {
    shot = spawnSword(world, p.pos.x, p.pos.y, dirX, dirY, targetId, weapons.sword.pierce);
  } else if (p.classId === CLASS_DWARF) {
    shot = spawnAxe(world, p.pos.x, p.pos.y, dirX, dirY);
  } else {
    shot = spawnMissile(world, p.pos.x, p.pos.y, dirX, dirY, targetId);
  }
  if (shot !== null) shot.damage *= effectiveDamageMult(p);
}

function fireOneShot(world: World): void {
  const p = world.player;
  const targetIdx = findNearestEnemy(world, p.pos.x, p.pos.y, weapons.acquireRange);
  if (targetIdx < 0) return;
  const target = world.enemies.items[targetIdx];
  fireVolleyShot(world, target.pos.x - p.pos.x, target.pos.y - p.pos.y);
}

function updatePlayerTimers(world: World, dt: number): void {
  const p = world.player;
  p.walking = p.moveInput.x !== 0 || p.moveInput.y !== 0;
  if (p.walking) {
    p.moveTicks++;
    p.stillTicks = 0;
  } else {
    p.stillTicks++;
    p.moveTicks = 0;
  }
  const bobHz = p.walking ? tuning.heroRig.walkBobHz : tuning.heroRig.idleBobHz;
  p.bobPhase = (p.bobPhase + TWO_PI * bobHz * dt) % TWO_PI;
  if (p.attackAnimT < 1000) p.attackAnimT += dt;
  if (p.iFrameTicks > 0) p.iFrameTicks--;
  if (p.invulnTicks > 0) p.invulnTicks--;
  if (p.invulnPulseTicks > 0) {
    p.invulnPulseTimer++;
    if (p.invulnPulseTimer >= p.invulnPulseTicks) {
      p.invulnPulseTimer = 0;
      p.invulnTicks = INVULN_PULSE_DURATION;
    }
  }
  if (p.shieldMax > 0) {
    if (p.shieldTimerTicks > 0) p.shieldTimerTicks--;
    else if (p.shield < p.shieldMax) p.shield = p.shieldMax;
  }
}

export function updatePlayerAttack(world: World, dt: number): void {
  const p = world.player;
  updatePlayerTimers(world, dt);

  if (p.volleyShotsLeft > 0 && world.tick >= p.nextVolleyShotTick) {
    fireOneShot(world);
    p.volleyShotsLeft--;
    p.nextVolleyShotTick = world.tick + STAGGER_TICKS;
  }

  const hasteTicks = p.walking && p.moveHaste > 0 ? 1 + Math.floor(p.moveHaste * 10) : 0;
  if (p.attackTimerTicks > 0) p.attackTimerTicks -= 1 + hasteTicks;
  if (p.attackTimerTicks < 0) p.attackTimerTicks = 0;
  if (p.attackTimerTicks === 0 && p.volleyShotsLeft === 0) {
    const targetIdx = findNearestEnemy(world, p.pos.x, p.pos.y, weapons.acquireRange);
    if (targetIdx >= 0) {
      p.attackAnimT = 0;
      p.attackTimerTicks = p.attackCooldownTicks;
      p.volleyShotsLeft = p.volleyCount;
      p.nextVolleyShotTick = world.tick;
    }
  }

  const cls = classes[p.classId];
  if (!cls.hidesWeaponOnThrow) {
    p.weaponVisible = true;
  } else if (p.classId === CLASS_DWARF) {
    p.weaponVisible = p.volleyShotsLeft === 0 && world.liveAxes === 0;
  } else {
    p.weaponVisible = p.volleyShotsLeft === 0 && p.attackTimerTicks === 0;
  }
}
