import classes from '../data/classes.json' with { type: 'json' };
import itemData from '../data/items.json' with { type: 'json' };
import presetData from '../data/presets.json' with { type: 'json' };
import tuning from '../data/tuning.json' with { type: 'json' };
import weapons from '../data/weapons.json' with { type: 'json' };
import {
  AB_BEAM,
  AB_BOMB,
  AB_HEAL,
  AB_ICICLE,
  AB_METEOR,
  AB_NOVA,
  AB_PULL,
  AB_SNOWSTORM,
  AB_THUNDER,
  AB_TRAIL,
  AB_VOLLEY,
  AWAKENED_STARS,
  CLASS_PRIEST,
  FX_BOLT,
  FX_EXPLOSION,
  FX_FROST,
  FX_RING,
  FX_SLASH,
  FX_SPARK,
  FX_STORM,
  MAX_ABILITIES,
  MAX_ORBITERS,
  MAX_STARS,
} from '../kinds.ts';
import type { World } from '../state.ts';

export const GENERAL_PRESET = 'general';

type ItemStats = {
  damageMult?: number;
  cooldownMult?: number;
  aoeMult?: number;
  pierce?: number;
  volley?: number;
  moveSpeedMult?: number;
  maxHp?: number;
  damageReduction?: number;
  thorns?: number;
  moveHaste?: number;
  pickupMult?: number;
  orbiterCount?: number;
  orbiterDamage?: number;
  orbiterRadius?: number;
  auraDps?: number;
  auraRadius?: number;
  auraSlow?: number;
  critChance?: number;
  critMult?: number;
  executeFrac?: number;
  shield?: number;
  shieldRegen?: number;
  knockback?: number;
  burnDps?: number;
  burnSeconds?: number;
  xpMult?: number;
  lifeOnKill?: number;
  cooldownOnKill?: number;
  stillDamage?: number;
  moveDamage?: number;
  minionCount?: number;
  minionDamage?: number;
};

type AbilityData = {
  kind: string;
  visual?: string;
  interval?: number;
  damage?: number;
  radius?: number;
  count?: number;
  duration?: number;
  slow?: number;
  perStar?: { damage?: number; interval?: number; count?: number; radius?: number };
};

type ItemDef = {
  id: string;
  classId: number;
  preset: string;
  name: string;
  color: string;
  star: string;
  awaken: string;
  stats?: ItemStats;
  awakenStats?: ItemStats;
  flags?: string[];
  awakenFlags?: string[];
  ability?: AbilityData;
  awakenAbility?: AbilityData;
};

type PresetDef = {
  id: string;
  classId: number;
  name: string;
  blurb: string;
};

export const ITEMS: ItemDef[] = itemData;
export const PRESETS: PresetDef[] = presetData;

const ABILITY_KINDS: Record<string, number> = {
  meteor: AB_METEOR,
  icicle: AB_ICICLE,
  snowstorm: AB_SNOWSTORM,
  thunder: AB_THUNDER,
  nova: AB_NOVA,
  volley: AB_VOLLEY,
  heal: AB_HEAL,
  trail: AB_TRAIL,
  bomb: AB_BOMB,
  pull: AB_PULL,
  beam: AB_BEAM,
};

const VISUAL_KINDS: Record<string, number> = {
  explosion: FX_EXPLOSION,
  bolt: FX_BOLT,
  ring: FX_RING,
  frost: FX_FROST,
  storm: FX_STORM,
  spark: FX_SPARK,
  slash: FX_SLASH,
};

function abilityKind(name: string): number {
  const kind = ABILITY_KINDS[name];
  if (kind === undefined) throw new Error(`items.json uses unknown ability ${name}`);
  return kind;
}

function visualKind(name: string | undefined): number {
  if (name === undefined) return FX_EXPLOSION;
  const kind = VISUAL_KINDS[name];
  if (kind === undefined) throw new Error(`items.json uses unknown visual ${name}`);
  return kind;
}

for (const item of ITEMS) {
  if (item.ability !== undefined) abilityKind(item.ability.kind);
  if (item.awakenAbility !== undefined) abilityKind(item.awakenAbility.kind);
  visualKind(item.ability?.visual);
  visualKind(item.awakenAbility?.visual);
  if (item.preset !== GENERAL_PRESET && !PRESETS.some((p) => p.id === item.preset)) {
    throw new Error(`items.json references unknown preset ${item.preset}`);
  }
}

for (const preset of PRESETS) {
  const count = ITEMS.filter((item) => item.preset === preset.id).length;
  if (count !== tuning.items.presetSize) {
    throw new Error(`preset ${preset.id} has ${count} items, expected ${tuning.items.presetSize}`);
  }
}

