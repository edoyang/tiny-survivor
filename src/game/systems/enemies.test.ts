import { test } from 'node:test';
import assert from 'node:assert/strict';
import tuning from '../data/tuning.json' with { type: 'json' };
import { spawnEnemy, type EnemyStats } from '../entities/enemies.ts';
import { createWorld, type World } from '../state.ts';
import { advance, FIXED_DT } from '../step.ts';
import { damageEnemy } from './damage.ts';

const STATS: EnemyStats = {
  type: 0,
  hp: 10,
  speed: 0,
  damage: 4,
  attackInterval: 1,
  xp: 2,
  radius: 8,
};

const CHASER: EnemyStats = { ...STATS, speed: 30 };

function hitsOverTime(world: World, ticks: number): number[] {
  const hitTicks: number[] = [];
  let lastHp = world.player.hp;
  for (let t = 0; t < ticks; t++) {
    advance(world);
    if (world.player.hp < lastHp) {
      hitTicks.push(world.tick);
      lastHp = world.player.hp;
    }
  }
  return hitTicks;
}

test('an enemy standing on the player hits once per its interval, never more', () => {
  const world = createWorld(1);
  spawnEnemy(world, STATS, 0, 0, 0);
  const hits = hitsOverTime(world, 600);
  assert.ok(hits.length >= 9 && hits.length <= 11, `got ${hits.length} hits`);
  const interval = Math.round(STATS.attackInterval / FIXED_DT);
  for (let i = 1; i < hits.length; i++) {
    assert.ok(hits[i] - hits[i - 1] >= interval, `gap ${hits[i] - hits[i - 1]}`);
  }
});

test('two enemies arriving staggered keep independent timers forever', () => {
  const world = createWorld(1);
  const staggerTicks = 36;
  spawnEnemy(world, STATS, 0, 0, 0);
  const firstHits: number[] = [];
  const secondHits: number[] = [];
  let lastHp = world.player.hp;
  const a = world.enemies.items[0];
  for (let t = 0; t < 600; t++) {
    if (t === staggerTicks) spawnEnemy(world, STATS, 0, 0, 0);
    const hpBefore = world.player.hp;
    const aTimerBefore = a.attackTimerTicks;
    advance(world);
    if (world.player.hp < hpBefore) {
      if (a.attackTimerTicks > aTimerBefore) firstHits.push(world.tick);
      else secondHits.push(world.tick);
      lastHp = world.player.hp;
    }
  }
  assert.ok(firstHits.length >= 8);
  assert.ok(secondHits.length >= 8);
  const interval = Math.round(STATS.attackInterval / FIXED_DT);
  for (let i = 1; i < firstHits.length; i++) {
    assert.equal(firstHits[i] - firstHits[i - 1], interval);
  }
  for (let i = 1; i < secondHits.length; i++) {
    assert.equal(secondHits[i] - secondHits[i - 1], interval);
  }
  const pairs = Math.min(firstHits.length, secondHits.length);
  for (let i = 0; i < pairs; i++) {
    assert.equal(secondHits[i] - firstHits[i], staggerTicks, `stagger drifted at hit ${i}`);
  }
});

test('i-frames block a pile-up from deleting the player in one frame', () => {
  const world = createWorld(1);
  for (let n = 0; n < 10; n++) spawnEnemy(world, STATS, 0, 0, 0);
  advance(world);
  const afterOneTick = world.player.hp;
  assert.equal(world.player.maxHp - afterOneTick, STATS.damage);
  const iFrameTicks = Math.ceil(tuning.player.iFrameSeconds / FIXED_DT);
  for (let t = 0; t < iFrameTicks - 1; t++) advance(world);
  assert.equal(world.player.hp, afterOneTick);
});

test('enemies chase the player and face the direction they walk', () => {
  const world = createWorld(1);
  world.player.pos.x = 100;
  world.player.pos.y = 0;
  spawnEnemy(world, CHASER, -50, 0, 0);
  const e = world.enemies.items[0];
  const startX = e.pos.x;
  for (let t = 0; t < 60; t++) advance(world);
  assert.ok(e.pos.x > startX + 20);
  assert.equal(e.facing, 1);
  world.player.pos.x = -300;
  for (let t = 0; t < 10; t++) advance(world);
  assert.equal(e.facing, -1);
});

test('stacked enemies separate into a spread mob', () => {
  const world = createWorld(1);
  world.player.pos.x = 1000;
  world.player.pos.y = 1000;
  spawnEnemy(world, STATS, 0, 0, 0);
  spawnEnemy(world, STATS, 0.5, 0, 0);
  const a = world.enemies.items[0];
  const b = world.enemies.items[1];
  for (let t = 0; t < 120; t++) advance(world);
  const dx = a.pos.x - b.pos.x;
  const dy = a.pos.y - b.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  assert.ok(dist > 4, `only separated to ${dist}`);
});

test('killing an enemy drops a gem worth its xp and counts the kill', () => {
  const world = createWorld(1);
  world.player.pos.x = 500;
  spawnEnemy(world, STATS, 0, 0, 0);
  const died = damageEnemy(world, 0, 999);
  assert.ok(died);
  assert.equal(world.enemies.count, 0);
  assert.equal(world.kills, 1);
  assert.equal(world.gems.count, 1);
  assert.equal(world.gems.items[0].value, STATS.xp);
});

test('damage below lethal leaves the enemy alive with reduced hp', () => {
  const world = createWorld(1);
  spawnEnemy(world, STATS, 0, 0, 0);
  const died = damageEnemy(world, 0, 4);
  assert.ok(!died);
  assert.equal(world.enemies.count, 1);
  assert.equal(world.enemies.items[0].hp, STATS.hp - 4);
});

test('gems magnetize to a nearby player and collect into xp', () => {
  const world = createWorld(1);
  spawnEnemy(world, STATS, 20, 0, 0);
  damageEnemy(world, 0, 999);
  assert.equal(world.gems.count, 1);
  for (let t = 0; t < 60; t++) advance(world);
  assert.equal(world.gems.count, 0);
  assert.equal(world.xp, STATS.xp);
});

test('gems outside the pickup radius stay put', () => {
  const world = createWorld(1);
  spawnEnemy(world, STATS, 200, 0, 0);
  damageEnemy(world, 0, 999);
  for (let t = 0; t < 60; t++) advance(world);
  assert.equal(world.gems.count, 1);
  assert.ok(world.gems.items[0].pos.x > 150);
});
