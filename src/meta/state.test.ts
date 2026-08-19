import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AWAKENED_STARS } from '../game/kinds.ts';
import { createWorld } from '../game/state.ts';
import { ITEMS, PRESETS } from '../game/systems/items.ts';
import economy from './data/meta.json' with { type: 'json' };
import {
  awardRun,
  canUpgrade,
  claimIdle,
  createMeta,
  EQUIP_SLOTS,
  equippedFor,
  gachaCost,
  grantGear,
  idlePending,
  MAPS,
  ownedStars,
  rollGacha,
  startingStars,
  toggleEquip,
  upgradeCost,
  upgradeGear,
} from './state.ts';

const MINUTE = 60000;

test('idle coins accrue per minute and stop at the cap', () => {
  const state = createMeta(0);
  assert.equal(idlePending(state, 0), 0);
  assert.equal(idlePending(state, 10 * MINUTE), 10 * economy.idleCoinsPerMinute);
  const overCap = (economy.idleCapMinutes + 500) * MINUTE;
  assert.equal(idlePending(state, overCap), economy.idleCapMinutes * economy.idleCoinsPerMinute);
});

test('claiming idle coins pays out once and restarts the clock', () => {
  const state = createMeta(0);
  const before = state.coins;
  const claimed = claimIdle(state, 30 * MINUTE);
  assert.equal(claimed, 30 * economy.idleCoinsPerMinute);
  assert.equal(state.coins, before + claimed);
  assert.equal(claimIdle(state, 30 * MINUTE), 0);
});

test('a gacha roll is deterministic for a given roll index', () => {
  const a = createMeta(0);
  const b = createMeta(0);
  assert.deepEqual(rollGacha(a, 10), rollGacha(b, 10));
});

test('a roll is refused when gems are short and costs nothing', () => {
  const state = createMeta(0);
  state.gems = gachaCost(1) - 1;
  assert.deepEqual(rollGacha(state, 1), []);
  assert.equal(state.gems, gachaCost(1) - 1);
});

test('duplicates of a maxed item pay coins instead of stars', () => {
  const state = createMeta(0);
  const id = ITEMS[0].id;
  state.owned[id] = AWAKENED_STARS;
  const coins = state.coins;
  assert.equal(grantGear(state, id), false);
  assert.equal(ownedStars(state, id), AWAKENED_STARS);
  assert.equal(state.coins, coins + economy.gachaDuplicateCoins);
});

test('upgrading spends coins, adds one star, and stops at awakened', () => {
  const state = createMeta(0);
  const id = ITEMS[0].id;
  state.owned[id] = 1;
  state.coins = upgradeCost(1);
  assert.equal(upgradeGear(state, id), true);
  assert.equal(ownedStars(state, id), 2);
  assert.equal(state.coins, 0);
  state.owned[id] = AWAKENED_STARS;
  state.coins = 1000000;
  assert.equal(canUpgrade(state, id), false);
  assert.equal(upgradeGear(state, id), false);
});

test('equipping never exceeds the run slot count and ignores unowned gear', () => {
  const state = createMeta(0);
  for (const item of ITEMS) {
    if (item.preset === PRESETS[0].id) state.owned[item.id] = 1;
  }
  state.equipped = {};
  const equipped = equippedFor(state, 0);
  assert.equal(equipped.length, EQUIP_SLOTS);
  const spare = ITEMS.find(
    (item) => item.preset === PRESETS[0].id && !equipped.includes(item.id),
  );
  assert.notEqual(spare, undefined);
  if (spare !== undefined) {
    toggleEquip(state, 0, spare.id);
    assert.equal(equippedFor(state, 0).length, EQUIP_SLOTS);
    toggleEquip(state, 0, equipped[0]);
    assert.equal(equippedFor(state, 0).length, EQUIP_SLOTS - 1);
    toggleEquip(state, 0, spare.id);
    assert.equal(equippedFor(state, 0).includes(spare.id), true);
  }
  const unowned = ITEMS.find((item) => ownedStars(state, item.id) === 0);
  assert.notEqual(unowned, undefined);
  if (unowned !== undefined) {
    const size = equippedFor(state, 0).length;
    toggleEquip(state, 0, unowned.id);
    assert.equal(equippedFor(state, 0).length, size);
  }
});

test('starting stars carry the owned level of equipped gear only', () => {
  const state = createMeta(0);
  const equipped = equippedFor(state, 0);
  state.owned[equipped[0]] = 3;
  const stars = startingStars(state, 0);
  assert.equal(stars[equipped[0]], 3);
  const notEquipped = ITEMS.find((item) => !equipped.includes(item.id));
  assert.notEqual(notEquipped, undefined);
  if (notEquipped !== undefined) assert.equal(stars[notEquipped.id], undefined);
});

test('run rewards scale with the map and a win records a clear', () => {
  const easy = createMeta(0);
  const hard = createMeta(0);
  const easyCoins = awardRun(easy, 300, 8, 0, false);
  const hardCoins = awardRun(hard, 300, 8, MAPS.length - 1, false);
  assert.ok(hardCoins > easyCoins);
  assert.equal(easy.clears, 0);
  awardRun(easy, 900, 20, 0, true);
  assert.equal(easy.clears, 1);
});

test('a map multiplier and equipped stars reach the run', () => {
  const state = createMeta(0);
  const equipped = equippedFor(state, 0);
  state.owned[equipped[0]] = 4;
  const hard = MAPS[MAPS.length - 1];
  const world = createWorld(1, PRESETS[0].classId, 0, {
    stars: startingStars(state, 0),
    hpMult: hard.hpMult,
    speedMult: hard.speedMult,
  });
  assert.equal(world.mapHpMult, hard.hpMult);
  const index = ITEMS.findIndex((item) => item.id === equipped[0]);
  assert.equal(world.itemStars[index], 4);
  const plain = createWorld(1, PRESETS[0].classId, 0);
  assert.ok(world.player.damageMult > plain.player.damageMult);
});
