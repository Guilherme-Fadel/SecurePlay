
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const listeners = new Map<string, Set<() => void>>();
const inFlight = new Map<string, Promise<unknown>>();
const keyGenerations = new Map<string, number>();
let cacheGeneration = 0;

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

export function fetchCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const requestCacheGeneration = cacheGeneration;
  const requestKeyGeneration = keyGenerations.get(key) ?? 0;
  const request = fetcher()
    .then((data) => {
      if (
        requestCacheGeneration === cacheGeneration
        && requestKeyGeneration === (keyGenerations.get(key) ?? 0)
      ) {
        setCache(key, data);
      }
      return data;
    })
    .finally(() => {
      if (inFlight.get(key) === request) {
        inFlight.delete(key);
      }
    });

  inFlight.set(key, request);
  return request;
}

export function invalidate(key: string): void {
  cache.delete(key);
  inFlight.delete(key);
  keyGenerations.set(key, (keyGenerations.get(key) ?? 0) + 1);
  notifyListeners(key);
}

export function clearQueryCache(): void {
  cacheGeneration += 1;
  cache.clear();
  inFlight.clear();
  keyGenerations.clear();
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
