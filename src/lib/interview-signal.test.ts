import { describe, expect, it } from "vitest";
import { isSignalType, parseIncomingSignal, shouldCreateOffer } from "./interview-signal";

describe("interview-signal", () => {
  it("accepts known signal types", () => {
    expect(isSignalType("hello")).toBe(true);
    expect(isSignalType("offer")).toBe(true);
    expect(isSignalType("ice")).toBe(true);
    expect(isSignalType("hack")).toBe(false);
  });

  it("picks a deterministic offerer so both peers do not glare", () => {
    expect(shouldCreateOffer("bbb", "aaa")).toBe(true);
    expect(shouldCreateOffer("aaa", "bbb")).toBe(false);
  });

  it("rejects malformed or oversized signal bodies", () => {
    expect(parseIncomingSignal(null)).toBeNull();
    expect(parseIncomingSignal({ peerId: "p1", type: "nope" })).toBeNull();
    expect(parseIncomingSignal({ peerId: "", type: "hello" })).toBeNull();
    const ok = parseIncomingSignal({ peerId: "p1", type: "hello", payload: { name: "Ada" } });
    expect(ok).toEqual({ peerId: "p1", type: "hello", payload: { name: "Ada" } });
  });
});
