import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./ratelimit";

// Upstash env vars are absent in the test environment, so these exercise
// the no-Redis paths — the exact situation production hit when the
// Upstash database was deleted.
describe("checkRateLimit without Redis", () => {
  it("fails open for normal endpoints", async () => {
    const result = await checkRateLimit("test-open", { max: 2, window: "1 m" }, "user1");
    expect(result.success).toBe(true);
  });

  it("failClosed endpoints still allow requests within the in-memory cap", async () => {
    const key = `user-${Date.now()}`;
    const first = await checkRateLimit("test-closed", { max: 3, window: "1 m" }, key, { failClosed: true });
    expect(first.success).toBe(true);
    expect(first.remaining).toBe(2);
  });

  it("failClosed endpoints deny once the in-memory cap is exceeded", async () => {
    const key = `burst-${Date.now()}`;
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(await checkRateLimit("test-burst", { max: 3, window: "1 m" }, key, { failClosed: true }));
    }
    expect(results.slice(0, 3).every((r) => r.success)).toBe(true);
    expect(results[3].success).toBe(false);
    expect(results[4].success).toBe(false);
  });

  it("keys are isolated from each other", async () => {
    const a = `iso-a-${Date.now()}`;
    const b = `iso-b-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      await checkRateLimit("test-iso", { max: 3, window: "1 m" }, a, { failClosed: true });
    }
    const blocked = await checkRateLimit("test-iso", { max: 3, window: "1 m" }, a, { failClosed: true });
    const fresh = await checkRateLimit("test-iso", { max: 3, window: "1 m" }, b, { failClosed: true });
    expect(blocked.success).toBe(false);
    expect(fresh.success).toBe(true);
  });
});
