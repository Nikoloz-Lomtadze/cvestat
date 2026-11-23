import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client using the SECRET key.
// It bypasses Row Level Security, so it must never be imported into browser code
// ("server-only" makes the build fail if that ever happens).
let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing Supabase env vars");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
