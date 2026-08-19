import { useEffect, useState, useSyncExternalStore } from 'react';
import { getMeta, getMetaVersion, subscribeMeta } from '../meta/store.ts';
import type { MetaState } from '../meta/state.ts';

export function useMeta(): MetaState {
  useSyncExternalStore(subscribeMeta, getMetaVersion, getMetaVersion);
  return getMeta();
}

export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
