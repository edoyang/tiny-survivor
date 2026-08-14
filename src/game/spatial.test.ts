import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSpatialHash, queryCircle, rebuild } from './spatial.ts';
import { createRng, nextRange } from './rng.ts';

type Point = { pos: { x: number; y: number } };

function randomPoints(seed: number, count: number, extent: number): Point[] {
  const rng = createRng(seed);
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    points.push({
      pos: { x: nextRange(rng, -extent, extent), y: nextRange(rng, -extent, extent) },
    });
  }
  return points;
}

function bruteForceWithin(points: Point[], x: number, y: number, r: number): Set<number> {
  const hits = new Set<number>();
  for (let i = 0; i < points.length; i++) {
    const dx = points[i].pos.x - x;
    const dy = points[i].pos.y - y;
    if (dx * dx + dy * dy <= r * r) hits.add(i);
  }
  return hits;
}

test('queryCircle candidates include every point within the radius', () => {
  const points = randomPoints(11, 200, 500);
  const hash = createSpatialHash(32, 256, 256);
  rebuild(hash, points, points.length);
  const rng = createRng(12);
  for (let q = 0; q < 100; q++) {
    const x = nextRange(rng, -500, 500);
    const y = nextRange(rng, -500, 500);
    const r = nextRange(rng, 5, 120);
    const expected = bruteForceWithin(points, x, y, r);
    queryCircle(hash, x, y, r);
    const candidates = new Set<number>();
    for (let i = 0; i < hash.queryCount; i++) candidates.add(hash.queryResults[i]);
    for (const idx of expected) {
      assert.ok(candidates.has(idx), `missed point ${idx} at query ${q}`);
    }
  }
});

test('queryCircle never returns the same index twice', () => {
  const points = randomPoints(21, 200, 300);
  const hash = createSpatialHash(32, 64, 256);
  rebuild(hash, points, points.length);
  const rng = createRng(22);
  for (let q = 0; q < 50; q++) {
    const x = nextRange(rng, -300, 300);
    const y = nextRange(rng, -300, 300);
    queryCircle(hash, x, y, nextRange(rng, 10, 200));
    const seen = new Set<number>();
    for (let i = 0; i < hash.queryCount; i++) {
      assert.ok(!seen.has(hash.queryResults[i]));
      seen.add(hash.queryResults[i]);
    }
  }
});

test('works with negative coordinates and cell-boundary positions', () => {
  const points: Point[] = [
    { pos: { x: -32, y: -32 } },
    { pos: { x: -0.001, y: -0.001 } },
    { pos: { x: 0, y: 0 } },
    { pos: { x: 32, y: 32 } },
    { pos: { x: -100.5, y: 64 } },
  ];
  const hash = createSpatialHash(32, 64, 16);
  rebuild(hash, points, points.length);
  const expected = bruteForceWithin(points, 0, 0, 50);
  queryCircle(hash, 0, 0, 50);
  const candidates = new Set<number>();
  for (let i = 0; i < hash.queryCount; i++) candidates.add(hash.queryResults[i]);
  for (const idx of expected) assert.ok(candidates.has(idx));
});

test('rebuild reflects moved points and dropped count', () => {
  const points = randomPoints(31, 50, 200);
  const hash = createSpatialHash(32, 64, 64);
  rebuild(hash, points, points.length);
  for (const p of points) {
    p.pos.x += 1000;
  }
  rebuild(hash, points, 10);
  assert.equal(hash.entryCount, 10);
  queryCircle(hash, 1000, 0, 300);
  for (let i = 0; i < hash.queryCount; i++) {
    assert.ok(hash.queryResults[i] < 10);
    assert.ok(points[hash.queryResults[i]].pos.x >= 800);
  }
});
