/** "GE" → 🇬🇪 (shows as letters on Windows, which has no flag emoji) */
export function flag(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
