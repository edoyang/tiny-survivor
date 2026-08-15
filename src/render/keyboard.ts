import type { Vec2 } from '../game/state.ts';

export function attachKeyboard(input: Vec2): () => void {
  input.x = 0;
  input.y = 0;
  return () => {};
}
