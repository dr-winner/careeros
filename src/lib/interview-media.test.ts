import { describe, expect, it } from "vitest";
import { mediaErrorMessage } from "./interview-media";

describe("mediaErrorMessage", () => {
  it("explains permission denial", () => {
    expect(mediaErrorMessage({ name: "NotAllowedError" })).toMatch(/Allow camera and microphone/);
  });

  it("explains missing devices", () => {
    expect(mediaErrorMessage({ name: "NotFoundError" })).toMatch(/No camera or microphone/);
  });

  it("falls back for unknown errors", () => {
    expect(mediaErrorMessage("nope")).toMatch(/Could not start camera/);
  });
});
