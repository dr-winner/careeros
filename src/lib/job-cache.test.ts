import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearCacheByPrefix,
  clearCachedValue,
  createCacheKey,
  getCachedValue,
  getOrSetCachedValue,
  pruneExpiredCacheEntries,
  setCachedValue,
} from "./job-cache";

describe("job cache helper", () => {
  beforeEach(() => {
    clearCacheByPrefix("");
    vi.useRealTimers();
  });

  it("creates stable cache keys with sorted params and ignores empty values", () => {
    const key = createCacheKey("jobs", {
      search: "frontend",
      page: 2,
      location: "",
      seniority: undefined,
      remote: true,
      workMode: null,
    });

    expect(key).toBe("jobs?page=2&remote=true&search=frontend");
  });

  it("stores and retrieves cached values before expiry", () => {
    setCachedValue("jobs:test", { total: 3 }, 1_000);

    expect(getCachedValue<{ total: number }>("jobs:test")).toEqual({
      total: 3,
    });
  });

  it("returns null for expired cached values", () => {
    vi.useFakeTimers();
    setCachedValue("jobs:expired", { total: 1 }, 100);

    vi.advanceTimersByTime(101);

    expect(getCachedValue("jobs:expired")).toBeNull();
  });

  it("clears a single cached value", () => {
    setCachedValue("jobs:one", [1, 2, 3], 1_000);
    clearCachedValue("jobs:one");

    expect(getCachedValue("jobs:one")).toBeNull();
  });

  it("clears cached values by prefix", () => {
    setCachedValue("jobs:list:1", { ok: true }, 1_000);
    setCachedValue("jobs:list:2", { ok: true }, 1_000);
    setCachedValue("profile:1", { ok: true }, 1_000);

    clearCacheByPrefix("jobs:list");

    expect(getCachedValue("jobs:list:1")).toBeNull();
    expect(getCachedValue("jobs:list:2")).toBeNull();
    expect(getCachedValue("profile:1")).toEqual({ ok: true });
  });

  it("prunes expired entries while preserving active ones", () => {
    vi.useFakeTimers();

    setCachedValue("jobs:stale", "old", 100);
    setCachedValue("jobs:fresh", "new", 1_000);

    vi.advanceTimersByTime(200);
    pruneExpiredCacheEntries();

    expect(getCachedValue("jobs:stale")).toBeNull();
    expect(getCachedValue("jobs:fresh")).toBe("new");
  });

  it("returns cached value from getOrSetCachedValue without calling factory again", async () => {
    const factory = vi.fn().mockResolvedValue({ jobs: 5 });

    const first = await getOrSetCachedValue("jobs:factory", 1_000, factory);
    const second = await getOrSetCachedValue("jobs:factory", 1_000, factory);

    expect(first).toEqual({ jobs: 5 });
    expect(second).toEqual({ jobs: 5 });
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("recomputes value with getOrSetCachedValue after expiry", async () => {
    vi.useFakeTimers();

    const factory = vi
      .fn()
      .mockResolvedValueOnce({ jobs: 1 })
      .mockResolvedValueOnce({ jobs: 2 });

    const first = await getOrSetCachedValue("jobs:refresh", 100, factory);

    vi.advanceTimersByTime(101);

    const second = await getOrSetCachedValue("jobs:refresh", 100, factory);

    expect(first).toEqual({ jobs: 1 });
    expect(second).toEqual({ jobs: 2 });
    expect(factory).toHaveBeenCalledTimes(2);
  });
});
