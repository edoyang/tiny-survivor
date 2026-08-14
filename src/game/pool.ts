export type Pool<T> = {
  items: T[];
  count: number;
  capacity: number;
};

export function createPool<T>(capacity: number, createItem: () => T): Pool<T> {
  const items: T[] = new Array(capacity);
  for (let i = 0; i < capacity; i++) items[i] = createItem();
  return { items, count: 0, capacity };
}

export function poolObtain<T>(pool: Pool<T>): T | null {
  if (pool.count >= pool.capacity) return null;
  const item = pool.items[pool.count];
  pool.count++;
  return item;
}

export function poolReleaseAt<T>(pool: Pool<T>, index: number): void {
  const last = pool.count - 1;
  const removed = pool.items[index];
  pool.items[index] = pool.items[last];
  pool.items[last] = removed;
  pool.count = last;
}

export function poolClear<T>(pool: Pool<T>): void {
  pool.count = 0;
}
