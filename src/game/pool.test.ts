import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPool, poolObtain, poolReleaseAt } from './pool.ts';
import { createRng, nextFloat, nextInt } from './rng.ts';

type Item = { serial: number; alive: boolean };

test('obtain returns null once capacity is reached', () => {
  const pool = createPool(3, (): Item => ({ serial: 0, alive: false }));
  assert.ok(poolObtain(pool));
  assert.ok(poolObtain(pool));
  assert.ok(poolObtain(pool));
  assert.equal(poolObtain(pool), null);
});

test('release swaps the last item into the freed slot, keeping actives dense', () => {
  const pool = createPool(4, (): Item => ({ serial: 0, alive: false }));
  for (let s = 1; s <= 4; s++) {
    const item = poolObtain(pool);
    assert.ok(item);
    item.serial = s;
  }
  poolReleaseAt(pool, 1);
  assert.equal(pool.count, 3);
  assert.equal(pool.items[1].serial, 4);
  assert.equal(pool.items[3].serial, 2);
});

test('churn reuses the same object instances and never allocates new ones', () => {
  const capacity = 32;
  const pool = createPool(capacity, (): Item => ({ serial: 0, alive: false }));
  const universe = new Set<Item>(pool.items);
  assert.equal(universe.size, capacity);
  const rng = createRng(5);
  let liveSerial = 0;
  for (let round = 0; round < 10000; round++) {
    if (nextFloat(rng) < 0.55 && pool.count < capacity) {
      const item = poolObtain(pool);
      assert.ok(item);
      assert.ok(universe.has(item));
      liveSerial++;
      item.serial = liveSerial;
      item.alive = true;
    } else if (pool.count > 0) {
      const idx = nextInt(rng, 0, pool.count);
      pool.items[idx].alive = false;
      poolReleaseAt(pool, idx);
    }
    assert.ok(pool.count >= 0 && pool.count <= capacity);
    for (let i = 0; i < pool.count; i++) assert.ok(pool.items[i].alive);
    for (let i = pool.count; i < capacity; i++) assert.ok(!pool.items[i].alive);
  }
  assert.equal(new Set(pool.items).size, capacity);
});
