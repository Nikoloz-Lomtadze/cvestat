import "server-only";
import { z } from "zod";
import { generateJson, MODEL } from "./ai";
import { db } from "./supabase";
import type { Cve } from "./types";

// The shape of every explanation. Gemini must return exactly this.
export const ExplanationSchema = z.object({
  tldr: z.string().describe("One or two sentences a beginner understands immediately."),
  what_is_it: z.string().describe("One short paragraph in plain English: what is broken and why it matters."),
  analogy: z.string().describe("An everyday-life analogy for the bug, e.g. a lock, a mailbox, a receptionist."),
  how_it_works: z
    .array(z.string())
    .min(2)
    .max(6)
    .describe("Conceptual steps of how an attacker abuses it. No commands, payloads or code."),
  real_world_example: z
    .string()
    .describe("A realistic scenario. Only name a real incident if certain; otherwise start with 'Imagine'."),
  who_is_affected: z.string().describe("Which products/versions/users, based only on the given data."),
  impact: z.string().describe("What an attacker gains, in plain words."),
  how_to_fix: z.array(z.string()).min(1).max(5).describe("Concrete defensive steps: patch, config, mitigation."),
  key_terms: z
    .array(z.object({ term: z.string(), meaning: z.string() }))
    .min(2)
    .max(6)
    .describe("Security terms used above, each explained in one sentence."),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).describe("How hard the concept is to grasp."),
});
export type Explanation = z.infer<typeof ExplanationSchema>;

const SYSTEM = `You are a patient cybersecurity teacher writing for junior security specialists and students.
Explain vulnerabilities clearly, accurately and briefly. Use simple English and short sentences.
Rules:
- Use ONLY facts from the CVE data given. If something is unknown, say so instead of guessing.
- Never invent version numbers, vendors, incidents or statistics.
- Never write exploit code, payloads, commands or step-by-step attack instructions. Explain concepts only.
- Focus on understanding and defense.`;

function prompt(c: Cve) {
  return `Explain this vulnerability.

ID: ${c.id}
Description: ${c.description ?? c.kev_description ?? "unknown"}
CVSS: ${c.cvss_score ?? "n/a"} ${c.cvss_severity ?? ""} ${c.cvss_vector ?? ""}
Weakness types: ${c.cwes.join(", ") || "unknown"}
Affected (vendor product): ${c.affected.join("; ") || "unknown"}
Actively exploited (CISA KEV): ${c.in_kev ? `yes, since ${c.kev_date_added}` : "not known"}
Exploit probability next 30 days (EPSS): ${c.epss != null ? `${(c.epss * 100).toFixed(1)}%` : "unknown"}
CISA required action: ${c.kev_required_action ?? "n/a"}`;
}

/** Create the explanation with AI and save it, so it's generated only once per CVE. */
export async function createExplanation(cve: Cve): Promise<Explanation> {
  const content = await generateJson({ schema: ExplanationSchema, system: SYSTEM, prompt: prompt(cve) });
  const { error } = await db()
    .from("explanations")
    .upsert({ cve_id: cve.id, content, model: MODEL }, { onConflict: "cve_id", ignoreDuplicates: true });
  if (error) console.error("Explanation save failed", cve.id, error);
  return content;
}

/** Daily limit across the whole site, to stay inside the free AI tier. */
export async function consumeQuota(key: string, limit: number): Promise<boolean> {
  const { data, error } = await db().rpc("consume_quota", { p_key: key, p_limit: limit });
  if (error) {
    console.error("quota check failed", error);
    return false;
  }
  return data === true;
}
