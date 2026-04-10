import OpenAI from "openai";

export type AIModel = "deepseek" | "groq" | "gemini" | "openai";

export interface AIConfig {
  model: AIModel;
  modelName: string;
  baseURL?: string;
  costPer1MInput: number;
  costPer1MOutput: number;
  freeTier?: {
    tokensPerMonth: number;
    rpm: number;
    requiresCreditCard: boolean;
  };
}

export const AI_MODELS: Record<AIModel, AIConfig> = {
  groq: {
    model: "groq",
    modelName: "llama-3.3-70b-versatile",
    baseURL: "https://api.groq.com/openai/v1",
    costPer1MInput: 0.18,
    costPer1MOutput: 0.18,
    freeTier: {
      tokensPerMonth: 1000 * 1000,
      rpm: 30,
      requiresCreditCard: false,
    },
  },
  deepseek: {
    model: "deepseek",
    modelName: "deepseek-chat",
    baseURL: "https://api.deepseek.com",
    costPer1MInput: 0.14,
    costPer1MOutput: 0.28,
    freeTier: {
      tokensPerMonth: 5_000_000,
      rpm: 60,
      requiresCreditCard: false,
    },
  },
  gemini: {
    model: "gemini",
    modelName: "gemini-2.0-flash",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    costPer1MInput: 0.10,
    costPer1MOutput: 0.40,
    freeTier: {
      tokensPerMonth: 1_000_000,
      rpm: 60,
      requiresCreditCard: false,
    },
  },
  openai: {
    model: "openai",
    modelName: "gpt-4o-mini",
    costPer1MInput: 0.15,
    costPer1MOutput: 0.60,
    freeTier: {
      tokensPerMonth: 100_000,
      rpm: 3,
      requiresCreditCard: false,
    },
  },
};

function getAPIKey(config: AIConfig): string | undefined {
  switch (config.model) {
    case "deepseek":
      return process.env.DEEPSEEK_API_KEY;
    case "groq":
      return process.env.GROQ_API_KEY;
    case "gemini":
      return process.env.GEMINI_API_KEY;
    case "openai":
      return process.env.OPENAI_API_KEY;
    default:
      return process.env.OPENAI_API_KEY;
  }
}

function createClient(config: AIConfig): OpenAI {
  const apiKey = getAPIKey(config);
  
  return new OpenAI({
    apiKey,
    baseURL: config.baseURL,
  });
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
  
  const client = createClient(config);

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
    preferFree?: boolean;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<{ text: string; model: AIModel }> {
  const orderedModels: AIModel[] = options.preferFree !== false
    ? ["groq", "deepseek", "gemini", "openai"]
    : ["openai", "groq", "deepseek", "gemini"];

  for (const model of orderedModels) {
    try {
      const config = AI_MODELS[model];
      const apiKey = getAPIKey(config);
      
      if (!apiKey) {
        continue;
      }

      const text = await generateWithAI(prompt, systemPrompt, {
        model,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      });

      if (text) {
        return { text, model };
      }
    } catch (error) {
      const errorStr = String(error);
      if (errorStr.includes("402") || errorStr.includes("Insufficient")) {
        console.warn(`${model} has insufficient balance, trying next...`);
        continue;
      }
      console.warn(`Failed with ${model}:`, error);
      continue;
    }
  }

  throw new Error("All AI providers failed");
}

export function getModelInfo(model: AIModel): AIConfig {
  return AI_MODELS[model];
}
