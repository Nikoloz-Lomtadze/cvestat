"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Browser Supabase client using the PUBLIC (anon) key — safe to ship to the browser.
// Used only for login/logout; the session is kept in cookies and refreshed automatically.
let client: SupabaseClient | null = null;

/** Returns null if Supabase isn't configured, so a missing key hides login instead of crashing the page. */
export function supabaseBrowser(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client ??= createBrowserClient(url, key);
  return client;
}
