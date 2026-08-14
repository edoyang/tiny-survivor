import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, nextFloat, nextInt, nextU32 } from './rng.ts';

test('same seed produces the same sequence', () => {
  const a = createRng(1234);
  const b = createRng(1234);
  for (let i = 0; i < 1000; i++) {
    assert.equal(nextU32(a), nextU32(b));
  }
});

test('different seeds diverge within a few draws', () => {
  const a = createRng(1);
  const b = createRng(2);
  let identical = 0;
  for (let i = 0; i < 10; i++) {
    if (nextU32(a) === nextU32(b)) identical++;
  }
  assert.ok(identical < 10);
});

test('nextFloat stays in [0, 1) and fills the range', () => {
  const rng = createRng(99);
  let min = 1;
  let max = 0;
  for (let i = 0; i < 10000; i++) {
    const v = nextFloat(rng);
    assert.ok(v >= 0 && v < 1);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  assert.ok(min < 0.01);
  assert.ok(max > 0.99);
});

test('nextInt covers every bucket and respects bounds', () => {
  const rng = createRng(7);
  const counts = [0, 0, 0, 0];
  for (let i = 0; i < 4000; i++) {
    const v = nextInt(rng, 0, 4);
    assert.ok(v >= 0 && v < 4);
    counts[v]++;
  }
  for (const c of counts) assert.ok(c > 0);
});
