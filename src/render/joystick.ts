import type { Vec2 } from '../game/state.ts';

export type JoystickState = {
  active: boolean;
  originX: number;
  originY: number;
  x: number;
  y: number;
};

export function createJoystick(): JoystickState {
  return { active: false, originX: 0, originY: 0, x: 0, y: 0 };
}

export function joystickInput(
  joystick: JoystickState,
  radius: number,
  deadZone: number,
  out: Vec2,
): void {
  if (!joystick.active) {
    out.x = 0;
    out.y = 0;
    return;
  }
  let dx = (joystick.x - joystick.originX) / radius;
  let dy = (joystick.y - joystick.originY) / radius;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < deadZone) {
    out.x = 0;
    out.y = 0;
    return;
  }
  if (len > 1) {
    dx /= len;
    dy /= len;
  }
  out.x = dx;
  out.y = dy;
}
