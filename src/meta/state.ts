import tuning from '../game/data/tuning.json' with { type: 'json' };
import { AWAKENED_STARS } from '../game/kinds.ts';
import { createRng, nextInt } from '../game/rng.ts';
import { GENERAL_PRESET, ITEMS, PRESETS } from '../game/systems/items.ts';
import mapData from './data/maps.json' with { type: 'json' };
import economy from './data/meta.json' with { type: 'json' };
import shopData from './data/shop.json' with { type: 'json' };

export type MapDef = (typeof mapData)[number];
export type ShopProduct = (typeof shopData)[number];

export const MAPS: MapDef[] = mapData;
export const SHOP: ShopProduct[] = shopData;
export const EQUIP_SLOTS = tuning.items.totalSlots;

export type MetaState = {
  coins: number;
  gems: number;
  owned: Record<string, number>;
  equipped: Record<string, string[]>;
  classId: number;
  presetId: number;
  mapId: number;
  clears: number;
  rolls: number;
  idleSinceMs: number;
};

export function createMeta(nowMs: number): MetaState {
  const state: MetaState = {
    coins: economy.startingCoins,
    gems: economy.startingGems,
    owned: {},
    equipped: {},
    classId: 0,
    presetId: 0,
    mapId: 0,
    clears: 0,
    rolls: 0,
    idleSinceMs: nowMs,
  };
  for (const item of ITEMS) {
    if (item.preset === PRESETS[0].id) grantGear(state, item.id);
  }
  return state;
}

export function itemsForPreset(presetId: number): number[] {
  const list: number[] = [];
  const presetKey = PRESETS[presetId].id;
  for (let i = 0; i < ITEMS.length; i++) {
    if (ITEMS[i].preset === presetKey) list.push(i);
  }
  for (let i = 0; i < ITEMS.length; i++) {
    if (ITEMS[i].preset === GENERAL_PRESET) list.push(i);
  }
  return list;
}

export function ownedStars(state: MetaState, itemId: string): number {
  return state.owned[itemId] ?? 0;
}

export function grantGear(state: MetaState, itemId: string): boolean {
  const stars = ownedStars(state, itemId);
  if (stars >= AWAKENED_STARS) {
    state.coins += economy.gachaDuplicateCoins;
    return false;
  }
  state.owned[itemId] = stars + 1;
  return true;
}

export function idlePending(state: MetaState, nowMs: number): number {
  const minutes = Math.max(0, (nowMs - state.idleSinceMs) / 60000);
  const capped = Math.min(minutes, economy.idleCapMinutes);
  return Math.floor(capped * economy.idleCoinsPerMinute);
}

export function idleFraction(state: MetaState, nowMs: number): number {
  const minutes = Math.max(0, (nowMs - state.idleSinceMs) / 60000);
  return Math.min(1, minutes / economy.idleCapMinutes);
}

export function claimIdle(state: MetaState, nowMs: number): number {
  const coins = idlePending(state, nowMs);
  state.coins += coins;
  state.idleSinceMs = nowMs;
  return coins;
}

export function gachaCost(count: number): number {
  return count >= 10 ? economy.gachaTenCost : economy.gachaSingleCost * count;
}

export function rollGacha(state: MetaState, count: number): string[] {
  const cost = gachaCost(count);
  const rolled: string[] = [];
  if (state.gems < cost) return rolled;
  state.gems -= cost;
  for (let i = 0; i < count; i++) {
    const rng = createRng((state.rolls + 1) * 2654435761);
    state.rolls++;
    const item = ITEMS[nextInt(rng, 0, ITEMS.length)];
    grantGear(state, item.id);
    rolled.push(item.id);
  }
  return rolled;
}

export function upgradeCost(stars: number): number {
  return economy.upgradeCostBase + economy.upgradeCostPerStar * Math.max(0, stars - 1);
}

export function canUpgrade(state: MetaState, itemId: string): boolean {
  const stars = ownedStars(state, itemId);
  if (stars === 0 || stars >= AWAKENED_STARS) return false;
  return state.coins >= upgradeCost(stars);
}

export function upgradeGear(state: MetaState, itemId: string): boolean {
  if (!canUpgrade(state, itemId)) return false;
  state.coins -= upgradeCost(ownedStars(state, itemId));
  state.owned[itemId] = ownedStars(state, itemId) + 1;
  return true;
}

export function equippedFor(state: MetaState, presetId: number): string[] {
  const key = PRESETS[presetId].id;
  const stored = state.equipped[key];
  if (stored !== undefined) return stored;
  const auto: string[] = [];
  for (const index of itemsForPreset(presetId)) {
    if (auto.length >= EQUIP_SLOTS) break;
    if (ownedStars(state, ITEMS[index].id) > 0) auto.push(ITEMS[index].id);
  }
  state.equipped[key] = auto;
  return auto;
}

export function toggleEquip(state: MetaState, presetId: number, itemId: string): void {
  if (ownedStars(state, itemId) === 0) return;
  const key = PRESETS[presetId].id;
  const current = equippedFor(state, presetId).slice();
  const at = current.indexOf(itemId);
  if (at >= 0) current.splice(at, 1);
  else if (current.length < EQUIP_SLOTS) current.push(itemId);
  else return;
  state.equipped[key] = current;
}

export function startingStars(state: MetaState, presetId: number): Record<string, number> {
  const stars: Record<string, number> = {};
  for (const itemId of equippedFor(state, presetId)) {
    stars[itemId] = ownedStars(state, itemId);
  }
  return stars;
}

export function mapUnlocked(state: MetaState, mapId: number): boolean {
  return state.clears >= MAPS[mapId].clearsToUnlock;
}

export function awardRun(
  state: MetaState,
  seconds: number,
  level: number,
  mapId: number,
  won: boolean,
): number {
  const map = MAPS[mapId];
  const base =
    seconds * economy.runCoinsPerSecond +
    level * economy.runCoinsPerLevel +
    (won ? economy.runCoinsOnWin : 0);
  const coins = Math.floor(base * map.rewardMult);
  state.coins += coins;
  if (won && state.clears < mapId + 1) state.clears = mapId + 1;
  return coins;
}

export function buyProduct(state: MetaState, productId: string): boolean {
  const product = SHOP.find((entry) => entry.id === productId);
  if (product === undefined) return false;
  if (product.currency === 'iap') return false;
  const price = product.priceGems ?? 0;
  if (state.gems < price) return false;
  state.gems -= price;
  state.coins += product.coins;
  state.gems += product.gems;
  return true;
}
