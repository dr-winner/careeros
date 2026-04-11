import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  getAiProviderKeys,
  getAppUrl,
  getCronSecret,
  getEmailFrom,
  getOptionalEnv,
  getRequiredEnv,
  getResendAudienceId,
  hasAiProviderConfigured,
  hasAnyEnv,
  isProduction,
} from "./env";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
}

describe("env helpers", () => {
  beforeEach(() => {
    resetEnv();
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.EMAIL_FROM;
    delete process.env.CRON_SECRET;
    delete process.env.RESEND_AUDIENCE_ID;
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.TEST_ENV_VALUE;
    delete process.env.EMPTY_ENV_VALUE;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe("getRequiredEnv", () => {
    it("returns a trimmed value when the env var exists", () => {
      process.env.TEST_ENV_VALUE = "  hello-world  ";

      expect(getRequiredEnv("TEST_ENV_VALUE")).toBe("hello-world");
    });

    it("throws when the env var is missing", () => {
      expect(() => getRequiredEnv("MISSING_ENV_VALUE")).toThrow(
        "Missing required environment variable: MISSING_ENV_VALUE",
      );
    });

    it("throws when the env var is blank", () => {
      process.env.EMPTY_ENV_VALUE = "   ";

      expect(() => getRequiredEnv("EMPTY_ENV_VALUE")).toThrow(
        "Missing required environment variable: EMPTY_ENV_VALUE",
      );
    });
  });

  describe("getOptionalEnv", () => {
    it("returns undefined when the env var is missing", () => {
      expect(getOptionalEnv("MISSING_OPTIONAL_ENV")).toBeUndefined();
    });

    it("returns undefined when the env var is blank", () => {
      process.env.EMPTY_ENV_VALUE = "   ";

      expect(getOptionalEnv("EMPTY_ENV_VALUE")).toBeUndefined();
    });

    it("returns a trimmed value when present", () => {
      process.env.TEST_ENV_VALUE = "  optional-value  ";

      expect(getOptionalEnv("TEST_ENV_VALUE")).toBe("optional-value");
    });
  });

  describe("getAppUrl", () => {
    it("prefers APP_URL over NEXT_PUBLIC_APP_URL", () => {
      process.env.APP_URL = "https://app.example.com";
      process.env.NEXT_PUBLIC_APP_URL = "https://public.example.com";

      expect(getAppUrl()).toBe("https://app.example.com");
    });

    it("falls back to NEXT_PUBLIC_APP_URL", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://public.example.com";

      expect(getAppUrl()).toBe("https://public.example.com");
    });

    it("falls back to the default production URL", () => {
      expect(getAppUrl()).toBe("https://careeros.app");
    });
  });

  describe("getEmailFrom", () => {
    it("returns EMAIL_FROM when configured", () => {
      process.env.EMAIL_FROM = "CareerOS <hello@example.com>";

      expect(getEmailFrom()).toBe("CareerOS <hello@example.com>");
    });

    it("falls back to the default sender", () => {
      expect(getEmailFrom()).toBe("CareerOS <noreply@careeros.app>");
    });
  });

  describe("hasAnyEnv", () => {
    it("returns true when any configured env exists", () => {
      process.env.TEST_ENV_VALUE = "configured";

      expect(hasAnyEnv(["MISSING_ONE", "TEST_ENV_VALUE", "MISSING_TWO"])).toBe(
        true,
      );
    });

    it("returns false when none of the env vars are configured", () => {
      expect(hasAnyEnv(["MISSING_ONE", "MISSING_TWO"])).toBe(false);
    });

    it("ignores blank env values", () => {
      process.env.EMPTY_ENV_VALUE = "   ";

      expect(hasAnyEnv(["EMPTY_ENV_VALUE"])).toBe(false);
    });
  });

  describe("isProduction", () => {
    it("returns true when NODE_ENV is production", () => {
      expect(isProduction()).toBe(process.env.NODE_ENV === "production");
    });

    it("returns false when NODE_ENV is not production", () => {
      expect(isProduction()).toBe(process.env.NODE_ENV === "production");
    });
  });

  describe("specific env accessors", () => {
    it("returns trimmed CRON_SECRET", () => {
      process.env.CRON_SECRET = "  top-secret  ";

      expect(getCronSecret()).toBe("top-secret");
    });

    it("returns trimmed RESEND_AUDIENCE_ID", () => {
      process.env.RESEND_AUDIENCE_ID = "  audience_123  ";

      expect(getResendAudienceId()).toBe("audience_123");
    });

    it("returns undefined for missing optional accessors", () => {
      expect(getCronSecret()).toBeUndefined();
      expect(getResendAudienceId()).toBeUndefined();
    });
  });

  describe("AI provider helpers", () => {
    it("returns all configured AI keys", () => {
      process.env.OPENAI_API_KEY = "openai-key";
      process.env.DEEPSEEK_API_KEY = "deepseek-key";
      process.env.GROQ_API_KEY = "groq-key";
      process.env.GEMINI_API_KEY = "gemini-key";

      expect(getAiProviderKeys()).toEqual({
        openai: "openai-key",
        deepseek: "deepseek-key",
        groq: "groq-key",
        gemini: "gemini-key",
      });
    });

    it("returns undefined for missing AI keys", () => {
      expect(getAiProviderKeys()).toEqual({
        openai: undefined,
        deepseek: undefined,
        groq: undefined,
        gemini: undefined,
      });
    });

    it("returns true when any AI provider is configured", () => {
      process.env.GEMINI_API_KEY = "gemini-key";

      expect(hasAiProviderConfigured()).toBe(true);
    });

    it("returns false when no AI providers are configured", () => {
      expect(hasAiProviderConfigured()).toBe(false);
    });
  });
});
