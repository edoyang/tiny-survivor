import classes from '../data/classes.json' with { type: 'json' };
import tuning from '../data/tuning.json' with { type: 'json' };
import weapons from '../data/weapons.json' with { type: 'json' };
import {
  spawnAxe,
  spawnFireball,
  spawnMissile,
  spawnSword,
} from '../entities/projectiles.ts';
import {
  CLASS_DWARF,
  CLASS_KNIGHT,
  CLASS_WIZARD,
  FIXED_DT,
  type World,
} from '../state.ts';
import { findNearestEnemy } from './targeting.ts';

const TWO_PI = Math.PI * 2;
const STAGGER_TICKS = Math.max(1, Math.round(weapons.volley.staggerSeconds / FIXED_DT));

function fireOneShot(world: World): void {
  const p = world.player;
  const targetIdx = findNearestEnemy(world, p.pos.x, p.pos.y, weapons.acquireRange);
  if (targetIdx < 0) return;
  const target = world.enemies.items[targetIdx];
  const dirX = target.pos.x - p.pos.x;
  const dirY = target.pos.y - p.pos.y;
  if (p.classId === CLASS_WIZARD) {
    spawnFireball(world, p.pos.x, p.pos.y, dirX, dirY);
  } else if (p.classId === CLASS_KNIGHT) {
    spawnSword(world, p.pos.x, p.pos.y, dirX, dirY, target.id, weapons.sword.pierce);
  } else if (p.classId === CLASS_DWARF) {
    spawnAxe(world, p.pos.x, p.pos.y, dirX, dirY);
  } else {
    spawnMissile(world, p.pos.x, p.pos.y, dirX, dirY, target.id);
  }
}

export function updatePlayerAttack(world: World, dt: number): void {
  const p = world.player;
  p.walking = p.moveInput.x !== 0 || p.moveInput.y !== 0;
  const bobHz = p.walking ? tuning.heroRig.walkBobHz : tuning.heroRig.idleBobHz;
  p.bobPhase = (p.bobPhase + TWO_PI * bobHz * dt) % TWO_PI;
  if (p.attackAnimT < 1000) p.attackAnimT += dt;

  if (p.volleyShotsLeft > 0 && world.tick >= p.nextVolleyShotTick) {
    fireOneShot(world);
    p.volleyShotsLeft--;
    p.nextVolleyShotTick = world.tick + STAGGER_TICKS;
  }

  if (p.attackTimerTicks > 0) p.attackTimerTicks--;
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
