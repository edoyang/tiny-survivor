import { test } from 'node:test';
import assert from 'node:assert/strict';
import tuning from '../data/tuning.json' with { type: 'json' };
import upgrades from '../data/upgrades.json' with { type: 'json' };
import { spawnEnemy, type EnemyStats } from '../entities/enemies.ts';
import {
  CLASS_KNIGHT,
  createWorld,
  resetWorld,
  STATUS_DEAD,
  STATUS_LEVELUP,
  STATUS_RUNNING,
  type World,
} from '../state.ts';
import { advance } from '../step.ts';
import { applyUpgrade } from './leveling.ts';

const BITER: EnemyStats = {
  type: 0,
  hp: 1000000,
  speed: 0,
  damage: 40,
  attackInterval: 0.1,
  xp: 1,
  radius: 8,
};

function quietWorld(seed: number): World {
  const world = createWorld(seed, CLASS_KNIGHT);
  world.spawn.nextBurstTick = Number.MAX_SAFE_INTEGER;
  world.spawn.nextEliteTick = Number.MAX_SAFE_INTEGER;
  world.spawn.nextBossTick = Number.MAX_SAFE_INTEGER;
  world.spawn.accumulator = -1e9;
  return world;
}

test('reaching the xp threshold pauses the sim with three distinct upgrade choices', () => {
  const world = quietWorld(9);
  world.xp = tuning.leveling.baseXpToLevel;
  advance(world);
  assert.equal(world.status, STATUS_LEVELUP);
  assert.equal(world.level, 2);
  const offered = [...world.upgradeOffer];
  assert.equal(offered.length, 3);
  assert.ok(offered.every((i) => i >= 0 && i < upgrades.length));
  assert.equal(new Set(offered).size, 3);
  const tickAtPause = world.tick;
  for (let t = 0; t < 30; t++) advance(world);
  assert.equal(world.tick, tickAtPause);
});

test('applying an upgrade resumes the sim and applies its effect', () => {
  const world = quietWorld(9);
  world.xp = tuning.leveling.baseXpToLevel;
  advance(world);
  assert.equal(world.status, STATUS_LEVELUP);
  const volleySlot = [...world.upgradeOffer].findIndex(
    (i) => i >= 0 && upgrades[i].id === 'volley',
  );
  const slot = volleySlot >= 0 ? volleySlot : 0;
  const upgradeIndex = world.upgradeOffer[slot];
  const def = upgrades[upgradeIndex];
  const before = {
    volley: world.player.volleyCount,
    damage: world.player.damageMult,
    cooldown: world.player.attackCooldownTicks,
    speed: world.player.moveSpeed,
    maxHp: world.player.maxHp,
    pickup: world.player.pickupMult,
    pierce: world.player.bonusPierce,
    aoe: world.player.aoeMult,
  };
  applyUpgrade(world, slot);
  assert.equal(world.status, STATUS_RUNNING);
  assert.equal(world.upgradeStacks[upgradeIndex], 1);
  if (def.id === 'volley') assert.equal(world.player.volleyCount, before.volley + 1);
  else if (def.id === 'damage') assert.ok(world.player.damageMult > before.damage);
  else if (def.id === 'cooldown') assert.ok(world.player.attackCooldownTicks < before.cooldown);
  else if (def.id === 'speed') assert.ok(world.player.moveSpeed > before.speed);
  else if (def.id === 'maxhp') assert.ok(world.player.maxHp > before.maxHp);
  else if (def.id === 'magnet') assert.ok(world.player.pickupMult > before.pickup);
  else if (def.id === 'pierce') assert.ok(world.player.bonusPierce > before.pierce);
  else if (def.id === 'aoe') assert.ok(world.player.aoeMult > before.aoe);
  const tickBefore = world.tick;
  advance(world);
  assert.equal(world.tick, tickBefore + 1);
});

test('damage upgrades scale spawned projectile damage', () => {
  const world = quietWorld(9);
  spawnEnemy(world, { ...BITER, damage: 0, attackInterval: 1000 }, 100, 0, 0);
  world.player.damageMult = 2;
  let sword = null;
  for (let t = 0; t < 200 && sword === null; t++) {
    advance(world);
    if (world.projectiles.count > 0) sword = world.projectiles.items[0];
  }
  assert.ok(sword);
  assert.equal(sword.damage, 16);
});

test('banked xp chains a second level-up right after the first resumes', () => {
  const world = quietWorld(9);
  world.xp = tuning.leveling.baseXpToLevel * 2 + tuning.leveling.xpGrowthPerLevel;
  advance(world);
  assert.equal(world.status, STATUS_LEVELUP);
  applyUpgrade(world, 0);
  advance(world);
  assert.equal(world.status, STATUS_LEVELUP);
  assert.equal(world.level, 3);
});

test('running out of hp ends the run and freezes the world', () => {
  const world = quietWorld(9);
  world.player.attackTimerTicks = Number.MAX_SAFE_INTEGER;
  for (let n = 0; n < 5; n++) spawnEnemy(world, BITER, 0, 0, 0);
  for (let t = 0; t < 2000 && world.status !== STATUS_DEAD; t++) advance(world);
  assert.equal(world.status, STATUS_DEAD);
  assert.equal(world.player.hp, 0);
  const tickAtDeath = world.tick;
  for (let t = 0; t < 30; t++) advance(world);
  assert.equal(world.tick, tickAtDeath);
});

test('resetWorld starts a fresh run after death', () => {
  const world = quietWorld(9);
  for (let n = 0; n < 5; n++) spawnEnemy(world, BITER, 0, 0, 0);
  for (let t = 0; t < 2000 && world.status !== STATUS_DEAD; t++) advance(world);
  assert.equal(world.status, STATUS_DEAD);
  resetWorld(world, 123, CLASS_KNIGHT);
  assert.equal(world.status, STATUS_RUNNING);
  assert.equal(world.player.hp, world.player.maxHp);
  assert.equal(world.level, 1);
  assert.equal(world.kills, 0);
  advance(world);
  assert.equal(world.tick, 1);
});
