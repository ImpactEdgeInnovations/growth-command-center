import Link from "next/link";
import WeeklyReviewClient from "./weekly-review-client";
import { eyebrow, shell, muted } from "../ui/styles";

export default function WeeklyReviewPage() {
  return (
    <main style={shell}>
      <Link href="/workspace" style={{ color: "var(--gcc-blue)", fontWeight: 800 }}>Back to workspace</Link>
      <p style={{ ...eyebrow, marginTop: 28 }}>Weekly review</p>
      <h1 style={{ color: "var(--gcc-navy)", fontSize: 42, margin: "12px 0" }}>Keep the company honest every week.</h1>
      <p style={{ ...muted, maxWidth: 760 }}>
        Capture wins, blockers, numbers, and next focus. The AI advisor can summarize, but the founder approves the final decisions.
      </p>
      <div style={{ marginTop: 28 }}><WeeklyReviewClient /></div>
    </main>
  );
}
