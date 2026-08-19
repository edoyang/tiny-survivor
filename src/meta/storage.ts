type WebStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const host = globalThis as { localStorage?: WebStorage };

export function loadRaw(key: string): string | null {
  const storage = host.localStorage;
  if (storage === undefined) return null;
  return storage.getItem(key);
}

export function saveRaw(key: string, value: string): void {
  const storage = host.localStorage;
  if (storage === undefined) return;
  storage.setItem(key, value);
}
