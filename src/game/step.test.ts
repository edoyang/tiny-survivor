import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accumulate, advance, FIXED_DT, interpolationAlpha, MAX_FRAME_SECONDS } from './step.ts';
import { createWorld, resetWorld, type World } from './state.ts';
import { spawnEnemy, type EnemyStats } from './entities/enemies.ts';
import { nextRange } from './rng.ts';

const TEST_STATS: EnemyStats = {
  type: 0,
  hp: 10,
  speed: 22,
  damage: 4,
  attackInterval: 1,
  xp: 1,
  radius: 8,
};

test('a frame shorter than the fixed step runs zero steps and accumulates', () => {
  const world = createWorld(1);
  const steps = accumulate(world, FIXED_DT * 0.4);
  assert.equal(steps, 0);
  assert.equal(world.tick, 0);
  assert.ok(Math.abs(world.accumulator - FIXED_DT * 0.4) < 1e-9);
});

test('a frame of 3.5 fixed steps runs 3 steps and keeps the remainder', () => {
  const world = createWorld(1);
  const steps = accumulate(world, FIXED_DT * 3.5);
  assert.equal(steps, 3);
  assert.equal(world.tick, 3);
  assert.ok(Math.abs(world.accumulator - FIXED_DT * 0.5) < 1e-9);
  assert.ok(Math.abs(interpolationAlpha(world) - 0.5) < 1e-6);
});

test('leftover accumulator carries into the next frame', () => {
  const world = createWorld(1);
  accumulate(world, FIXED_DT * 0.6);
  const steps = accumulate(world, FIXED_DT * 0.6);
  assert.equal(steps, 1);
  assert.ok(Math.abs(world.accumulator - FIXED_DT * 0.2) < 1e-9);
});

test('a huge frame is clamped so the sim cannot spiral', () => {
  const world = createWorld(1);
  const steps = accumulate(world, 10);
  assert.equal(steps, Math.floor(MAX_FRAME_SECONDS / FIXED_DT));
});

test('simulated time advances by exactly FIXED_DT per step', () => {
  const world = createWorld(1);
  for (let i = 0; i < 120; i++) advance(world);
  assert.ok(Math.abs(world.time - 2) < 1e-9);
});

test('player movement normalizes diagonal input to the same speed', () => {
  const world = createWorld(1);
  world.player.moveInput.x = 1;
  world.player.moveInput.y = 1;
  for (let i = 0; i < 60; i++) advance(world);
  const dist = Math.hypot(world.player.pos.x, world.player.pos.y);
  assert.ok(Math.abs(dist - world.player.moveSpeed) < 0.01);
});

function scriptedInput(world: World, step: number): void {
  world.player.moveInput.x = Math.sin(step * 0.05);
  world.player.moveInput.y = Math.cos(step * 0.03);
}

function runScripted(seed: number, steps: number): World {
  const world = createWorld(seed);
  for (let i = 0; i < steps; i++) {
    scriptedInput(world, i);
    if (i % 7 === 0 && world.enemies.count < world.enemies.capacity) {
      const x = nextRange(world.rng, -300, 300);
      const y = nextRange(world.rng, -300, 300);
      spawnEnemy(world, TEST_STATS, x, y, nextRange(world.rng, 0, 1));
    }
    advance(world);
  }
  return world;
}

function worldDigest(world: World): string {
  const parts: number[] = [
    world.tick,
    world.time,
    world.rng.state,
    world.nextEntityId,
    world.player.pos.x,
    world.player.pos.y,
    world.player.facing,
    world.enemies.count,
  ];
  for (let i = 0; i < world.enemies.count; i++) {
    const e = world.enemies.items[i];
    parts.push(e.id, e.pos.x, e.pos.y, e.hp, e.attackTimerTicks, e.animPhase);
  }
  return parts.join(',');
}

test('same seed and inputs produce an identical world after 1000 steps', () => {
  const a = runScripted(42, 1000);
  const b = runScripted(42, 1000);
  assert.equal(worldDigest(a), worldDigest(b));
});

test('different seeds produce different worlds', () => {
  const a = runScripted(42, 1000);
  const b = runScripted(43, 1000);
  assert.notEqual(worldDigest(a), worldDigest(b));
});

test('resetWorld restores a used world to the same state as a fresh one', () => {
  const used = runScripted(42, 500);
  resetWorld(used, 42);
  const fresh = createWorld(42);
  assert.equal(worldDigest(used), worldDigest(fresh));
});
