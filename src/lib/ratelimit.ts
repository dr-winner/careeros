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
  default: { max: 100, window: "1 m" },
  strict: { max: 10, window: "1 m" },
} as const;

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
  ip?: string,
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const ratelimit = createRatelimit(identifier, config);

  if (!ratelimit) {
    return { success: true, remaining: 999, reset: 0 };
  }

  const key = ip || identifier;
  try {
    const result = await ratelimit.limit(key);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (err) {
    // Fail open: if Redis is unavailable, allow the request rather than blocking it
    console.error("Rate limit check failed (allowing request):", err);
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
