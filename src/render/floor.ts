import { createRng, nextFloat } from '../game/rng.ts';

export const TILE_SIZE = 16;
export const BLOCK_TILES = 80;
export const BLOCK_SIZE = BLOCK_TILES * TILE_SIZE;

const FLOOR_SEED = 0xf100d;

export function generateFloorLayout(weights: number[]): Uint8Array {
  const layout = new Uint8Array(BLOCK_TILES * BLOCK_TILES);
  const rng = createRng(FLOOR_SEED);
  let total = 0;
  for (const w of weights) total += w;
  for (let i = 0; i < layout.length; i++) {
    let roll = nextFloat(rng) * total;
    let picked = weights.length - 1;
    for (let t = 0; t < weights.length; t++) {
      roll -= weights[t];
      if (roll < 0) {
        picked = t;
        break;
      }
    }
    layout[i] = picked;
  }
  return layout;
}

export function floorTileAt(layout: Uint8Array, tileX: number, tileY: number): number {
  const bx = ((tileX % BLOCK_TILES) + BLOCK_TILES) % BLOCK_TILES;
  const by = ((tileY % BLOCK_TILES) + BLOCK_TILES) % BLOCK_TILES;
  return layout[by * BLOCK_TILES + bx];
}
