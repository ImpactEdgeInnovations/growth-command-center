"use client";

import { useEffect, useState, type FormEvent } from "react";
import { button, card, input, label, muted, secondaryButton } from "../ui/styles";

export default function PlansClient() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [targetLabel, setTargetLabel] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/workspace/summary", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setWorkspaceId(payload.workspace?.id || ""))
      .catch(() => undefined);
  }, []);

  const savePlan = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/workspace/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, title, extractedText: text, sourceType: "manual" }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save plan.");
      setMessage("Growth plan saved. Next: ask AI to summarize or convert it into tasks.");
      setTitle(""); setText("");
    } catch (err: any) { setMessage(err.message || "Could not save plan."); }
    finally { setBusy(false); }
  };

  const saveTarget = async () => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/workspace/targets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, label: targetLabel, targetValue: Number(targetValue || 0) }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save target.");
      setMessage("Target saved."); setTargetLabel(""); setTargetValue("");
    } catch (err: any) { setMessage(err.message || "Could not save target."); }
    finally { setBusy(false); }
  };

  const saveMilestone = async () => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/workspace/milestones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, title: milestoneTitle }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save milestone.");
      setMessage("Milestone saved."); setMilestoneTitle("");
    } catch (err: any) { setMessage(err.message || "Could not save milestone."); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {!workspaceId ? <div style={card}>Login to an approved workspace before saving plans.</div> : null}
      {message ? <div style={card}>{message}</div> : null}
      <form onSubmit={savePlan} style={card}>
        <h2 style={{ color: "var(--gcc-navy)", marginTop: 0 }}>Paste a growth plan</h2>
        <p style={muted}>For MVP we start with manual text/Markdown. PDF/DOCX extraction comes next without changing the plan model.</p>
        <label style={label}>Plan title<input required style={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Q2 investor and growth plan" /></label>
        <label style={{ ...label, marginTop: 14 }}>Plan text<textarea required style={{ ...input, minHeight: 220 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your growth plan, investor strategy, social plan, team plan..." /></label>
        <button disabled={busy || !workspaceId} style={{ ...button, marginTop: 16 }}>{busy ? "Saving..." : "Save plan"}</button>
      </form>
      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
        <div style={card}>
          <h3 style={{ color: "var(--gcc-navy)", marginTop: 0 }}>Set a target</h3>
          <label style={label}>Target<input style={input} value={targetLabel} onChange={(e) => setTargetLabel(e.target.value)} placeholder="Reach 40 investors" /></label>
          <label style={{ ...label, marginTop: 12 }}>Target number<input type="number" style={input} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="40" /></label>
          <button disabled={busy || !workspaceId} onClick={saveTarget} style={{ ...secondaryButton, marginTop: 14 }}>Save target</button>
        </div>
        <div style={card}>
          <h3 style={{ color: "var(--gcc-navy)", marginTop: 0 }}>Set a milestone</h3>
          <label style={label}>Milestone<input style={input} value={milestoneTitle} onChange={(e) => setMilestoneTitle(e.target.value)} placeholder="First investor meeting booked" /></label>
          <button disabled={busy || !workspaceId} onClick={saveMilestone} style={{ ...secondaryButton, marginTop: 14 }}>Save milestone</button>
        </div>
      </section>
    </div>
  );
}
