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
  const payload: unknown = rec.payload ?? null;
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
  const existing = await readSignalList(code);
  const next: InterviewSignal = {
    seq: nextSeq(existing),
    peerId: input.peerId,
    type: input.type,
    payload: input.payload,
    ts: Date.now(),
  };
  const signals = [...existing, next];
  while (signals.length > SIGNAL_MAX) signals.shift();
  await writeSignalList(code, signals);
  return next;
}

export async function listInterviewSignals(roomCode: string, afterSeq = 0): Promise<InterviewSignal[]> {
  const signals = await readSignalList(roomCode.toUpperCase());
  return signals.filter((item) => item.seq > afterSeq);
}

async function readSignalList(code: string): Promise<InterviewSignal[]> {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get<InterviewSignal[] | string>(redisKey(code));
      const parsed = parseSignalList(raw);
      if (parsed) return parsed;
    } catch (error) {
      console.error("Interview signal Redis read failed:", error);
    }
  }

  const bucket = memoryStore().get(code);
  if (!bucket || bucket.expiresAt <= Date.now()) return [];
  return bucket.signals.slice();
}

async function writeSignalList(code: string, signals: InterviewSignal[]): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(redisKey(code), signals, { ex: SIGNAL_TTL_SEC });
      return;
    } catch (error) {
      console.error("Interview signal Redis write failed:", error);
    }
  }
  memoryStore().set(code, { signals, expiresAt: Date.now() + SIGNAL_TTL_SEC * 1000 });
}

function parseSignalList(raw: unknown): InterviewSignal[] | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return parseSignalList(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  if (!Array.isArray(raw)) return null;
  return raw.map(asSignal).filter((item): item is InterviewSignal => item != null);
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
