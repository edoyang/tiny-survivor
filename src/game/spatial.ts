type Positioned = { pos: { x: number; y: number } };

export type SpatialHash = {
  cellSize: number;
  numBuckets: number;
  bucketMask: number;
  bucketCounts: Int32Array;
  starts: Int32Array;
  cursors: Int32Array;
  entries: Int32Array;
  entryCellX: Int32Array;
  entryCellY: Int32Array;
  entryCount: number;
  queryResults: Int32Array;
  queryCount: number;
};

export function createSpatialHash(
  cellSize: number,
  numBucketsPow2: number,
  capacity: number,
): SpatialHash {
  return {
    cellSize,
    numBuckets: numBucketsPow2,
    bucketMask: numBucketsPow2 - 1,
    bucketCounts: new Int32Array(numBucketsPow2),
    starts: new Int32Array(numBucketsPow2 + 1),
    cursors: new Int32Array(numBucketsPow2),
    entries: new Int32Array(capacity),
    entryCellX: new Int32Array(capacity),
    entryCellY: new Int32Array(capacity),
    entryCount: 0,
    queryResults: new Int32Array(capacity),
    queryCount: 0,
  };
}

function bucketOf(hash: SpatialHash, cellX: number, cellY: number): number {
  let h = Math.imul(cellX, 0x9e3779b1) ^ Math.imul(cellY, 0x85ebca6b);
  h ^= h >>> 13;
  return h & hash.bucketMask;
}

export function rebuild(hash: SpatialHash, items: Positioned[], count: number): void {
  const n = Math.min(count, hash.entries.length);
  hash.entryCount = n;
  hash.bucketCounts.fill(0);
  const inv = 1 / hash.cellSize;
  for (let i = 0; i < n; i++) {
    const cx = Math.floor(items[i].pos.x * inv);
    const cy = Math.floor(items[i].pos.y * inv);
    hash.entryCellX[i] = cx;
    hash.entryCellY[i] = cy;
    hash.bucketCounts[bucketOf(hash, cx, cy)]++;
  }
  let acc = 0;
  for (let b = 0; b < hash.numBuckets; b++) {
    hash.starts[b] = acc;
    hash.cursors[b] = acc;
    acc += hash.bucketCounts[b];
  }
  hash.starts[hash.numBuckets] = acc;
  for (let i = 0; i < n; i++) {
    const b = bucketOf(hash, hash.entryCellX[i], hash.entryCellY[i]);
    hash.entries[hash.cursors[b]] = i;
    hash.cursors[b]++;
  }
}

export function queryCircle(hash: SpatialHash, x: number, y: number, radius: number): void {
  hash.queryCount = 0;
  const inv = 1 / hash.cellSize;
  const minCx = Math.floor((x - radius) * inv);
  const maxCx = Math.floor((x + radius) * inv);
  const minCy = Math.floor((y - radius) * inv);
  const maxCy = Math.floor((y + radius) * inv);
  for (let cy = minCy; cy <= maxCy; cy++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      const b = bucketOf(hash, cx, cy);
      const end = hash.starts[b + 1];
      for (let e = hash.starts[b]; e < end; e++) {
        const idx = hash.entries[e];
        if (hash.entryCellX[idx] === cx && hash.entryCellY[idx] === cy) {
          hash.queryResults[hash.queryCount] = idx;
          hash.queryCount++;
        }
      }
    }
  }
}
