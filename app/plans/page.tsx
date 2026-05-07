import Link from "next/link";
import PlansClient from "./plans-client";
import { eyebrow, muted, navPill, pageTitle, shell } from "../ui/styles";

export default function PlansPage() {
  return (
    <main style={shell}>
      <Link href="/" style={navPill}>Back</Link>
      <p style={{ ...eyebrow, marginTop: 34 }}>Growth plans</p>
      <h1 style={pageTitle}>Build, upload, or paste a growth plan.</h1>
      <p style={{ ...muted, maxWidth: 760 }}>Start with an AI-drafted plan, then turn it into measurable targets, milestones, and weekly actions after human approval.</p>
      <div style={{ marginTop: 28 }}><PlansClient /></div>
    </main>
  );
}
