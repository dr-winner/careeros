export function readEnv(name: string): string | undefined {
  const value = process.env[name];

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getRequiredEnv(name: string): string {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getOptionalEnv(name: string): string | undefined {
  return readEnv(name);
}

export function getAppUrl(): string {
  return readEnv("APP_URL") || readEnv("NEXT_PUBLIC_APP_URL") || "https://www.careeros.live";
}

export function getEmailFrom(): string {
  return readEnv("EMAIL_FROM") || "CareerOS <noreply@careeros.live>";
}

export function hasAnyEnv(names: string[]): boolean {
  return names.some((name) => Boolean(readEnv(name)));
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getCronSecret(): string | undefined {
  return readEnv("CRON_SECRET");
}

export function getResendAudienceId(): string | undefined {
  return readEnv("RESEND_AUDIENCE_ID");
}

export function hasAiProviderConfigured(): boolean {
  return Boolean(
    readEnv("OPENAI_API_KEY") ||
    readEnv("ANTHROPIC_API_KEY") ||
    readEnv("GROQ_API_KEY"),
  );
}

export function getSupabaseConfig() {
  return {
    url: readEnv("SUPABASE_URL"),
    anonKey: readEnv("SUPABASE_ANON_KEY"),
    serviceKey: readEnv("SUPABASE_SERVICE_KEY"),
  };
}

export function hasSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return false;
  }
  if (config.url.includes("placeholder")) {
    return false;
  }
  return true;
}

export function getUpstashRedisConfig() {
  // Vercel's Upstash marketplace integration injects KV_REST_API_* names;
  // accept both so provisioning is plug-and-play.
  return {
    url: readEnv("UPSTASH_REDIS_REST_URL") || readEnv("KV_REST_API_URL"),
    token: readEnv("UPSTASH_REDIS_REST_TOKEN") || readEnv("KV_REST_API_TOKEN"),
  };
}

export function hasUpstashRedisConfigured(): boolean {
  const config = getUpstashRedisConfig();
  if (!config.url || !config.token) {
    return false;
  }
  if (config.url.includes("placeholder")) {
    return false;
  }
  return true;
}

export function hasVercelBlobConfigured(): boolean {
  return Boolean(readEnv("BLOB_READ_WRITE_TOKEN"));
}
