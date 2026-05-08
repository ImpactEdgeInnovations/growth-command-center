import Link from "next/link";
import PlansClient from "./plans-client";
import { aiPanel, eyebrow, muted, navPill, pageTitle, shell } from "../ui/styles";

export default function PlansPage() {
  return (
    <main style={{ ...shell, maxWidth: 1240 }}>
      <Link href="/" style={navPill}>Back</Link>
      <section style={{ ...aiPanel, marginTop: 24, textAlign: "center", padding: "34px 24px" }}>
        <p style={{ ...eyebrow, marginTop: 0 }}>Growth plans</p>
        <h1 style={{ ...pageTitle, maxWidth: 820, margin: "12px auto" }}>Build, upload, or paste a growth plan.</h1>
        <p style={{ ...muted, maxWidth: 780, margin: "0 auto" }}>
          Start with an AI-drafted plan, attach a Markdown checklist or table for context, then turn it into measurable targets,
          milestones, outreach records, and weekly actions after human approval.
        </p>
      </section>
      <div style={{ marginTop: 28, width: "100%" }}><PlansClient /></div>
    </main>
  );
}
