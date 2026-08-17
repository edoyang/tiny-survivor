import assert from 'node:assert/strict';
import { test } from 'node:test';
import tuning from '../data/tuning.json' with { type: 'json' };
import { spawnEnemy, type EnemyStats } from '../entities/enemies.ts';
import {
  AWAKENED_STARS,
  CLASS_KNIGHT,
  CLASS_WIZARD,
  MAX_STARS,
  STATUS_DEAD,
  STATUS_LEVELUP,
  STATUS_RUNNING,
} from '../kinds.ts';
import { createWorld, resetWorld, type World } from '../state.ts';
import { advance } from '../step.ts';
import {
  canOffer,
  grantItem,
  ITEMS,
  itemIndexById,
  PRESETS,
  presetsForClass,
  slotsUsed,
} from './items.ts';
import { applyItemPick } from './leveling.ts';

const BITER: EnemyStats = {
  type: 0,
  hp: 1000000,
  speed: 0,
  damage: 40,
  attackInterval: 0.1,
  xp: 1,
  radius: 8,
};

const ELEMENTALIST = PRESETS.findIndex((p) => p.id === 'wizard_elementalist');
const BLADEGUARD = PRESETS.findIndex((p) => p.id === 'knight_bladeguard');

function quietWorld(seed: number, classId: number, presetId: number): World {
  const world = createWorld(seed, classId, presetId);
  world.spawn.nextPackTick = Number.MAX_SAFE_INTEGER;
  world.spawn.nextEliteTick = Number.MAX_SAFE_INTEGER;
  world.spawn.hordeIndex = Number.MAX_SAFE_INTEGER;
  world.spawn.miniBossDone = true;
  world.spawn.bossDone = true;
  return world;
}

test('every preset offers more items than the player can hold', () => {
  for (const preset of PRESETS) {
    const kit = ITEMS.filter((item) => item.preset === preset.id);
    assert.equal(kit.length, tuning.items.presetSize, preset.id);
    for (const item of kit) assert.equal(item.classId, preset.classId);
  }
  const general = ITEMS.filter((item) => item.preset === 'general');
  const choices = tuning.items.presetSize + general.length;
  assert.ok(choices > tuning.items.totalSlots, 'a build must force items to be left behind');
});

test('every class has three presets to choose from', () => {
  for (let classId = 0; classId < 4; classId++) {
    assert.equal(presetsForClass(classId).length, 3);
  }
});

test('an offer never contains an item from another preset', () => {
  const world = quietWorld(4, CLASS_WIZARD, ELEMENTALIST);
  for (let i = 0; i < ITEMS.length; i++) {
    if (!canOffer(world, i)) continue;
    const preset = ITEMS[i].preset;
    assert.ok(
      preset === 'general' || preset === 'wizard_elementalist',
      `offered ${ITEMS[i].id} from ${preset}`,
    );
  }
});

test('the player holds five items in total, exclusive and general sharing one pool', () => {
  const world = quietWorld(4, CLASS_WIZARD, ELEMENTALIST);
  const offerable: number[] = [];
  for (let i = 0; i < ITEMS.length; i++) {
    if (canOffer(world, i)) offerable.push(i);
  }
  assert.equal(offerable.length, tuning.items.presetSize + 3, 'nine items should be choosable');
  for (let n = 0; n < tuning.items.totalSlots; n++) grantItem(world, offerable[n]);
  assert.equal(slotsUsed(world), tuning.items.totalSlots);
  for (const index of offerable.slice(tuning.items.totalSlots)) {
    assert.equal(canOffer(world, index), false, `${ITEMS[index].id} offered past the slot cap`);
  }
  for (const index of offerable.slice(0, tuning.items.totalSlots)) {
    assert.equal(canOffer(world, index), true, `${ITEMS[index].id} should still take stars`);
  }
});

test('an owned item keeps being offered until it awakens, then never again', () => {
  const world = quietWorld(4, CLASS_WIZARD, ELEMENTALIST);
  const index = itemIndexById('staff_of_cinders');
  for (let star = 1; star <= MAX_STARS; star++) {
    assert.equal(canOffer(world, index), true, `star ${star} should still be offerable`);
    grantItem(world, index);
    assert.equal(world.itemStars[index], star);
  }
  assert.equal(canOffer(world, index), true, 'a five-star item must still offer its awakening');
  grantItem(world, index);
  assert.equal(world.itemStars[index], AWAKENED_STARS);
  assert.equal(canOffer(world, index), false, 'an awakened item must stop being offered');
  grantItem(world, index);
  assert.equal(world.itemStars[index], AWAKENED_STARS, 'awakened items must not gain more stars');
});

test('stars scale the stat they carry and awakening adds its own on top', () => {
  const world = quietWorld(4, CLASS_KNIGHT, BLADEGUARD);
  const index = itemIndexById('aegis_helm');
  const base = world.player.maxHp;
  const perStar = ITEMS[index].stats?.maxHp ?? 0;
  assert.ok(perStar > 0);
  grantItem(world, index);
  assert.equal(world.player.maxHp, base + perStar);
  grantItem(world, index);
  assert.equal(world.player.maxHp, base + perStar * 2);
  for (let star = 3; star <= MAX_STARS; star++) grantItem(world, index);
  assert.equal(world.player.maxHp, base + perStar * MAX_STARS);
  const beforeAwaken = world.abilityCount;
  grantItem(world, index);
  assert.equal(world.player.maxHp, base + perStar * MAX_STARS, 'awakening must not add more stars');
  assert.equal(world.abilityCount, beforeAwaken + 1, 'awakening should register its ability');
});

