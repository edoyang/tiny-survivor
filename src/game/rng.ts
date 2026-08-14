export type Rng = { state: number };

export function createRng(seed: number): Rng {
  return { state: seed >>> 0 };
}

export function nextU32(rng: Rng): number {
  let s = (rng.state + 0x6d2b79f5) >>> 0;
  rng.state = s;
  s = Math.imul(s ^ (s >>> 15), s | 1);
  s = (s + Math.imul(s ^ (s >>> 7), s | 61)) >>> 0;
  return (s ^ (s >>> 14)) >>> 0;
}

export function nextFloat(rng: Rng): number {
  return nextU32(rng) / 4294967296;
}

export function nextRange(rng: Rng, min: number, max: number): number {
  return min + nextFloat(rng) * (max - min);
}

export function nextInt(rng: Rng, minInclusive: number, maxExclusive: number): number {
  return minInclusive + Math.floor(nextFloat(rng) * (maxExclusive - minInclusive));
}