export function presetsForClass(classId: number): number[] {
  const list: number[] = [];
  for (let i = 0; i < PRESETS.length; i++) {
    if (PRESETS[i].classId === classId) list.push(i);
  }
  return list;
}

export function itemIndexById(id: string): number {
  const index = ITEMS.findIndex((item) => item.id === id);
  if (index < 0) throw new Error(`no item with id ${id}`);
  return index;
}

export function slotsUsed(world: World): number {
  let used = 0;
  for (let i = 0; i < ITEMS.length; i++) {
    if (world.itemStars[i] > 0) used++;
  }
  return used;
}

export function canOffer(world: World, itemIndex: number): boolean {
  const def = ITEMS[itemIndex];
  if (def.preset !== GENERAL_PRESET && def.preset !== PRESETS[world.presetId].id) return false;
  const stars = world.itemStars[itemIndex];
  if (stars >= AWAKENED_STARS) return false;
  if (stars > 0) return true;
  return slotsUsed(world) < tuning.items.totalSlots;
}

function addStats(target: ItemStats, source: ItemStats | undefined, times: number): void {
  if (source === undefined) return;
  const keys = Object.keys(source) as (keyof ItemStats)[];
  for (const key of keys) {
    const value = source[key];
    if (value === undefined) continue;
    target[key] = (target[key] ?? 0) + value * times;
  }
}

function writeAbility(world: World, data: AbilityData, extraStars: number, aoeMult: number): number {
  if (world.abilityCount >= MAX_ABILITIES) return -1;
  const index = world.abilityCount;
  const slot = world.abilities[index];
  const perStar = data.perStar;
  const interval = (data.interval ?? 1) + (perStar?.interval ?? 0) * extraStars;
  slot.kind = abilityKind(data.kind);
  slot.visual = visualKind(data.visual);
  slot.intervalTicks = Math.max(6, Math.round(Math.max(0.2, interval) * 60));
  slot.timerTicks = slot.intervalTicks;
  slot.damage = (data.damage ?? 0) + (perStar?.damage ?? 0) * extraStars;
  slot.radius = ((data.radius ?? 0) + (perStar?.radius ?? 0) * extraStars) * aoeMult;
  slot.count = Math.max(1, Math.round((data.count ?? 1) + (perStar?.count ?? 0) * extraStars));
  slot.durationTicks = Math.round((data.duration ?? 0) * 60);
  slot.slowMult = 1 - (data.slow ?? 0);
  world.abilityCount = index + 1;
  return index;
}

const ACCUMULATED: ItemStats = {};
const FLAGS = new Set<string>();

