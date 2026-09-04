import { describe, expect, it } from "vitest";
import { extractJsonObject, groqMaxCompletionTokens, GROQ_REASONING_TOKEN_FLOOR } from "./ai";

describe("groqMaxCompletionTokens", () => {
  it("raises short JSON budgets so GPT-OSS can finish after reasoning", () => {
    expect(groqMaxCompletionTokens(350)).toBe(GROQ_REASONING_TOKEN_FLOOR);
    expect(groqMaxCompletionTokens(600)).toBe(GROQ_REASONING_TOKEN_FLOOR);
  });

  it("keeps larger caller budgets", () => {
    expect(groqMaxCompletionTokens(2000)).toBe(2000);
  });
});

describe("extractJsonObject", () => {
  it("returns null for empty or reasoning-only content", () => {
    expect(extractJsonObject("")).toBeNull();
    expect(extractJsonObject("   ")).toBeNull();
    expect(extractJsonObject("<think>spent the whole budget</think>")).toBeNull();
  });

  it("parses raw JSON and fenced JSON", () => {
    expect(extractJsonObject('{"fitScore": 62, "verdict": "Stretch Role"}')).toMatchObject({
      fitScore: 62,
      verdict: "Stretch Role",
    });
    expect(extractJsonObject('```json\n{"fitScore": 80}\n```')).toMatchObject({ fitScore: 80 });
  });

  it("strips think tags and surrounding prose", () => {
    const text = `<think>{"decoy": true}</think>\nHere you go:\n{"fitScore": 41, "matchedSkills": ["Linux"]}\n`;
    expect(extractJsonObject(text)).toMatchObject({
      fitScore: 41,
      matchedSkills: ["Linux"],
    });
  });

  it("rejects truncated objects instead of throwing", () => {
    expect(extractJsonObject('{"fitScore": 50, "verdict": "Partial')).toBeNull();
  });
});
