import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, CLASS_KNIGHT } from '../state.ts';
import { advance, FIXED_DT } from '../step.ts';

test('attack fires once per cooldown, on its own clock', () => {
  const world = createWorld(1, CLASS_KNIGHT);
  const cooldown = world.player.attackCooldown;
  const fireTicks: number[] = [];
  for (let i = 0; i < 600; i++) {
    advance(world);
    if (world.player.attackAnimT === 0) fireTicks.push(world.tick);
  }
  assert.ok(fireTicks.length >= 2);
  const expectedGap = Math.round(cooldown / FIXED_DT);
  for (let i = 1; i < fireTicks.length; i++) {
    const gap = fireTicks[i] - fireTicks[i - 1];
    assert.ok(Math.abs(gap - expectedGap) <= 1, `gap ${gap} vs expected ${expectedGap}`);
  }
});

test('attack anim clock advances after firing', () => {
  const world = createWorld(1, CLASS_KNIGHT);
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
