import { Ratelimit, Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { hasUpstashRedisConfigured, getUpstashRedisConfig } from "./env";

const ratelimitCache = new Map<string, Ratelimit>();

function formatWindow(window: string): Duration {
  const match = window.match(/^(\d+)\s*([smhd])$/);
  if (!match) {
    return "60 s";
  }
  const value = match[1];
  const unit = match[2] as "s" | "m" | "h" | "d";
  return `${value} ${unit}` as Duration;
}

function createRatelimit(
  identifier: string,
  options: {
    max: number;
    window: string;
  },
): Ratelimit | null {
  if (!hasUpstashRedisConfigured()) {
    return null;
  }

  const cacheKey = `${identifier}-${options.max}-${options.window}`;

  if (ratelimitCache.has(cacheKey)) {
    return ratelimitCache.get(cacheKey)!;
  }

  const config = getUpstashRedisConfig();
  const redis = new Redis({
    url: config.url!,
    token: config.token!,
  });

  const formattedWindow = formatWindow(options.window);

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(options.max, formattedWindow),
    analytics: true,
    prefix: `ratelimit:${identifier}`,
  });

  ratelimitCache.set(cacheKey, ratelimit);
  return ratelimit;
}

export type RateLimitConfig = {
  max: number;
  window: string;
};

export const RATE_LIMITS = {
  jobs: { max: 30, window: "1 m" },
  ai: { max: 10, window: "1 m" },
  upload: { max: 5, window: "1 m" },
  payment: { max: 5, window: "1 m" },
  preview: { max: 5, window: "1 h" },
  default: { max: 100, window: "1 m" },
  strict: { max: 10, window: "1 m" },
} as const;

// In-memory fixed-window fallback for when Redis is unavailable. Scoped
// per serverless instance, so it's weaker than Upstash (each warm lambda
// counts separately) — but for fail-closed money endpoints it keeps a
// real cap in place instead of denying every legitimate payment.
const memoryWindows = new Map<string, { count: number; resetAt: number }>();
const MEMORY_MAP_MAX = 10_000;

function memoryLimit(
  bucket: string,
  max: number,
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const windowMs = 60_000;

  if (memoryWindows.size > MEMORY_MAP_MAX) memoryWindows.clear();

  const entry = memoryWindows.get(bucket);
  if (!entry || entry.resetAt <= now) {
    memoryWindows.set(bucket, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: max - 1, reset: now + windowMs };
  }

  entry.count++;
  return {
    success: entry.count <= max,
    remaining: Math.max(0, max - entry.count),
    reset: entry.resetAt,
  };
}

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
  key?: string,
  options: { failClosed?: boolean } = {},
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const ratelimit = createRatelimit(identifier, config);

  // failClosed endpoints (USSD prompts, transfers, payment links) must
  // never run unmetered: when Redis is unavailable they fall back to the
  // per-instance in-memory limiter. Read paths keep failing open so a
  // Redis outage doesn't take the app down.
  if (!ratelimit) {
    if (options.failClosed) {
      return memoryLimit(`${identifier}:${key || "anon"}`, config.max);
    }
    return { success: true, remaining: 999, reset: 0 };
  }

  try {
    const result = await ratelimit.limit(key || identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (err) {
    console.error(`Rate limit check failed for ${identifier}:`, err);
    if (options.failClosed) {
      return memoryLimit(`${identifier}:${key || "anon"}`, config.max);
    }
    return { success: true, remaining: 999, reset: 0 };
  }
}

export function getRateLimitHeaders(result: { success: boolean; remaining: number; reset: number }): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
    "X-RateLimit-Limit": "100",
    ...(result.success ? {} : { "Retry-After": "60" }),
  };
}