test('an item that grants an ability registers it at one star and scales it with stars', () => {
  const world = quietWorld(4, CLASS_WIZARD, ELEMENTALIST);
  const index = itemIndexById('codex_of_frost');
  assert.equal(world.abilityCount, 0);
  grantItem(world, index);
  assert.equal(world.abilityCount, 1);
  const oneStar = { damage: world.abilities[0].damage, interval: world.abilities[0].intervalTicks };
  grantItem(world, index);
  grantItem(world, index);
  assert.ok(world.abilities[0].damage > oneStar.damage, 'stars should raise ability damage');
  assert.ok(world.abilities[0].intervalTicks < oneStar.interval, 'stars should shorten the interval');
});

test('an icicle ability actually damages an enemy once it is off cooldown', () => {
  const world = quietWorld(4, CLASS_WIZARD, ELEMENTALIST);
  world.player.attackTimerTicks = Number.MAX_SAFE_INTEGER;
  world.player.attackCooldownTicks = Number.MAX_SAFE_INTEGER;
  grantItem(world, itemIndexById('codex_of_frost'));
  const target = spawnEnemy(world, { ...BITER, damage: 0, attackInterval: 1000 }, 70, 0, 0);
  assert.ok(target);
  const before = target.hp;
  for (let t = 0; t < 400 && target.hp === before; t++) advance(world);
  assert.ok(target.hp < before, 'the icicle never landed');
});

test('reaching the xp threshold pauses the sim with three distinct item cards', () => {
  const world = quietWorld(9, CLASS_KNIGHT, BLADEGUARD);
  world.xp = tuning.leveling.baseXpToLevel;
  advance(world);
  assert.equal(world.status, STATUS_LEVELUP);
  assert.equal(world.level, 2);
  const offered = [...world.itemOffer];
  assert.equal(offered.length, 3);
  assert.ok(offered.every((i) => i >= 0 && i < ITEMS.length));
  assert.equal(new Set(offered).size, 3);
  const tickAtPause = world.tick;
  for (let t = 0; t < 30; t++) advance(world);
  assert.equal(world.tick, tickAtPause);
});

test('picking a card grants the item a star and resumes the sim', () => {
  const world = quietWorld(9, CLASS_KNIGHT, BLADEGUARD);
  world.xp = tuning.leveling.baseXpToLevel;
  advance(world);
  const picked = world.itemOffer[0];
  applyItemPick(world, 0);
  assert.equal(world.status, STATUS_RUNNING);
  assert.equal(world.itemStars[picked], 1);
  const tickBefore = world.tick;
  advance(world);
  assert.equal(world.tick, tickBefore + 1);
});

test('damage stars scale the damage of a spawned projectile', () => {
  const world = quietWorld(9, CLASS_KNIGHT, BLADEGUARD);
  spawnEnemy(world, { ...BITER, damage: 0, attackInterval: 1000 }, 100, 0, 0);
  const index = itemIndexById('vowblade');
  const perStar = ITEMS[index].stats?.damageMult ?? 0;
  grantItem(world, index);
  let sword = null;
  for (let t = 0; t < 200 && sword === null; t++) {
    advance(world);
    if (world.projectiles.count > 0) sword = world.projectiles.items[0];
  }
  assert.ok(sword);
  assert.ok(Math.abs(sword.damage - 8 * (1 + perStar)) < 1e-9, `damage was ${sword.damage}`);
});

test('the revive from an awakened potion fires once and never again', () => {
  const world = quietWorld(9, CLASS_KNIGHT, BLADEGUARD);
  const index = itemIndexById('potion_of_vigour');
  for (let star = 0; star < AWAKENED_STARS; star++) grantItem(world, index);
  assert.equal(world.player.revivesLeft, 1);
  world.player.attackTimerTicks = Number.MAX_SAFE_INTEGER;
  world.player.attackCooldownTicks = Number.MAX_SAFE_INTEGER;
  for (let n = 0; n < 5; n++) spawnEnemy(world, BITER, 0, 0, 0);
  let revived = false;
  for (let t = 0; t < 4000 && world.status !== STATUS_DEAD; t++) {
    advance(world);
    if (world.reviveUsed) revived = true;
  }
  assert.ok(revived, 'the revive never triggered');
  assert.equal(world.status, STATUS_DEAD, 'the run must still end after the single revive');
  assert.equal(world.player.revivesLeft, 0);
});

test('resetWorld clears every star and rebuilds the player from the class', () => {
  const world = quietWorld(9, CLASS_KNIGHT, BLADEGUARD);
  grantItem(world, itemIndexById('aegis_helm'));
  grantItem(world, itemIndexById('rally_banner'));
  const boostedHp = world.player.maxHp;
  resetWorld(world, 123, CLASS_KNIGHT, BLADEGUARD);
  assert.equal(world.status, STATUS_RUNNING);
  assert.ok(world.player.maxHp < boostedHp);
  assert.equal(world.player.hp, world.player.maxHp);
  assert.equal(world.abilityCount, 0);
  assert.equal(world.orbiterCount, 0);
  assert.equal(world.level, 1);
  assert.equal(world.kills, 0);
  for (let i = 0; i < ITEMS.length; i++) assert.equal(world.itemStars[i], 0);
});
