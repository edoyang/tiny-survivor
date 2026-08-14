import { test } from 'node:test';
import assert from 'node:assert/strict';
import waves from '../data/waves.json' with { type: 'json' };
import { spawnEnemy } from '../entities/enemies.ts';
import { MONSTER_STATS } from '../entities/monsterTypes.ts';
import { createWorld, FIXED_DT } from '../state.ts';
import { advance } from '../step.ts';
import { CONCURRENT_CAP, spawnRingRadius } from './spawning.ts';

test('regular spawns land on the ring just outside the view', () => {
  const world = createWorld(7);
  const ring = spawnRingRadius(world);
  const halfDiagonal = Math.sqrt((world.viewWidth / 2) ** 2 + (world.viewHeight / 2) ** 2);
  let seenSpawns = 0;
  let lastCount = 0;
  for (let t = 0; t < 300; t++) {
    advance(world);
    for (let i = lastCount; i < world.enemies.count; i++) {
      const e = world.enemies.items[i];
      const dx = e.pos.x - world.camera.pos.x;
      const dy = e.pos.y - world.camera.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      assert.ok(dist > halfDiagonal, `spawned inside the view at ${dist}`);
      assert.ok(dist < ring + 40, `spawned far beyond the ring at ${dist}`);
      seenSpawns++;
    }
    lastCount = world.enemies.count;
  }
  assert.ok(seenSpawns >= 4);
});

test('spawn count tracks the bracket rate exactly', () => {
  const world = createWorld(7);
  const seconds = 10;
  for (let t = 0; t < seconds * 60; t++) advance(world);
  const expected = Math.floor(waves.brackets[0].spawnsPerSecond * seconds);
  assert.equal(world.enemies.count, expected);
});

test('spawned types come only from the active bracket', () => {
  const world = createWorld(7);
  for (let t = 0; t < 600; t++) advance(world);
  const allowed = new Set([0, 1]);
  for (let i = 0; i < world.enemies.count; i++) {
    assert.ok(allowed.has(world.enemies.items[i].type));
  }
});

test('later brackets unlock later types', () => {
  const world = createWorld(7);
  world.tick = Math.round(120 / FIXED_DT);
  world.spawn.nextBurstTick = Number.MAX_SAFE_INTEGER;
  world.spawn.nextEliteTick = Number.MAX_SAFE_INTEGER;
  world.spawn.nextBossTick = Number.MAX_SAFE_INTEGER;
  for (let t = 0; t < 1200; t++) advance(world);
  const seen = new Set<number>();
  for (let i = 0; i < world.enemies.count; i++) {
    seen.add(world.enemies.items[i].type);
  }
  assert.ok(seen.has(3), 'bracket at 120s should include the monster type');
});

test('a burst spawns a group of one type from one direction', () => {
  const world = createWorld(7);
  world.spawn.nextBurstTick = 5;
  world.spawn.nextEliteTick = Number.MAX_SAFE_INTEGER;
  world.spawn.nextBossTick = Number.MAX_SAFE_INTEGER;
  for (let t = 0; t < 5; t++) advance(world);
  assert.ok(world.enemies.count >= waves.burst.count);
  const types = new Set<number>();
  const angles: number[] = [];
  for (let i = 0; i < world.enemies.count; i++) {
    const e = world.enemies.items[i];
    types.add(e.type);
    angles.push(Math.atan2(e.prevY - world.camera.pos.y, e.prevX - world.camera.pos.x));
  }
  assert.equal(types.size, 1);
  const arcRad = (waves.burst.arcDegrees * Math.PI) / 180;
  for (const angle of angles) {
    let delta = angle - angles[0];
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    assert.ok(Math.abs(delta) <= arcRad + 0.05, `angle spread ${delta}`);
  }
});

test('an elite spawns bigger, tougher, and worth more xp', () => {
  const world = createWorld(7);
  world.spawn.nextEliteTick = 5;
  world.spawn.nextBurstTick = Number.MAX_SAFE_INTEGER;
  world.spawn.nextBossTick = Number.MAX_SAFE_INTEGER;
  for (let t = 0; t < 5; t++) advance(world);
  let elite = null;
  for (let i = 0; i < world.enemies.count; i++) {
    if (world.enemies.items[i].scale === waves.elite.scale) elite = world.enemies.items[i];
  }
  assert.ok(elite, 'no elite found');
  const base = MONSTER_STATS[elite.type];
  assert.equal(elite.maxHp, Math.round(base.hp * waves.elite.hpMult));
  assert.equal(elite.contactDamage, base.damage * waves.elite.damageMult);
  assert.equal(elite.xp, base.xp * waves.elite.xpMult);
  assert.equal(elite.radius, base.radius * waves.elite.scale);
});

test('the boss spawns as a scaled-up monster with a huge pool', () => {
  const world = createWorld(7);
  world.spawn.nextBossTick = 5;
  world.spawn.nextBurstTick = Number.MAX_SAFE_INTEGER;
  world.spawn.nextEliteTick = Number.MAX_SAFE_INTEGER;
  for (let t = 0; t < 5; t++) advance(world);
  let boss = null;
  for (let i = 0; i < world.enemies.count; i++) {
    if (world.enemies.items[i].scale === waves.boss.scale) boss = world.enemies.items[i];
  }
  assert.ok(boss, 'no boss found');
  assert.equal(boss.type, 3);
  assert.equal(boss.maxHp, Math.round(MONSTER_STATS[3].hp * waves.boss.hpMult));
});

test('at the concurrent cap the farthest enemy is recycled to the ring', () => {
  const world = createWorld(7);
  for (let i = 0; i < CONCURRENT_CAP - 1; i++) {
    spawnEnemy(world, MONSTER_STATS[0], 50 + (i % 10), 50, 0);
  }
  const far = spawnEnemy(world, MONSTER_STATS[0], 5000, 5000, 0);
  assert.ok(far);
  const farId = far.id;
  assert.equal(world.enemies.count, CONCURRENT_CAP);
  world.spawn.accumulator = 0.999;
  world.spawn.nextBurstTick = Number.MAX_SAFE_INTEGER;
  world.spawn.nextEliteTick = Number.MAX_SAFE_INTEGER;
  world.spawn.nextBossTick = Number.MAX_SAFE_INTEGER;
  advance(world);
  assert.equal(world.enemies.count, CONCURRENT_CAP);
  const ring = spawnRingRadius(world);
  let recycledStillFar = false;
  let sawNewId = false;
  for (let i = 0; i < world.enemies.count; i++) {
    const e = world.enemies.items[i];
    if (e.id === farId) recycledStillFar = true;
    if (e.id > farId) {
      sawNewId = true;
      const dx = e.prevX - world.camera.prevX;
      const dy = e.prevY - world.camera.prevY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      assert.ok(Math.abs(dist - ring) < ring * 0.2, `recycled at ${dist} vs ring ${ring}`);
    }
  }
  assert.ok(!recycledStillFar, 'farthest enemy should have been recycled');
  assert.ok(sawNewId, 'a re-initialized enemy should exist');
});
