import Link from "next/link";
import WorkspaceClient from "./workspace-client";
import { eyebrow, muted, navPill, pageTitle, shell } from "../ui/styles";

export default function WorkspacePage() {
  return (
    <main style={shell}>
      <Link href="/" style={navPill}>Back</Link>
      <p style={{ ...eyebrow, marginTop: 34 }}>Company workspace</p>
      <h1 style={pageTitle}>Your weekly growth cockpit.</h1>
      <p style={{ ...muted, maxWidth: 760 }}>Track your plan, targets, milestones, investor follow-ups, team execution, and AI-generated drafts.</p>
      <div style={{ marginTop: 28 }}><WorkspaceClient /></div>
    </main>
  );
}
