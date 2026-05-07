import Link from "next/link";
import PlansClient from "./plans-client";
import { eyebrow, shell, muted } from "../ui/styles";

export default function PlansPage() {
  return (
    <main style={shell}>
      <Link href="/" style={{ color: "var(--gcc-blue)", fontWeight: 800 }}>Back</Link>
      <p style={{ ...eyebrow, marginTop: 28 }}>Growth plans</p>
      <h1 style={{ color: "var(--gcc-navy)", fontSize: 42 }}>Build, upload, or paste a growth plan.</h1>
      <p style={{ ...muted, maxWidth: 760 }}>Start with an AI-drafted plan, then turn it into measurable targets, milestones, and weekly actions after human approval.</p>
      <div style={{ marginTop: 28 }}><PlansClient /></div>
    </main>
  );
}
