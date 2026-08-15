import classes from '../data/classes.json' with { type: 'json' };
import tuning from '../data/tuning.json' with { type: 'json' };
import upgrades from '../data/upgrades.json' with { type: 'json' };
import { nextInt } from '../rng.ts';
import {
  FIXED_DT,
  STATUS_LEVELUP,
  STATUS_RUNNING,
  UPGRADE_OFFER_SLOTS,
  type World,
} from '../state.ts';

const UPGRADE_VOLLEY = upgrades.findIndex((u) => u.id === 'volley');
const UPGRADE_DAMAGE = upgrades.findIndex((u) => u.id === 'damage');
const UPGRADE_COOLDOWN = upgrades.findIndex((u) => u.id === 'cooldown');
const UPGRADE_AOE = upgrades.findIndex((u) => u.id === 'aoe');
const UPGRADE_PIERCE = upgrades.findIndex((u) => u.id === 'pierce');
const UPGRADE_SPEED = upgrades.findIndex((u) => u.id === 'speed');
const UPGRADE_MAXHP = upgrades.findIndex((u) => u.id === 'maxhp');
const UPGRADE_MAGNET = upgrades.findIndex((u) => u.id === 'magnet');

const OFFER_SCRATCH = new Int32Array(upgrades.length);

function generateOffer(world: World): number {
  let eligibleCount = 0;
  for (let i = 0; i < upgrades.length; i++) {
    if (world.upgradeStacks[i] < upgrades[i].maxStacks) {
      OFFER_SCRATCH[eligibleCount] = i;
      eligibleCount++;
    }
  }
  world.upgradeOffer.fill(-1);
  const offers = Math.min(UPGRADE_OFFER_SLOTS, eligibleCount);
  for (let slot = 0; slot < offers; slot++) {
    const pick = nextInt(world.rng, slot, eligibleCount);
    const chosen = OFFER_SCRATCH[pick];
    OFFER_SCRATCH[pick] = OFFER_SCRATCH[slot];
    OFFER_SCRATCH[slot] = chosen;
    world.upgradeOffer[slot] = chosen;
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

export function applyUpgrade(world: World, offerSlot: number): void {
  const upgradeIndex = world.upgradeOffer[offerSlot];
  if (upgradeIndex < 0) {
    world.status = STATUS_RUNNING;
    return;
  }
  const def = upgrades[upgradeIndex];
  const p = world.player;
  world.upgradeStacks[upgradeIndex]++;
  if (upgradeIndex === UPGRADE_VOLLEY) {
    p.volleyCount += def.amount;
  } else if (upgradeIndex === UPGRADE_DAMAGE) {
    p.damageMult += def.amount;
  } else if (upgradeIndex === UPGRADE_COOLDOWN) {
    p.cooldownMult *= 1 - def.amount;
    const cls = classes[p.classId];
    p.attackCooldownTicks = Math.max(1, Math.round((cls.cooldown * p.cooldownMult) / FIXED_DT));
  } else if (upgradeIndex === UPGRADE_AOE) {
    p.aoeMult += def.amount;
  } else if (upgradeIndex === UPGRADE_PIERCE) {
    p.bonusPierce += def.amount;
  } else if (upgradeIndex === UPGRADE_SPEED) {
    const cls = classes[p.classId];
    p.moveSpeed = cls.moveSpeed * (1 + def.amount * world.upgradeStacks[upgradeIndex]);
  } else if (upgradeIndex === UPGRADE_MAXHP) {
    p.maxHp += def.amount;
    p.hp = Math.min(p.maxHp, p.hp + def.amount);
  } else if (upgradeIndex === UPGRADE_MAGNET) {
    p.pickupMult += def.amount;
  }
  world.upgradeOffer.fill(-1);
  world.status = STATUS_RUNNING;
}
