import tuning from '../game/data/tuning.json' with { type: 'json' };
import type { World } from '../game/state.ts';

export type HeroPose = {
  bobOffset: number;
  scaleX: number;
  scaleY: number;
  weaponAngleDeg: number;
};

export function createHeroPose(): HeroPose {
  return { bobOffset: 0, scaleX: 1, scaleY: 1, weaponAngleDeg: 0 };
}

export function computeHeroPose(world: World, pose: HeroPose): void {
  const rig = tuning.heroRig;
  const p = world.player;
  const wave = Math.sin(p.bobPhase);
  if (p.walking) {
    pose.bobOffset = -Math.abs(wave) * rig.walkBobHeight;
    const squash = Math.sin(p.bobPhase * 2) * rig.walkSquashAmount;
    pose.scaleX = 1 + squash;
    pose.scaleY = 1 - squash;
  } else {
    pose.bobOffset = wave * rig.idleBobHeight;
    pose.scaleX = 1;
    pose.scaleY = 1;
  }
  const walkSwing = p.walking ? rig.weaponWalkSwingDeg * wave : rig.weaponWalkSwingDeg * 0.4 * wave;
  let attackSwing = 0;
  const t = p.attackAnimT;
  if (t < rig.attackOutSeconds) {
    attackSwing = rig.attackSwingDeg * (t / rig.attackOutSeconds);
  } else {
    const returnT = (t - rig.attackOutSeconds) / rig.attackReturnSeconds;
    if (returnT < 1) {
      const remain = 1 - returnT;
      attackSwing = rig.attackSwingDeg * remain * remain * remain;
    }
  }
  pose.weaponAngleDeg = walkSwing + attackSwing;
}
