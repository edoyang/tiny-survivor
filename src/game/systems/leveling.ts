import tuning from '../data/tuning.json' with { type: 'json' };
import { ITEM_OFFER_SLOTS, STATUS_LEVELUP, STATUS_RUNNING } from '../kinds.ts';
import { nextInt } from '../rng.ts';
import type { World } from '../state.ts';
import { canOffer, grantItem, ITEMS } from './items.ts';

const OFFER_SCRATCH = new Int32Array(ITEMS.length);

function generateOffer(world: World): number {
  let eligibleCount = 0;
  for (let i = 0; i < ITEMS.length; i++) {
    if (canOffer(world, i)) {
      OFFER_SCRATCH[eligibleCount] = i;
      eligibleCount++;
    }
  }
  world.itemOffer.fill(-1);
  const offers = Math.min(ITEM_OFFER_SLOTS, eligibleCount);
  for (let slot = 0; slot < offers; slot++) {
    const pick = nextInt(world.rng, slot, eligibleCount);
    const chosen = OFFER_SCRATCH[pick];
    OFFER_SCRATCH[pick] = OFFER_SCRATCH[slot];
    OFFER_SCRATCH[slot] = chosen;
    world.itemOffer[slot] = chosen;
  }
  return offers;
}

export function checkLevelUp(world: World): void {
  if (world.status !== STATUS_RUNNING) return;
  if (world.xp < world.xpToNext) return;
  world.xp -= world.xpToNext;
  world.level++;
  world.xpToNext =
    tuning.leveling.baseXpToLevel + tuning.leveling.xpGrowthPerLevel * (world.level - 1);
  const offers = generateOffer(world);
  if (offers > 0) world.status = STATUS_LEVELUP;
}

export function applyItemPick(world: World, offerSlot: number): void {
  const itemIndex = world.itemOffer[offerSlot];
  if (itemIndex >= 0) grantItem(world, itemIndex);
  world.itemOffer.fill(-1);
  world.status = STATUS_RUNNING;
}
