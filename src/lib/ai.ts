import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

// Free-tier Gemini model. Change GEMINI_MODEL in Vercel if Google renames models.
export const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

let client: GoogleGenAI | null = null;
function gemini() {
  if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

/**
 * Ask Gemini for JSON that matches a zod schema.
 * The schema is sent to Gemini ("structured output"), and the answer is validated again here.
 * Retries once if the answer is broken.
 */
export async function generateJson<T extends z.ZodType>(opts: {
  schema: T;
  system: string;
  prompt: string;
}): Promise<z.infer<T>> {
  const jsonSchema = z.toJSONSchema(opts.schema) as Record<string, unknown>;
  delete jsonSchema.$schema; // Gemini doesn't accept this field
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await gemini().models.generateContent({
        model: MODEL,
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
    }
  }
  throw lastError;
}
