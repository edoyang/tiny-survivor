import { useWindowDimensions } from 'react-native';

export const SCREEN_PADDING = 12;
export const BASE_GUTTER = 8;
export const TILE_CHROME = 4;

export type Grid = { tile: number; gutter: number };

export function useGrid(columns: number): Grid {
  const { width } = useWindowDimensions();
  const available = width - SCREEN_PADDING * 2;
  const outer = Math.floor((available - BASE_GUTTER * (columns - 1)) / columns);
  const leftover = available - outer * columns - BASE_GUTTER * (columns - 1);
  const gutter = columns > 1 ? BASE_GUTTER + leftover / (columns - 1) : BASE_GUTTER;
  return { tile: outer - TILE_CHROME, gutter };
}
