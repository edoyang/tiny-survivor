import tuning from '../data/tuning.json' with { type: 'json' };
import type { World } from '../state.ts';

const TWO_PI = Math.PI * 2;

export function updateHeroRig(world: World, dt: number): void {
  const p = world.player;
  p.walking = p.moveInput.x !== 0 || p.moveInput.y !== 0;
  const bobHz = p.walking ? tuning.heroRig.walkBobHz : tuning.heroRig.idleBobHz;
  p.bobPhase = (p.bobPhase + TWO_PI * bobHz * dt) % TWO_PI;
  if (p.attackAnimT < 1000) p.attackAnimT += dt;
  p.attackTimer -= dt;
  if (p.attackTimer <= 0) {
    p.attackTimer += p.attackCooldown;
    p.attackAnimT = 0;
  }
}
