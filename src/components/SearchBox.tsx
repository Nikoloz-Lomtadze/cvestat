"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CVE_RE = /^CVE-\d{4}-\d{4,}$/;

/** Type a CVE id (e.g. cve-2021-44228) and jump to its page. */
export function SearchBox() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = value.trim().toUpperCase();
    if (!CVE_RE.test(id)) return setError("Enter a CVE id like CVE-2021-44228");
    setError("");
    router.push(`/cve/${id}`);
  }

  return (
    <form onSubmit={submit} className="w-full max-w-xl">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search a CVE, e.g. CVE-2021-44228"
          className="flex-1 rounded-lg border border-border bg-card px-4 py-3 font-mono text-sm outline-none focus:border-accent"
        />
        <button className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-black hover:opacity-90">
          Explain
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </form>
  );
}
