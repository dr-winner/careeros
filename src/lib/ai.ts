import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/nextjs";
import { clearCachedValue, readCachedValue, setCachedValue } from "./job-cache";

// ─── Provider clients ────────────────────────────────────────────────────────
//
// Every call gets a hard timeout and a single retry. Without these a hung
// provider kept users staring at typing dots for 35s+ before a generic
// "Failed" toast (seen live on the mock interview).

const REQUEST_TIMEOUT_MS = 25_000;

function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 1,
  });
}

function getGroqClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 1,
  });
}

function getAnthropicClient(): Anthropic {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 1,
  });
}

// ─── Outage tracking ─────────────────────────────────────────────────────────
//
// When every provider fails we record why, shared across instances via the
// cache layer, so /api/ai/status can tell the UI (and the founder) the truth
// instead of each feature failing in its own silent way.

export const AI_OUTAGE_CACHE_KEY = "ai:outage";
const AI_OUTAGE_TTL_MS = 10 * 60 * 1000;

export type AiOutageRecord = {
  at: string;
  reasons: string[];
};

export class AiUnavailableError extends Error {
  readonly reasons: string[];

  constructor(reasons: string[]) {
    super(
      reasons.length
        ? `No AI provider available: ${reasons.join(" | ")}`
        : "No AI provider available: no provider API key is configured",
    );
    this.name = "AiUnavailableError";
    this.reasons = reasons;
  }
}

let outageRecordedLocally = false;

function describeProviderError(provider: string, err: unknown): string {
  const e = err as { status?: number; code?: string; message?: string };
  const status = e?.status ? ` ${e.status}` : "";
  const code = e?.code ? ` ${e.code}` : "";
  const message = (e?.message || String(err)).replace(/\s+/g, " ").slice(0, 160);
  return `${provider}${status}${code}: ${message}`;
}

function recordOutage(reasons: string[]): void {
  outageRecordedLocally = true;
  const record: AiOutageRecord = { at: new Date().toISOString(), reasons };
  setCachedValue(AI_OUTAGE_CACHE_KEY, record, AI_OUTAGE_TTL_MS);
  Sentry.captureException(new AiUnavailableError(reasons), {
    level: "error",
    tags: { area: "ai", providers_tried: String(reasons.length) },
  });
}

function recordSuccess(): void {
  if (!outageRecordedLocally) return;
  outageRecordedLocally = false;
  clearCachedValue(AI_OUTAGE_CACHE_KEY);
}

export async function getAiOutage(): Promise<AiOutageRecord | null> {
  return readCachedValue<AiOutageRecord>(AI_OUTAGE_CACHE_KEY);
}

// ─── Standard generation (OpenAI → Groq fallback) ────────────────────────────
//
// Used for: job fit analysis, CV advice, skill extraction, interview questions.
// GPT-4o-mini with native JSON mode eliminates all parsing fragility.
// Falls back to Groq (Llama 3.3 70B) if OpenAI is unavailable.

export async function generateWithFallback(
  prompt: string,
  systemPrompt: string,
  options: {
    maxTokens?: number;
    temperature?: number;
    json?: boolean; // enforce JSON output (default true)
  } = {},
): Promise<{ text: string; model: string }> {
  const wantJson = options.json !== false;
  const maxTokens = options.maxTokens || 800;
  const temperature = options.temperature ?? 0.3;
  const reasons: string[] = [];

  // ── Tier 1: OpenAI GPT-4o-mini ──────────────────────────────────────────
  if (process.env.OPENAI_API_KEY) {
    try {
      const client = getOpenAIClient();
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_tokens: maxTokens,
        temperature,
        ...(wantJson && { response_format: { type: "json_object" } }),
      });
      const text = completion.choices[0]?.message?.content || "";
      recordSuccess();
      return { text, model: "gpt-4o-mini" };
    } catch (err) {
      const reason = describeProviderError("openai", err);
      reasons.push(reason);
      console.warn("OpenAI failed, falling back to Groq:", reason);
    }
  }

  // ── Tier 2: Groq Llama 3.3 70B ──────────────────────────────────────────
  if (process.env.GROQ_API_KEY) {
    try {
      const client = getGroqClient();
      const completion = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_tokens: maxTokens,
        temperature,
      });
      const text = completion.choices[0]?.message?.content || "";
      recordSuccess();
      return { text, model: "groq-llama-3.3-70b" };
    } catch (err) {
      const reason = describeProviderError("groq", err);
      reasons.push(reason);
      console.warn("Groq failed:", reason);
    }
  }

  recordOutage(reasons);
  throw new AiUnavailableError(reasons);
}

// ─── Premium generation (Claude Sonnet) ──────────────────────────────────────
//
// Used for: CV regeneration, premium job analysis.
// Claude Sonnet gives the most nuanced, honest career advice and is far less
// likely to hallucinate match scores or generic platitudes.

export async function generatePremium(
  prompt: string,
  systemPrompt: string,
  options: {
    maxTokens?: number;
    temperature?: number;
    json?: boolean;
  } = {},
): Promise<{ text: string; model: string }> {
  const maxTokens = options.maxTokens || 2000;
  const temperature = options.temperature ?? 0.4;
  const json = options.json ?? false;

  // ── Tier 1: Claude Sonnet ────────────────────────────────────────────────
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = getAnthropicClient();
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      });
      const text =
        message.content[0]?.type === "text" ? message.content[0].text : "";
      recordSuccess();
      return { text, model: "claude-sonnet-4-6" };
    } catch (err) {
      console.warn("Claude Sonnet failed, falling back to GPT-4o:", describeProviderError("anthropic", err));
    }
  }

  // ── Tier 2: OpenAI GPT-4o (premium fallback) ────────────────────────────
  if (process.env.OPENAI_API_KEY) {
    try {
      const client = getOpenAIClient();
      const completion = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_tokens: maxTokens,
        temperature,
        ...(json ? { response_format: { type: "json_object" as const } } : {}),
      });
      const text = completion.choices[0]?.message?.content || "";
      recordSuccess();
      return { text, model: "gpt-4o" };
    } catch (err) {
      console.warn("GPT-4o failed, falling back to Groq:", describeProviderError("openai", err));
    }
  }

  // ── Tier 3: Groq (last resort for premium) ───────────────────────────────
  return generateWithFallback(prompt, systemPrompt, { maxTokens, temperature, json });
}
