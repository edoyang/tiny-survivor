import { createMeta, type MetaState } from './state.ts';
import { loadRaw, saveRaw } from './storage.ts';

const STORAGE_KEY = 'tiny-survivors-meta-v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArrayMap(value: unknown): value is Record<string, string[]> {
  if (!isRecord(value)) return false;
  return Object.values(value).every(
    (entry) => Array.isArray(entry) && entry.every((id) => typeof id === 'string'),
  );
}

function isNumberMap(value: unknown): value is Record<string, number> {
  if (!isRecord(value)) return false;
  return Object.values(value).every((entry) => typeof entry === 'number');
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseMeta(raw: string, nowMs: number): MetaState {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) return createMeta(nowMs);
  const coins = num(parsed.coins);
  const gems = num(parsed.gems);
  const classId = num(parsed.classId);
  const presetId = num(parsed.presetId);
  const mapId = num(parsed.mapId);
  const clears = num(parsed.clears);
  const rolls = num(parsed.rolls);
  const idleSinceMs = num(parsed.idleSinceMs);
  if (
    coins === null ||
    gems === null ||
    classId === null ||
    presetId === null ||
    mapId === null ||
    clears === null ||
    rolls === null ||
    idleSinceMs === null ||
    !isNumberMap(parsed.owned) ||
    !isStringArrayMap(parsed.equipped)
  ) {
    return createMeta(nowMs);
  }
  return {
    coins,
    gems,
    owned: parsed.owned,
    equipped: parsed.equipped,
    classId,
    presetId,
    mapId,
    clears,
    rolls,
    idleSinceMs,
  };
}

function initial(): MetaState {
  const raw = loadRaw(STORAGE_KEY);
  const now = Date.now();
  if (raw === null) return createMeta(now);
  return parseMeta(raw, now);
}

let state = initial();
let version = 0;
const listeners = new Set<() => void>();

export function getMeta(): MetaState {
  return state;
}

export function getMetaVersion(): number {
  return version;
}

export function subscribeMeta(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function updateMeta<T>(change: (draft: MetaState) => T): T {
  const result = change(state);
  version++;
  saveRaw(STORAGE_KEY, JSON.stringify(state));
  for (const listener of listeners) listener();
  return result;
}

export function resetMeta(): void {
  state = createMeta(Date.now());
  updateMeta(() => undefined);
}
