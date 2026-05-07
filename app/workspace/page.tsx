import Link from "next/link";
import WorkspaceClient from "./workspace-client";
import { eyebrow, shell, muted } from "../ui/styles";

export default function WorkspacePage() {
  return (
    <main style={shell}>
      <Link href="/" style={{ color: "var(--gcc-blue)", fontWeight: 800 }}>Back</Link>
      <p style={{ ...eyebrow, marginTop: 28 }}>Company workspace</p>
      <h1 style={{ color: "var(--gcc-navy)", fontSize: 42, margin: "12px 0" }}>Your weekly growth cockpit.</h1>
      <p style={{ ...muted, maxWidth: 760 }}>Track your plan, targets, milestones, investor follow-ups, team execution, and AI-generated drafts.</p>
      <div style={{ marginTop: 28 }}><WorkspaceClient /></div>
    </main>
  );
}
