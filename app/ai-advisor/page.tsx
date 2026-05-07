import Link from "next/link";
import AiAdvisorClient from "./ai-advisor-client";
import { eyebrow, muted, navPill, pageTitle, shell } from "../ui/styles";

export default function AiAdvisorPage() {
  return (
    <main style={shell}>
      <Link href="/" style={navPill}>Back</Link>
      <p style={{ ...eyebrow, marginTop: 34 }}>AI advisor</p>
      <h1 style={pageTitle}>Advice, research notes, and drafts with human approval.</h1>
      <p style={{ ...muted, maxWidth: 780 }}>Connect an AI API with `OPENAI_API_KEY`. Without it, the app returns safe rules-based advice so the product can still be tested.</p>
      <div style={{ marginTop: 28 }}><AiAdvisorClient /></div>
    </main>
  );
}
