import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

// Free-tier Gemini models, tried in order. If the first is busy (503) or rate-limited (429),
// we wait a moment and fall back to the next one. Override with GEMINI_MODEL in Vercel.
const MODELS = [process.env.GEMINI_MODEL || "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.6-flash"];
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
 * Up to 5 attempts: busy errors → wait (1s, 2s, 4s, 8s) and try the next model; broken JSON → retry.
 */
export async function generateJson<T extends z.ZodType>(opts: {
  schema: T;
  system: string;
  prompt: string;
}): Promise<z.infer<T>> {
  const jsonSchema = z.toJSONSchema(opts.schema) as Record<string, unknown>;
  delete jsonSchema.$schema; // Gemini doesn't accept this field

  let lastError: unknown;
  const started = Date.now();
  for (let attempt = 0; attempt < 5; attempt++) {
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
          httpOptions: { timeout: 25_000 }, // give up on a slow model after 25 s and try the next
        },
      });
      return opts.schema.parse(JSON.parse(res.text ?? ""));
    } catch (e) {
      lastError = e;
      if (Date.now() - started > 70_000) break; // stay well inside the server time limit
      if (isBusy(e)) await sleep(1000 * 2 ** attempt);
    }
  }
  throw lastError;
}

export type ChatTurn = { role: "user" | "model"; text: string };

/**
 * Plain-text chat answer from Gemini, with the same model fallback as generateJson.
 * `history` is the whole conversation so far, ending with the user's new question.
 */
export async function generateChat(opts: { system: string; history: ChatTurn[] }): Promise<string> {
  const contents = opts.history.map((t) => ({ role: t.role, parts: [{ text: t.text }] }));
  let lastError: unknown;
  const started = Date.now();
  for (let attempt = 0; attempt < 4; attempt++) {
    const model = MODELS[attempt % MODELS.length];
    try {
      const res = await gemini().models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: opts.system,
          temperature: 0.4,
          maxOutputTokens: 700,
          httpOptions: { timeout: 20_000 },
        },
      });
      const text = res.text?.trim();
      if (text) return text;
      throw new Error("empty answer");
    } catch (e) {
      lastError = e;
      if (Date.now() - started > 45_000) break;
      if (isBusy(e)) await sleep(1000 * 2 ** attempt);
    }
  }
  throw lastError;
}
