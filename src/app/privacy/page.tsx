import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy" };

const CONTACT = "nikoloz.lomtadze.10@gmail.com";
const UPDATED = "25 November 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-panel p-5">
      <h2 className="label mb-3 text-[11px] text-cyan">{title}</h2>
      <div className="space-y-2 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <h1 className="chroma font-pixel text-4xl font-bold tracking-wide">Privacy policy</h1>
      <p className="text-sm text-muted">Last updated {UPDATED}. In short: we collect as little as possible.</p>

      <Section title="Who we are">
        <p>CVEStat (cvestat.com) is a learning site run by Nikoloz Lomtadze.{CONTACT && <> Contact: <a className="text-cyan underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.</>}</p>
      </Section>

      <Section title="If you just browse">
        <p>You can read every CVE and news page without an account. We don&apos;t use ads, analytics trackers or tracking cookies.</p>
        <p>To keep the free AI within its limits, we count how many new explanations each IP address triggers per day. These counters are deleted after 7 days. Our hosting provider (Vercel) keeps standard server logs.</p>
      </Section>

      <Section title="If you log in">
        <p>You log in with Google or GitHub — we never see your password. We receive and store your email address, name and profile picture from that service. Accounts are stored by Supabase in the EU (Frankfurt). We keep a daily count of your AI tutor questions (deleted after 7 days).</p>
        <p>Login uses cookies that are strictly necessary to keep you signed in.</p>
      </Section>

      <Section title="The AI tutor">
        <p>Your questions and the CVE details are sent to Google&apos;s Gemini API to generate answers. We don&apos;t store your conversations — they stay in your browser tab and disappear when you close it. Google processes this data under its own terms and may use it to improve its services, so please don&apos;t share personal or confidential information.</p>
        <p>The AI tutor is currently not offered to visitors in the EU/EEA, the UK or Switzerland.</p>
      </Section>

      <Section title="Your rights">
        <p>You can ask us to see or delete your account data at any time{CONTACT ? <> by emailing {CONTACT}</> : ""}. If you are in the EU, you also have the rights given by the GDPR, including complaining to your data protection authority.</p>
        <p>CVEStat is intended for people aged 18 and over.</p>
      </Section>
    </article>
  );
}
