import { Redis } from "@upstash/redis";
import { hasUpstashRedisConfigured, getUpstashRedisConfig } from "./env";

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (!hasUpstashRedisConfigured()) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  const config = getUpstashRedisConfig();
  redisClient = new Redis({
    url: config.url!,
    token: config.token!,
  });

  return redisClient;
}

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type LocalCacheStore = Map<string, CacheEntry<unknown>>;

declare global {
  var __careerosLocalJobCache__: LocalCacheStore | undefined;
}

function getLocalStore(): LocalCacheStore {
  if (!globalThis.__careerosLocalJobCache__) {
    globalThis.__careerosLocalJobCache__ = new Map<string, CacheEntry<unknown>>();
  }

  return globalThis.__careerosLocalJobCache__;
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

async function getRedisValue<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();

  if (!redis) {
    return null;
  }

  try {
    const entry = await redis.get<CacheEntry<T>>(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= now()) {
      await redis.del(key);
      return null;
    }

    return entry.value;
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

async function setRedisValue<T>(key: string, value: T, ttlMs: number): Promise<T> {
  const redis = getRedisClient();

  if (!redis) {
    return value;
  }

  try {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: now() + ttlMs,
    };

    await redis.set(key, entry, { px: ttlMs });
  } catch (error) {
    console.error("Redis set error:", error);
  }

  return value;
}

export function getCachedValue<T>(key: string): T | null {
  const store = getLocalStore();
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
  const store = getLocalStore();
  const safeTtl = Math.max(0, ttlMs);

  store.set(key, {
    value,
    expiresAt: now() + safeTtl,
  });

  setRedisValue(key, value, ttlMs).catch(() => {});

  return value;
}

export async function getOrSetCachedValue<T>(
  key: string,
  ttlMs: number,
  factory: () => Promise<T>,
): Promise<T> {
  const redisCached = await getRedisValue<T>(key);

  if (redisCached !== null) {
    setCachedValue(key, redisCached, ttlMs);
    return redisCached;
  }

  const localCached = getCachedValue<T>(key);

  if (localCached !== null) {
    return localCached;
  }

  const value = await factory();

  setCachedValue(key, value, ttlMs);

  return value;
}

export function clearCachedValue(key: string): void {
  getLocalStore().delete(key);

  const redis = getRedisClient();

  if (redis) {
    redis.del(key).catch(() => {});
  }
}

export function clearCacheByPrefix(prefix: string): void {
  const store = getLocalStore();

  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

export function pruneExpiredCacheEntries(): void {
  const store = getLocalStore();
  const currentTime = now();

  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= currentTime) {
      store.delete(key);
    }
  }
}
