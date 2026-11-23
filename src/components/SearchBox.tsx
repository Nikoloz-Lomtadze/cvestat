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
    <form onSubmit={submit} className="w-full max-w-2xl">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="CVE-2021-44228"
          aria-label="CVE id"
          className="flex-1 border-2 border-[#0b1a33] bg-[#f3fbff] px-4 py-3 font-mono text-base text-[#0b1a33] shadow-[4px_4px_0_0_rgb(11_26_51/0.5)] outline-none placeholder:text-[#0b1a33]/40 focus:border-pink"
        />
        <button className="px-btn px-6 py-3 text-sm">▼ Dive in</button>
      </div>
      {error && <p className="mt-2 text-sm font-medium text-[#b3123f]">{error}</p>}
    </form>
  );
}
