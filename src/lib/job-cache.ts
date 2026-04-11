type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type CacheStore = Map<string, CacheEntry<unknown>>;

declare global {
  var __careerosJobCache__: CacheStore | undefined;
}

function getStore(): CacheStore {
  if (!globalThis.__careerosJobCache__) {
    globalThis.__careerosJobCache__ = new Map<string, CacheEntry<unknown>>();
  }

  return globalThis.__careerosJobCache__;
}

function now(): number {
  return Date.now();
}

export function createCacheKey(
  namespace: string,
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const normalized = Object.entries(params)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("&");

  return normalized ? `${namespace}?${normalized}` : namespace;
}

export function getCachedValue<T>(key: string): T | null {
  const store = getStore();
  const entry = store.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= now()) {
    store.delete(key);
    return null;
  }

  return entry.value as T;
}

export function setCachedValue<T>(key: string, value: T, ttlMs: number): T {
  const store = getStore();
  const safeTtl = Math.max(0, ttlMs);

  store.set(key, {
    value,
    expiresAt: now() + safeTtl,
  });

  return value;
}

export function getOrSetCachedValue<T>(
  key: string,
  ttlMs: number,
  factory: () => Promise<T>,
): Promise<T> {
  const cached = getCachedValue<T>(key);

  if (cached !== null) {
    return Promise.resolve(cached);
  }

  return factory().then((value) => setCachedValue(key, value, ttlMs));
}

export function clearCachedValue(key: string): void {
  getStore().delete(key);
}

export function clearCacheByPrefix(prefix: string): void {
  const store = getStore();

  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

export function pruneExpiredCacheEntries(): void {
  const store = getStore();
  const currentTime = now();

  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= currentTime) {
      store.delete(key);
    }
  }
}
