"use client";

import { useEffect, useState, type FormEvent } from "react";
import { aiPanel, button, card, chip, input, label, muted } from "../ui/styles";

const examples = [
  "What should we focus on this week?",
  "Turn this growth plan into five targets and ten tasks.",
  "Which investors should I follow up with first?",
  "Draft a polite investor follow-up email.",
  "Research-style note: what risks should we monitor in this growth plan?",
];

export default function AiAdvisorClient() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [prompt, setPrompt] = useState(examples[0]);
  const [context, setContext] = useState("");
  const [advice, setAdvice] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/workspace/summary", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setWorkspaceId(payload.workspace?.id || ""))
      .catch(() => undefined);
  }, []);

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setMessage(""); setAdvice("");
    try {
      const response = await fetch("/api/ai/advice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: workspaceId || undefined, prompt, context, briefType: "general_advice" }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "AI advisor failed.");
      setAdvice(payload.advice || "No advice returned.");
      setMessage(`Model: ${payload.model}. Human approval required before sending or acting externally.`);
    } catch (err: any) { setMessage(err.message || "AI advisor failed."); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <form onSubmit={ask} style={aiPanel}>
        <span style={chip}>AI advisor</span>
        <h2 style={{ color: "var(--gcc-navy)", marginTop: 12, letterSpacing: -.8 }}>Ask the AI advisor</h2>
        <p style={muted}>AI can advise, summarize, draft, and suggest. It cannot auto-send or approve decisions.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {examples.map((item) => <button type="button" key={item} onClick={() => setPrompt(item)} style={chip}>{item}</button>)}
        </div>
        <label style={label}>Question<textarea required style={{ ...input, minHeight: 95 }} value={prompt} onChange={(e) => setPrompt(e.target.value)} /></label>
        <label style={{ ...label, marginTop: 14 }}>Optional context<textarea style={{ ...input, minHeight: 140 }} value={context} onChange={(e) => setContext(e.target.value)} placeholder="Paste growth plan section, investor notes, team update, social media numbers..." /></label>
        <button disabled={busy} style={{ ...button, marginTop: 16 }}>{busy ? "Thinking..." : "Get advice"}</button>
      </form>
      {message ? <div style={card}>{message}</div> : null}
      {advice ? <pre style={{ ...card, whiteSpace: "pre-wrap", lineHeight: 1.7, color: "var(--gcc-ink)" }}>{advice}</pre> : null}
    </div>
  );
}
