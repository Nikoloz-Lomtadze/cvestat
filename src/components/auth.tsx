"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

/** The logged-in user (or null), kept up to date when they log in/out in any tab. */
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setReady(true);
    });
    const { data } = sb.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return { user, ready };
}

export function signIn(provider: "google" | "github") {
  const next = window.location.pathname + window.location.search;
  supabaseBrowser().auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
}

export function LoginButtons({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button onClick={() => signIn("google")} className="px-btn px-4 py-2 text-[11px]">
        Continue with Google
      </button>
      <button onClick={() => signIn("github")} className="px-btn px-4 py-2 text-[11px]">
        Continue with GitHub
      </button>
    </div>
  );
}

/** Header button: "Log in" menu, or the user's name with a "Log out" option. */
export function AuthButton() {
  const { user, ready } = useUser();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!ready) return <span className="label w-16 text-muted opacity-0">…</span>;

  const name = user?.user_metadata?.full_name || user?.user_metadata?.user_name || user?.email?.split("@")[0];

  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="label max-w-36 truncate text-cyan hover:text-pink">
        {user ? `◉ ${name}` : "Log in"}
      </button>
      {open && (
        <div className="px-panel absolute right-0 top-8 z-40 w-60 bg-[#0b1a33]! p-4">
          {user ? (
            <>
              <p className="mb-3 truncate text-xs text-muted">{user.email}</p>
              <button
                onClick={() => supabaseBrowser().auth.signOut().then(() => setOpen(false))}
                className="px-btn w-full px-4 py-2 text-[11px]"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted">Log in to chat with the AI tutor on any CVE.</p>
              <LoginButtons />
            </>
          )}
        </div>
      )}
    </div>
  );
}
