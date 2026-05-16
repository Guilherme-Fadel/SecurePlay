
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_STALE_TIME = 60_000;

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  return entry.data as T;
}

export function isStale(key: string, staleTime = DEFAULT_STALE_TIME): boolean {
  const entry = cache.get(key);
  if (!entry) return true;
  return Date.now() - entry.timestamp > staleTime;
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function invalidate(key: string): void {
  cache.delete(key);
}

export function invalidateAll(): void {
  cache.clear();
}
