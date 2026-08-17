import tuning from '../data/tuning.json' with { type: 'json' };
import { poolReleaseAt } from '../pool.ts';
import type { World } from '../state.ts';
import { damageInRadius } from './damage.ts';

export function updateGems(world: World, dt: number): void {
  const p = world.player;
  const pool = world.gems;
  const magnetRadius = p.unlimitedPickup ? Infinity : tuning.pickup.radius * p.pickupMult;
  const collectRadius = tuning.pickup.collectRadius;
  const magnetSpeed = tuning.pickup.magnetSpeed;
  for (let i = pool.count - 1; i >= 0; i--) {
    const gem = pool.items[i];
    gem.prevX = gem.pos.x;
    gem.prevY = gem.pos.y;
    const dx = p.pos.x - gem.pos.x;
    const dy = p.pos.y - gem.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= collectRadius) {
      world.xp += gem.value;
      const gemX = gem.pos.x;
      const gemY = gem.pos.y;
      poolReleaseAt(pool, i);
      if (p.gemBlast) {
        damageInRadius(
          world,
          gemX,
          gemY,
          tuning.items.gemBlastRadius * p.aoeMult,
          tuning.items.gemBlastDamage * p.damageMult,
        );
      }
      continue;
    }
    if (dist <= magnetRadius) {
      const step = magnetSpeed * dt;
      if (step >= dist) {
        gem.pos.x = p.pos.x;
        gem.pos.y = p.pos.y;
      } else {
        gem.pos.x += (dx / dist) * step;
        gem.pos.y += (dy / dist) * step;
      }
    }
  }
}
