import "server-only";

// Gemini's free tier may not be offered to users in the EEA, Switzerland or the UK
// (Gemini API Additional Terms). Until we use the paid tier, the AI chat is off there.
const BLOCKED = new Set([
  // EU
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV",
  "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  // rest of EEA + CH + UK
  "IS", "LI", "NO", "CH", "GB",
]);

/** Visitor's country from Vercel's geo header (missing locally → allowed). */
export function chatAllowed(req: Request): boolean {
  const country = req.headers.get("x-vercel-ip-country")?.toUpperCase();
  return !country || !BLOCKED.has(country);
}

export const REGION_MESSAGE = "The AI tutor isn't available in the EU, UK or Switzerland yet.";
