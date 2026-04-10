import OpenAI from "openai";

export type AIModel = "deepseek" | "openai" | "gemini";

export interface AIConfig {
  model: AIModel;
  provider: "deepseek" | "openai" | "google";
  modelName: string;
  costPer1MInput: number;
  costPer1MOutput: number;
}

export const AI_MODELS: Record<AIModel, AIConfig> = {
  deepseek: {
    model: "deepseek",
    provider: "deepseek",
    modelName: "deepseek-chat",
    costPer1MInput: 0.14,
    costPer1MOutput: 0.28,
  },
  openai: {
    model: "openai",
    provider: "openai",
    modelName: "gpt-4o-mini",
    costPer1MInput: 0.15,
    costPer1MOutput: 0.60,
  },
  gemini: {
    model: "gemini",
    provider: "google",
    modelName: "gemini-2.0-flash",
    costPer1MInput: 0.10,
    costPer1MOutput: 0.40,
  },
};

function getClient(config: AIConfig): OpenAI {
  switch (config.provider) {
    case "deepseek":
      return new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
        baseURL: "https://api.deepseek.com",
      });
    case "google":
      return new OpenAI({
        apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
      });
    default:
      return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
  }
}

export async function generateWithAI(
  prompt: string,
  systemPrompt: string,
  options: {
    model?: AIModel;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<string> {
  const model = options.model || "deepseek";
  const config = AI_MODELS[model];
  const client = getClient(config);

  const completion = await client.chat.completions.create({
    model: config.modelName,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    max_tokens: options.maxTokens || 800,
    temperature: options.temperature || 0.7,
  });

  return completion.choices[0]?.message?.content || "";
}

export async function generateWithFallback(
  prompt: string,
  systemPrompt: string,
  options: {
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<{ text: string; model: AIModel }> {
  const models: AIModel[] = ["deepseek", "openai", "gemini"];
  
  for (const model of models) {
    try {
      const text = await generateWithAI(prompt, systemPrompt, {
        model,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      });
      
      if (text) {
        return { text, model };
      }
    } catch (error) {
      console.warn(`Failed with ${model}:`, error);
      continue;
    }
  }
  
  throw new Error("All AI providers failed");
}
