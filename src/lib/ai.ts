import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// ─── Provider clients ────────────────────────────────────────────────────────

function getOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getGroqClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

function getAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ─── Provider availability ────────────────────────────────────────────────────

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
      return { text, model: "gpt-4o-mini" };
    } catch (err) {
      console.warn("OpenAI failed, falling back to Groq:", (err as Error).message);
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
      return { text, model: "groq-llama-3.3-70b" };
    } catch (err) {
      console.warn("Groq failed:", (err as Error).message);
    }
  }

  throw new Error("No AI provider available");
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
      return { text, model: "claude-sonnet-4-6" };
    } catch (err) {
      console.warn("Claude Sonnet failed, falling back to GPT-4o:", (err as Error).message);
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
      return { text, model: "gpt-4o" };
    } catch (err) {
      console.warn("GPT-4o failed, falling back to Groq:", (err as Error).message);
    }
  }

  // ── Tier 3: Groq (last resort for premium) ───────────────────────────────
  return generateWithFallback(prompt, systemPrompt, { maxTokens, temperature, json });
}
