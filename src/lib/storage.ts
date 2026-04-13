import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig, getAppUrl } from "./env";

let supabaseAdminClient: SupabaseClient | null = null;

function getSupabaseAdminClient(): SupabaseClient | null {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const config = getSupabaseConfig();

  if (!config.url || !config.serviceKey) {
    console.warn("Supabase not configured. File uploads will fail in production.");
    return null;
  }

  supabaseAdminClient = createClient(config.url, config.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdminClient;
}

export function getPublicStorageUrl(bucket: string, filename: string): string {
  const config = getSupabaseConfig();

  if (!config.url) {
    return `/uploads/${filename}`;
  }

  return `${config.url}/storage/v1/object/public/${bucket}/${filename}`;
}

export async function uploadToStorage(
  bucket: string,
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<{ url: string; publicUrl: string } | null> {
  const config = getSupabaseConfig();

  if (!config.url) {
    console.warn("Supabase not configured, falling back to local storage");
    return null;
  }

  const client = getSupabaseAdminClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.storage
    .from(bucket)
    .upload(filename, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error("Supabase upload error:", error);
    return null;
  }

  const publicUrl = getPublicStorageUrl(bucket, filename);

  return {
    url: data.fullPath,
    publicUrl,
  };
}

export async function deleteFromStorage(
  bucket: string,
  filename: string,
): Promise<boolean> {
  const config = getSupabaseConfig();

  if (!config.url) {
    return false;
  }

  const client = getSupabaseAdminClient();

  if (!client) {
    return false;
  }

  const { error } = await client.storage.from(bucket).remove([filename]);

  if (error) {
    console.error("Supabase delete error:", error);
    return false;
  }

  return true;
}
