import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnEnemy, type EnemyStats } from '../entities/enemies.ts';
import { CLASS_KNIGHT, CLASS_WIZARD } from '../kinds.ts';
import { createWorld } from '../state.ts';
import { advance, FIXED_DT } from '../step.ts';

const TARGET_DUMMY: EnemyStats = {
  type: 0,
  hp: 1000000,
  speed: 0,
  damage: 0,
  attackInterval: 1000,
  xp: 1,
  radius: 8,
};

test('attack triggers once per cooldown while a target is in range', () => {
  const world = createWorld(1, CLASS_KNIGHT);
  spawnEnemy(world, TARGET_DUMMY, 100, 0, 0);
  const fireTicks: number[] = [];
  for (let i = 0; i < 600; i++) {
    advance(world);
    if (world.player.attackAnimT === 0) fireTicks.push(world.tick);
  }
  assert.ok(fireTicks.length >= 2);
  for (let i = 1; i < fireTicks.length; i++) {
    assert.equal(fireTicks[i] - fireTicks[i - 1], world.player.attackCooldownTicks);
  }
});

test('with no enemies in range the hero holds fire and keeps the weapon', () => {
  const world = createWorld(1, CLASS_KNIGHT);
  for (let i = 0; i < 300; i++) advance(world);
  assert.equal(world.projectiles.count, 0);
  assert.ok(world.player.weaponVisible);
});

test('wizard weapon stays visible through an attack', () => {
  const world = createWorld(1, CLASS_WIZARD);
  spawnEnemy(world, TARGET_DUMMY, 100, 0, 0);
  for (let i = 0; i < 300; i++) {
    advance(world);
    assert.ok(world.player.weaponVisible);
  }
});

test('attack anim clock advances after firing', () => {
  const world = createWorld(1, CLASS_KNIGHT);
  spawnEnemy(world, TARGET_DUMMY, 100, 0, 0);
  while (world.player.attackAnimT !== 0) advance(world);
  advance(world);
  assert.ok(Math.abs(world.player.attackAnimT - FIXED_DT) < 1e-9);
});

test('bob phase advances faster when walking than when idle', () => {
  const idleWorld = createWorld(1);
  const walkWorld = createWorld(1);
  walkWorld.player.moveInput.x = 1;
  for (let i = 0; i < 10; i++) {
    advance(idleWorld);
    advance(walkWorld);
  }
  assert.ok(idleWorld.player.bobPhase > 0);
  assert.ok(walkWorld.player.bobPhase > idleWorld.player.bobPhase);
  assert.ok(walkWorld.player.walking);
  assert.ok(!idleWorld.player.walking);
});
