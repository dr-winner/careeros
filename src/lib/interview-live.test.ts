import { describe, expect, it } from "vitest";
import { formatInterviewClock } from "./interview-live";

describe("formatInterviewClock", () => {
  it("formats elapsed milliseconds as m:ss", () => {
    expect(formatInterviewClock(0)).toBe("0:00");
    expect(formatInterviewClock(1000)).toBe("0:01");
    expect(formatInterviewClock(65_000)).toBe("1:05");
    expect(formatInterviewClock(-20)).toBe("0:00");
  });
});
