import OpenAI from "openai";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";

function getGroqClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: GROQ_BASE_URL,
  });
}

export async function generateWithFallback(
  prompt: string,
  systemPrompt: string,
  options: {
    maxTokens?: number;
    temperature?: number;
    preferFree?: boolean; // kept for call-site compatibility, ignored
  } = {},
): Promise<{ text: string; model: string }> {
  const client = getGroqClient();

  const completion = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    max_tokens: options.maxTokens || 800,
    temperature: options.temperature ?? 0.7,
  });

  const text = completion.choices[0]?.message?.content || "";
  return { text, model: "groq" };
}
