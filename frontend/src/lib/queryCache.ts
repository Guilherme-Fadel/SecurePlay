
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const listeners = new Map<string, Set<() => void>>();

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
  notifyListeners(key);
}

export function invalidate(key: string): void {
  cache.delete(key);
  notifyListeners(key);
}

export function invalidateAll(): void {
  const keys = [...cache.keys()];
  cache.clear();
  keys.forEach(notifyListeners);
}

export function subscribe(key: string, callback: () => void): () => void {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key)!.add(callback);
  return () => {
    listeners.get(key)?.delete(callback);
  };
}

function notifyListeners(key: string): void {
  listeners.get(key)?.forEach((cb) => cb());
}
