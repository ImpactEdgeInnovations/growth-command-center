import Link from "next/link";
import PlansClient from "./plans-client";
import { eyebrow, shell, muted } from "../ui/styles";

export default function PlansPage() {
  return (
    <main style={shell}>
      <Link href="/" style={{ color: "var(--gcc-blue)", fontWeight: 800 }}>Back</Link>
      <p style={{ ...eyebrow, marginTop: 28 }}>Growth plans</p>
      <h1 style={{ color: "var(--gcc-navy)", fontSize: 42 }}>Upload or paste a growth plan.</h1>
      <p style={{ ...muted, maxWidth: 760 }}>Turn business plans into measurable targets, milestones, and AI-advised weekly actions.</p>
      <div style={{ marginTop: 28 }}><PlansClient /></div>
    </main>
  );
}
