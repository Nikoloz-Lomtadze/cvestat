import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

// Free-tier Gemini models, tried in order. If the first is busy (503) or rate-limited (429),
// we wait a moment and fall back to the next one. Override with GEMINI_MODEL in Vercel.
const MODELS = [process.env.GEMINI_MODEL || "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
export const MODEL = MODELS[0];

let client: GoogleGenAI | null = null;
function gemini() {
  if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isBusy = (e: unknown) => /\b(503|429|UNAVAILABLE|RESOURCE_EXHAUSTED)\b/.test(String(e));

/**
 * Ask Gemini for JSON that matches a zod schema.
 * The schema is sent to Gemini ("structured output"), and the answer is validated again here.
 * Up to 4 attempts: busy errors → wait (1s, 2s, 4s) and try the backup model; broken JSON → retry.
 */
export async function generateJson<T extends z.ZodType>(opts: {
  schema: T;
  system: string;
  prompt: string;
}): Promise<z.infer<T>> {
  const jsonSchema = z.toJSONSchema(opts.schema) as Record<string, unknown>;
  delete jsonSchema.$schema; // Gemini doesn't accept this field

  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    const model = MODELS[attempt % MODELS.length];
    try {
      const res = await gemini().models.generateContent({
        model,
        contents: opts.prompt,
        config: {
          systemInstruction: opts.system,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          temperature: 0.3,
        },
      });
      return opts.schema.parse(JSON.parse(res.text ?? ""));
    } catch (e) {
      lastError = e;
      if (isBusy(e)) await sleep(1000 * 2 ** attempt);
    }
  }
  throw lastError;
}
