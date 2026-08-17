import assert from 'node:assert/strict';
import { test } from 'node:test';
import tuning from '../data/tuning.json' with { type: 'json' };
import { AWAKENED_STARS, MAX_ABILITIES, STATUS_LEVELUP, STATUS_RUNNING } from '../kinds.ts';
import { createWorld, type World } from '../state.ts';
import { advance } from '../step.ts';
import { grantItem, ITEMS, PRESETS } from './items.ts';
import { applyItemPick } from './leveling.ts';

function kitIndices(presetId: number): number[] {
  const preset = PRESETS[presetId];
  const own: number[] = [];
  const general: number[] = [];
  for (let i = 0; i < ITEMS.length; i++) {
    if (ITEMS[i].preset === preset.id) own.push(i);
    else if (ITEMS[i].preset === 'general') general.push(i);
  }
  const worstCase = own.concat(general);
  return worstCase.slice(0, tuning.items.totalSlots);
}

function awakenWholeBuild(world: World, presetId: number): void {
  for (const index of kitIndices(presetId)) {
    for (let star = 0; star < AWAKENED_STARS; star++) grantItem(world, index);
    assert.equal(world.itemStars[index], AWAKENED_STARS);
  }
}

function finite(value: number, label: string): void {
  assert.ok(Number.isFinite(value), `${label} is ${value}`);
}

test('no build can register more abilities than the sim has slots for', () => {
  for (let presetId = 0; presetId < PRESETS.length; presetId++) {
    const world = createWorld(11, PRESETS[presetId].classId, presetId);
    awakenWholeBuild(world, presetId);
    assert.ok(
      world.abilityCount < MAX_ABILITIES,
      `${PRESETS[presetId].id} fills ${world.abilityCount} of ${MAX_ABILITIES} ability slots`,
    );
    for (let i = 0; i < world.abilityCount; i++) {
      const ability = world.abilities[i];
      assert.ok(ability.kind > 0, `${PRESETS[presetId].id} registered ability kind 0`);
      assert.ok(ability.intervalTicks > 0);
      finite(ability.damage, `${PRESETS[presetId].id} ability damage`);
      finite(ability.radius, `${PRESETS[presetId].id} ability radius`);
    }
  }
});

test('every fully awakened build runs a minute of pressure without breaking', () => {
  for (let presetId = 0; presetId < PRESETS.length; presetId++) {
    const preset = PRESETS[presetId];
    const world = createWorld(11 + presetId, preset.classId, presetId);
    awakenWholeBuild(world, presetId);
    world.player.maxHp = 1e6;
    world.player.hp = 1e6;
    for (let t = 0; t < 3600; t++) {
      world.player.moveInput.x = Math.sin(t * 0.02);
      world.player.moveInput.y = Math.cos(t * 0.017);
      advance(world);
      if (world.status === STATUS_LEVELUP) applyItemPick(world, 0);
      assert.equal(world.status, STATUS_RUNNING, `${preset.id} ended early at tick ${t}`);
    }
    finite(world.player.pos.x, `${preset.id} player x`);
    finite(world.player.pos.y, `${preset.id} player y`);
    finite(world.player.hp, `${preset.id} player hp`);
    assert.ok(world.kills > 0, `${preset.id} killed nothing in a minute`);
    for (let i = 0; i < world.enemies.count; i++) {
      finite(world.enemies.items[i].pos.x, `${preset.id} enemy x`);
      finite(world.enemies.items[i].hp, `${preset.id} enemy hp`);
    }
    for (let i = 0; i < world.projectiles.count; i++) {
      finite(world.projectiles.items[i].pos.x, `${preset.id} projectile x`);
      finite(world.projectiles.items[i].damage, `${preset.id} projectile damage`);
    }
    for (let i = 0; i < world.fields.count; i++) {
      finite(world.fields.items[i].radius, `${preset.id} field radius`);
      assert.ok(world.fields.items[i].ttlTicks > 0, `${preset.id} kept a dead field`);
    }
    assert.ok(world.minions.count <= world.player.minionCount);
    assert.ok(world.orbiterCount <= world.orbiters.length);
  }
});

test('a build that stacks damage reduction never becomes untouchable', () => {
  for (let presetId = 0; presetId < PRESETS.length; presetId++) {
    const world = createWorld(5, PRESETS[presetId].classId, presetId);
    awakenWholeBuild(world, presetId);
    assert.ok(
      world.player.damageReduction <= tuning.items.damageReductionCap,
      `${PRESETS[presetId].id} reaches ${world.player.damageReduction} damage reduction`,
    );
  }
});
