import Link from "next/link";
import AiAdvisorClient from "./ai-advisor-client";
import { eyebrow, shell, muted } from "../ui/styles";

export default function AiAdvisorPage() {
  return (
    <main style={shell}>
      <Link href="/" style={{ color: "var(--gcc-blue)", fontWeight: 800 }}>Back</Link>
      <p style={{ ...eyebrow, marginTop: 28 }}>AI advisor</p>
      <h1 style={{ color: "var(--gcc-navy)", fontSize: 42 }}>Advice, research notes, and drafts with human approval.</h1>
      <p style={{ ...muted, maxWidth: 780 }}>Connect an AI API with `OPENAI_API_KEY`. Without it, the app returns safe rules-based advice so the product can still be tested.</p>
      <div style={{ marginTop: 28 }}><AiAdvisorClient /></div>
    </main>
  );
}
