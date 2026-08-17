import assert from 'node:assert/strict';
import { test } from 'node:test';
import waves from '../data/waves.json' with { type: 'json' };
import { spawnEnemy } from '../entities/enemies.ts';
import { MONSTER_STATS } from '../entities/monsterTypes.ts';
import { BOSS_FINAL, BOSS_MINI, STATUS_WON } from '../kinds.ts';
import { createWorld, FIXED_DT, type World } from '../state.ts';
import { advance } from '../step.ts';
import { damageEnemy } from './damage.ts';
import { CONCURRENT_CAP, spawnRingRadius } from './spawning.ts';

function silentPlayer(world: World): void {
  world.player.attackTimerTicks = Number.MAX_SAFE_INTEGER;
  world.player.attackCooldownTicks = Number.MAX_SAFE_INTEGER;
}

function jumpTo(world: World, seconds: number): void {
  world.tick = Math.round(seconds / FIXED_DT);
  world.time = world.tick * FIXED_DT;
}

function quietSpawner(world: World): void {
  world.spawn.nextPackTick = Number.MAX_SAFE_INTEGER;
  world.spawn.nextEliteTick = Number.MAX_SAFE_INTEGER;
  world.spawn.hordeIndex = waves.hordes.length;
}

function hpScaleAt(seconds: number): number {
  for (const pack of waves.packs) {
    if (seconds < pack.untilSeconds) return pack.hpScale;
  }
  return waves.packs[waves.packs.length - 1].hpScale;
}

function bossOnField(world: World, tag: number): number {
  for (let i = 0; i < world.enemies.count; i++) {
    if (world.enemies.items[i].boss === tag) return i;
  }
  return -1;
}

test('enemies arrive in packs, never one at a time', () => {
  const world = createWorld(7);
  silentPlayer(world);
  const firstPack = waves.packs[0];
  let previous = 0;
  const groupSizes: number[] = [];
  for (let t = 0; t < Math.round(20 / FIXED_DT); t++) {
    advance(world);
    if (world.enemies.count > previous) groupSizes.push(world.enemies.count - previous);
    previous = world.enemies.count;
  }
  assert.ok(groupSizes.length >= 2, `only ${groupSizes.length} spawn events in 20s`);
  for (const size of groupSizes) {
    assert.equal(size, firstPack.packSize, 'a spawn event should place a whole pack in one tick');
  }
});

test('a pack lands on one arc of the ring, just outside the view', () => {
  const world = createWorld(7);
  silentPlayer(world);
  const ring = spawnRingRadius(world);
  const halfDiagonal = Math.sqrt((world.viewWidth / 2) ** 2 + (world.viewHeight / 2) ** 2);
  const packTicks = Math.round(waves.packs[0].intervalSeconds / FIXED_DT);
  for (let t = 0; t <= packTicks; t++) advance(world);
  assert.equal(world.enemies.count, waves.packs[0].packSize);
  const angles: number[] = [];
  for (let i = 0; i < world.enemies.count; i++) {
    const e = world.enemies.items[i];
    const dx = e.prevX - world.camera.prevX;
    const dy = e.prevY - world.camera.prevY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    assert.ok(dist > halfDiagonal, `spawned inside the view at ${dist}`);
    assert.ok(dist < ring + 40, `spawned far beyond the ring at ${dist}`);
    angles.push(Math.atan2(dy, dx));
  }
  const arcRad = (waves.packs[0].arcDegrees * Math.PI) / 180;
  for (const angle of angles) {
    let delta = angle - angles[0];
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    assert.ok(Math.abs(delta) <= arcRad + 0.05, `pack spread ${delta}`);
  }
});

test('pack pressure rises as the run goes on', () => {
  for (let i = 1; i < waves.packs.length; i++) {
    const previous = waves.packs[i - 1];
    const current = waves.packs[i];
    assert.ok(current.untilSeconds > previous.untilSeconds, `bracket ${i} does not advance in time`);
    assert.ok(current.packSize >= previous.packSize, `bracket ${i} shrinks the pack`);
    assert.ok(
      current.intervalSeconds <= previous.intervalSeconds,
      `bracket ${i} slows the spawn rate`,
    );
  }
});

test('a horde encircles the player instead of arriving from one side', () => {
  const world = createWorld(7);
  silentPlayer(world);
  const horde = waves.hordes[0];
  world.spawn.nextPackTick = Number.MAX_SAFE_INTEGER;
  world.spawn.nextEliteTick = Number.MAX_SAFE_INTEGER;
  jumpTo(world, horde.atSeconds);
  advance(world);
  assert.equal(world.enemies.count, horde.count, 'the whole horde should land in one tick');
  const quadrants = new Set<number>();
  for (let i = 0; i < world.enemies.count; i++) {
    const e = world.enemies.items[i];
    const dx = e.prevX - world.camera.prevX;
    const dy = e.prevY - world.camera.prevY;
    quadrants.add((dx >= 0 ? 1 : 0) + (dy >= 0 ? 2 : 0));
  }
  assert.equal(quadrants.size, 4, 'a horde must come from every direction');
  assert.equal(world.spawn.hordeIndex, 1);
});

