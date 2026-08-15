import type { Vec2 } from '../game/state.ts';

const LEFT_KEYS = ['ArrowLeft', 'a', 'A'];
const RIGHT_KEYS = ['ArrowRight', 'd', 'D'];
const UP_KEYS = ['ArrowUp', 'w', 'W'];
const DOWN_KEYS = ['ArrowDown', 's', 'S'];

export function attachKeyboard(input: Vec2): () => void {
  const down = new Set<string>();
  const refresh = () => {
    const left = LEFT_KEYS.some((k) => down.has(k)) ? 1 : 0;
    const right = RIGHT_KEYS.some((k) => down.has(k)) ? 1 : 0;
    const up = UP_KEYS.some((k) => down.has(k)) ? 1 : 0;
    const bottom = DOWN_KEYS.some((k) => down.has(k)) ? 1 : 0;
    input.x = right - left;
    input.y = bottom - up;
  };
  const onKeyDown = (e: KeyboardEvent) => {
    down.add(e.key);
    refresh();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    down.delete(e.key);
    refresh();
  };
  const onBlur = () => {
    down.clear();
    refresh();
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    input.x = 0;
    input.y = 0;
  };
}