export function recomputePlayer(world: World): void {
  const p = world.player;
  const cls = classes[p.classId];
  for (const key of Object.keys(ACCUMULATED) as (keyof ItemStats)[]) delete ACCUMULATED[key];
  FLAGS.clear();
  for (let i = 0; i < ITEMS.length; i++) {
    const stars = world.itemStars[i];
    if (stars <= 0) continue;
    const def = ITEMS[i];
    addStats(ACCUMULATED, def.stats, Math.min(stars, MAX_STARS));
    if (def.flags !== undefined) for (const flag of def.flags) FLAGS.add(flag);
    if (stars >= AWAKENED_STARS) {
      addStats(ACCUMULATED, def.awakenStats, 1);
      if (def.awakenFlags !== undefined) for (const flag of def.awakenFlags) FLAGS.add(flag);
    }
  }

  p.damageMult = 1 + (ACCUMULATED.damageMult ?? 0);
  p.cooldownMult = Math.max(0.25, 1 - (ACCUMULATED.cooldownMult ?? 0));
  p.aoeMult = 1 + (ACCUMULATED.aoeMult ?? 0);
  p.bonusPierce = Math.round(ACCUMULATED.pierce ?? 0);
  p.volleyCount = Math.max(1, 1 + Math.round(ACCUMULATED.volley ?? 0));
  p.moveSpeedMult = 1 + (ACCUMULATED.moveSpeedMult ?? 0);
  p.moveSpeed = cls.moveSpeed * p.moveSpeedMult;
  p.pickupMult = 1 + (ACCUMULATED.pickupMult ?? 0);
  p.moveHaste = ACCUMULATED.moveHaste ?? 0;
  p.damageReduction = Math.min(tuning.items.damageReductionCap, ACCUMULATED.damageReduction ?? 0);
  p.thorns = ACCUMULATED.thorns ?? 0;
  p.attackCooldownTicks = Math.max(1, Math.round(cls.cooldown * p.cooldownMult * 60));

  const previousMaxHp = p.maxHp;
  p.maxHp = cls.maxHp + Math.round(ACCUMULATED.maxHp ?? 0);
  if (p.maxHp > previousMaxHp) p.hp += p.maxHp - previousMaxHp;
  if (p.hp > p.maxHp) p.hp = p.maxHp;

  p.critChance = Math.min(1, ACCUMULATED.critChance ?? 0);
  p.critMult = 2 + (ACCUMULATED.critMult ?? 0);
  p.executeFrac = ACCUMULATED.executeFrac ?? 0;
  p.shieldMax = ACCUMULATED.shield ?? 0;
  if (p.shield > p.shieldMax) p.shield = p.shieldMax;
  p.shieldRegenTicks = Math.round((ACCUMULATED.shieldRegen ?? 0) * 60);
  p.knockback = ACCUMULATED.knockback ?? 0;
  p.onHitBurnDps = ACCUMULATED.burnDps ?? 0;
  p.onHitBurnTicks = Math.round((ACCUMULATED.burnSeconds ?? 0) * 60);
  p.xpMult = 1 + (ACCUMULATED.xpMult ?? 0);
  p.lifeOnKill = ACCUMULATED.lifeOnKill ?? 0;
  p.cooldownOnKillTicks = Math.round(ACCUMULATED.cooldownOnKill ?? 0);
  p.stillDamage = ACCUMULATED.stillDamage ?? 0;
  p.moveDamage = ACCUMULATED.moveDamage ?? 0;

  p.pierceAll = FLAGS.has('pierceAll');
  p.shatter = FLAGS.has('shatter');
  p.pierceBurst = FLAGS.has('pierceBurst');
  p.riposte = FLAGS.has('riposte');
  p.axeFirePool = FLAGS.has('axeFirePool');
  p.bombCluster = FLAGS.has('bombCluster');
  p.unlimitedPickup = FLAGS.has('unlimitedPickup');
  p.thornsDouble = FLAGS.has('thornsDouble');
  p.lifesteal = FLAGS.has('lifesteal');
  p.blink = FLAGS.has('blink');
  p.gemBlast = FLAGS.has('gemBlast');
  p.freezeShatter = FLAGS.has('freezeShatter');
  p.shieldReflect = FLAGS.has('shieldReflect');
  p.burnSpread = FLAGS.has('burnSpread');
  p.sprintInvuln = FLAGS.has('sprintInvuln');
  p.revivesLeft = FLAGS.has('revive') && !world.reviveUsed ? 1 : 0;
  p.invulnPulseTicks = FLAGS.has('invulnPulse')
    ? Math.round(tuning.items.invulnPulseSeconds * 60)
    : 0;

  p.auraDps = ACCUMULATED.auraDps ?? 0;
  p.auraRadius = (ACCUMULATED.auraRadius ?? 0) * p.aoeMult;
  p.auraSlow = 1 - (ACCUMULATED.auraSlow ?? 0);

  p.minionCount = Math.round(ACCUMULATED.minionCount ?? 0);
  p.minionDamage = ACCUMULATED.minionDamage ?? 0;

  const baseOrbiters = p.classId === CLASS_PRIEST ? 1 : 0;
  world.orbiterCount = Math.min(MAX_ORBITERS, baseOrbiters + Math.round(ACCUMULATED.orbiterCount ?? 0));
  p.orbiterDamage = weapons.orb.damage + (ACCUMULATED.orbiterDamage ?? 0);
  p.orbiterRadius = tuning.items.orbiterBaseRadius + (ACCUMULATED.orbiterRadius ?? 0);
  for (let i = 0; i < world.orbiterCount; i++) {
    const orbiter = world.orbiters[i];
    orbiter.radius = p.orbiterRadius;
    orbiter.damage = p.orbiterDamage * p.damageMult;
  }

  world.abilityCount = 0;
  p.recastAbility = -1;
  for (let i = 0; i < ITEMS.length; i++) {
    const stars = world.itemStars[i];
    if (stars <= 0) continue;
    const def = ITEMS[i];
    let ownIndex = -1;
    if (def.ability !== undefined) {
      ownIndex = writeAbility(world, def.ability, Math.min(stars, MAX_STARS) - 1, p.aoeMult);
    }
    if (stars >= AWAKENED_STARS && def.awakenAbility !== undefined) {
      const awakenIndex = writeAbility(world, def.awakenAbility, 0, p.aoeMult);
      if (ownIndex < 0) ownIndex = awakenIndex;
    }
    if (
      stars >= AWAKENED_STARS &&
      def.awakenFlags !== undefined &&
      def.awakenFlags.includes('recastOnKill') &&
      ownIndex >= 0
    ) {
      p.recastAbility = ownIndex;
    }
  }
}

export function grantItem(world: World, itemIndex: number): void {
  const stars = world.itemStars[itemIndex];
  if (stars >= AWAKENED_STARS) return;
  world.itemStars[itemIndex] = stars + 1;
  recomputePlayer(world);
}