test('the mini boss arrives at ten minutes and the boss at fifteen', () => {
  const world = createWorld(7);
  silentPlayer(world);
  quietSpawner(world);
  jumpTo(world, waves.miniBoss.atSeconds);
  advance(world);
  const miniIndex = bossOnField(world, BOSS_MINI);
  assert.ok(miniIndex >= 0, 'no mini boss at ten minutes');
  const mini = world.enemies.items[miniIndex];
  assert.equal(
    mini.maxHp,
    Math.round(MONSTER_STATS[3].hp * hpScaleAt(waves.miniBoss.atSeconds) * waves.miniBoss.hpMult),
  );
  assert.equal(world.spawn.bossDone, false, 'the final boss must not be out yet');

  jumpTo(world, waves.boss.atSeconds);
  advance(world);
  const bossIndex = bossOnField(world, BOSS_FINAL);
  assert.ok(bossIndex >= 0, 'no boss at fifteen minutes');
  assert.ok(world.enemies.items[bossIndex].maxHp > mini.maxHp, 'the boss should outclass the mini');
});

test('regular spawning stops once the boss is out', () => {
  const world = createWorld(7);
  silentPlayer(world);
  world.spawn.hordeIndex = waves.hordes.length;
  jumpTo(world, waves.boss.atSeconds);
  advance(world);
  assert.ok(bossOnField(world, BOSS_FINAL) >= 0);
  const afterBoss = world.enemies.count;
  for (let t = 0; t < 1200; t++) advance(world);
  assert.ok(
    world.enemies.count <= afterBoss,
    `spawning continued during the boss fight (${afterBoss} -> ${world.enemies.count})`,
  );
});

test('killing the boss wins the run', () => {
  const world = createWorld(7);
  silentPlayer(world);
  quietSpawner(world);
  jumpTo(world, waves.boss.atSeconds);
  advance(world);
  const bossIndex = bossOnField(world, BOSS_FINAL);
  assert.ok(bossIndex >= 0);
  assert.equal(world.status, 0);
  damageEnemy(world, bossIndex, world.enemies.items[bossIndex].hp);
  assert.equal(world.spawn.bossKilled, true);
  advance(world);
  assert.equal(world.status, STATUS_WON);
});

test('the run does not end just because the boss has spawned', () => {
  const world = createWorld(7);
  silentPlayer(world);
  quietSpawner(world);
  jumpTo(world, waves.boss.atSeconds);
  for (let t = 0; t < 120; t++) advance(world);
  assert.notEqual(world.status, STATUS_WON);
});

test('at the concurrent cap the farthest enemy is recycled to the ring', () => {
  const world = createWorld(7);
  silentPlayer(world);
  quietSpawner(world);
  for (let i = 0; i < CONCURRENT_CAP - 1; i++) {
    spawnEnemy(world, MONSTER_STATS[0], 50 + (i % 10), 50, 0);
  }
  const far = spawnEnemy(world, MONSTER_STATS[0], 5000, 5000, 0);
  assert.ok(far);
  const farId = far.id;
  assert.equal(world.enemies.count, CONCURRENT_CAP);
  world.spawn.nextPackTick = world.tick + 1;
  advance(world);
  assert.equal(world.enemies.count, CONCURRENT_CAP);
  let recycledStillFar = false;
  for (let i = 0; i < world.enemies.count; i++) {
    if (world.enemies.items[i].id === farId) recycledStillFar = true;
  }
  assert.ok(!recycledStillFar, 'farthest enemy should have been recycled');
});

test('the cap never recycles a live boss out of the fight', () => {
  const world = createWorld(7);
  silentPlayer(world);
  quietSpawner(world);
  jumpTo(world, waves.boss.atSeconds);
  advance(world);
  const bossIndex = bossOnField(world, BOSS_FINAL);
  assert.ok(bossIndex >= 0);
  const bossId = world.enemies.items[bossIndex].id;
  while (world.enemies.count < CONCURRENT_CAP) {
    assert.ok(spawnEnemy(world, MONSTER_STATS[0], 5000, 5000, 0));
  }
  world.spawn.bossDone = false;
  world.spawn.nextPackTick = world.tick + 1;
  advance(world);
  let bossStillAlive = false;
  for (let i = 0; i < world.enemies.count; i++) {
    const e = world.enemies.items[i];
    if (e.id === bossId && e.boss === BOSS_FINAL) bossStillAlive = true;
  }
  assert.ok(bossStillAlive, 'the boss was recycled by the concurrent cap');
});
