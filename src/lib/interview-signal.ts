import { Redis } from "@upstash/redis";
import { getUpstashRedisConfig, hasUpstashRedisConfigured } from "./env";

export const SIGNAL_TYPES = ["hello", "offer", "answer", "ice", "bye"] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

export type InterviewSignal = {
  seq: number;
  peerId: string;
  type: SignalType;
  payload: unknown;
  ts: number;
};

const SIGNAL_TTL_SEC = 60 * 60 * 2;
const SIGNAL_MAX = 250;
const PAYLOAD_MAX_CHARS = 12_000;

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (!hasUpstashRedisConfigured()) return null;
  if (redisClient) return redisClient;
  const config = getUpstashRedisConfig();
  redisClient = new Redis({ url: config.url!, token: config.token! });
  return redisClient;
}

type MemoryBucket = { signals: InterviewSignal[]; expiresAt: number };

declare global {
  var __careerosInterviewSignals__: Map<string, MemoryBucket> | undefined;
}

function memoryStore(): Map<string, MemoryBucket> {
  if (!globalThis.__careerosInterviewSignals__) {
    globalThis.__careerosInterviewSignals__ = new Map();
  }
  return globalThis.__careerosInterviewSignals__;
}

function redisKey(roomCode: string): string {
  return `interview:sig:${roomCode.toUpperCase()}`;
}

export function isSignalType(value: string): value is SignalType {
  return (SIGNAL_TYPES as readonly string[]).includes(value);
}

export function shouldCreateOffer(myPeerId: string, theirPeerId: string): boolean {
  return myPeerId > theirPeerId;
}

export function parseIncomingSignal(body: unknown): { peerId: string; type: SignalType; payload: unknown } | null {
  if (!body || typeof body !== "object") return null;
  const rec = body as Record<string, unknown>;
  const peerId = typeof rec.peerId === "string" ? rec.peerId.trim() : "";
  const type = typeof rec.type === "string" ? rec.type.trim() : "";
  if (!peerId || peerId.length > 80) return null;
  if (!isSignalType(type)) return null;
  let payload: unknown = rec.payload ?? null;
  try {
    const encoded = JSON.stringify(payload);
    if (encoded.length > PAYLOAD_MAX_CHARS) return null;
  } catch {
    return null;
  }
  return { peerId, type, payload };
}

function nextSeq(signals: InterviewSignal[]): number {
  return (signals[signals.length - 1]?.seq ?? 0) + 1;
}

export async function appendInterviewSignal(
  roomCode: string,
  input: { peerId: string; type: SignalType; payload: unknown },
): Promise<InterviewSignal> {
  const code = roomCode.toUpperCase();
  const redis = getRedis();
  if (redis) {
    try {
      const key = redisKey(code);
      const lastRaw = await redis.lindex<string>(key, -1);
      const last =
        typeof lastRaw === "string" ? safeParseSignal(lastRaw) : asSignal(lastRaw);
      const next: InterviewSignal = {
        seq: nextSeq(last ? [last] : []),
        peerId: input.peerId,
        type: input.type,
        payload: input.payload,
        ts: Date.now(),
      };
      await redis.rpush(key, JSON.stringify(next));
      await redis.expire(key, SIGNAL_TTL_SEC);
      const len = await redis.llen(key);
      if (typeof len === "number" && len > SIGNAL_MAX) {
        await redis.ltrim(key, len - SIGNAL_MAX, -1);
      }
      return next;
    } catch (error) {
      console.error("Interview signal Redis append failed:", error);
    }
  }

  const store = memoryStore();
  const bucket = store.get(code);
  const signals = bucket && bucket.expiresAt > Date.now() ? bucket.signals.slice() : [];
  const next: InterviewSignal = {
    seq: nextSeq(signals),
    peerId: input.peerId,
    type: input.type,
    payload: input.payload,
    ts: Date.now(),
  };
  signals.push(next);
  while (signals.length > SIGNAL_MAX) signals.shift();
  store.set(code, { signals, expiresAt: Date.now() + SIGNAL_TTL_SEC * 1000 });
  return next;
}

export async function listInterviewSignals(roomCode: string, afterSeq = 0): Promise<InterviewSignal[]> {
  const code = roomCode.toUpperCase();
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.lrange<string>(redisKey(code), 0, -1);
      const parsed = (raw || [])
        .map((item) => (typeof item === "string" ? safeParseSignal(item) : asSignal(item)))
        .filter((item): item is InterviewSignal => item != null);
      return parsed.filter((item) => item.seq > afterSeq);
    } catch (error) {
      console.error("Interview signal Redis read failed:", error);
    }
  }

  const bucket = memoryStore().get(code);
  if (!bucket || bucket.expiresAt <= Date.now()) return [];
  return bucket.signals.filter((item) => item.seq > afterSeq);
}

function safeParseSignal(raw: string): InterviewSignal | null {
  try {
    return asSignal(JSON.parse(raw));
  } catch {
    return null;
  }
}

function asSignal(value: unknown): InterviewSignal | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.seq !== "number" || typeof rec.peerId !== "string" || !isSignalType(String(rec.type))) {
    return null;
  }
  return {
    seq: rec.seq,
    peerId: rec.peerId,
    type: rec.type as SignalType,
    payload: rec.payload,
    ts: typeof rec.ts === "number" ? rec.ts : Date.now(),
  };
}
