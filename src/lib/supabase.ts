import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client using the SECRET key.
// It bypasses Row Level Security, so it must never be imported into browser code
// ("server-only" makes the build fail if that ever happens).
let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!client) {
    // Accept both naming styles (Vercel uses the short names, .env.local the long ones).
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
      throw new Error(
        `Missing env vars: ${[!url && "SUPABASE_URL", !key && "SERVICE_ROLE_KEY"].filter(Boolean).join(", ")}`,
      );
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
