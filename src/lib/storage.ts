import { readEnv, getSupabaseConfig } from "./env";

// ─── Vercel Blob ───────────────────────────────────────────────────────────────

function hasVercelBlob(): boolean {
  return Boolean(readEnv("BLOB_READ_WRITE_TOKEN"));
}

async function uploadToVercelBlob(
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<{ url: string; publicUrl: string } | null> {
  try {
    const { put } = await import("@vercel/blob");
    const blob = await put(filename, buffer, {
      access: "public",
      contentType,
    });
    return { url: blob.url, publicUrl: blob.url };
  } catch (err) {
    console.error("Vercel Blob upload failed:", err);
    return null;
  }
}

async function deleteFromVercelBlob(url: string): Promise<boolean> {
  try {
    const { del } = await import("@vercel/blob");
    await del(url);
    return true;
  } catch (err) {
    console.error("Vercel Blob delete failed:", err);
    return false;
  }
}

// ─── Supabase (fallback) ───────────────────────────────────────────────────────

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseAdminClient: SupabaseClient | null = null;

function getSupabaseAdminClient(): SupabaseClient | null {
  if (supabaseAdminClient) return supabaseAdminClient;

  const config = getSupabaseConfig();
  if (!config.url || !config.serviceKey) return null;

  supabaseAdminClient = createClient(config.url, config.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseAdminClient;
}

function getSupabasePublicUrl(bucket: string, filename: string): string {
  const config = getSupabaseConfig();
  if (!config.url) return `/uploads/${filename}`;
  return `${config.url}/storage/v1/object/public/${bucket}/${filename}`;
}

async function uploadToSupabase(
  bucket: string,
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<{ url: string; publicUrl: string } | null> {
  const config = getSupabaseConfig();
  if (!config.url) return null;

  const client = getSupabaseAdminClient();
  if (!client) return null;

  try {
    const result = await client.storage
      .from(bucket)
      .upload(filename, buffer, { contentType, upsert: true });

    if (result.error) {
      console.error("Supabase upload error:", result.error);
      return null;
    }

    return { url: result.data.fullPath, publicUrl: getSupabasePublicUrl(bucket, filename) };
  } catch (err) {
    console.error("Supabase upload threw:", err);
    return null;
  }
}

async function deleteFromSupabase(bucket: string, filename: string): Promise<boolean> {
  const config = getSupabaseConfig();
  if (!config.url) return false;

  const client = getSupabaseAdminClient();
  if (!client) return false;

  const { error } = await client.storage.from(bucket).remove([filename]);
  if (error) {
    console.error("Supabase delete error:", error);
    return false;
  }
  return true;
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function uploadToStorage(
  bucket: string,
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<{ url: string; publicUrl: string } | null> {
  // Vercel Blob: preferred — always available, no pausing
  if (hasVercelBlob()) {
    const result = await uploadToVercelBlob(filename, buffer, contentType);
    if (result) return result;
  }

  // Supabase: fallback
  return uploadToSupabase(bucket, filename, buffer, contentType);
}

export async function deleteFromStorage(
  bucket: string,
  filename: string,
): Promise<boolean> {
  // For Vercel Blob, filename is actually a full URL — detect and handle
  if (filename.startsWith("https://")) {
    return deleteFromVercelBlob(filename);
  }

  if (hasVercelBlob()) {
    // Can't delete by filename alone from Vercel Blob without the URL — skip
    return false;
  }

  return deleteFromSupabase(bucket, filename);
}

// Kept for backward-compat callers that build URLs manually
export function getPublicStorageUrl(bucket: string, filename: string): string {
  return getSupabasePublicUrl(bucket, filename);
}
