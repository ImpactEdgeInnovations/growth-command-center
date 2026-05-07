"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { button, card, input, label, muted, secondaryButton } from "../ui/styles";

export default function PlansClient() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [targetLabel, setTargetLabel] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"plan" | "upload" | "target" | "milestone" | null>(null);

  useEffect(() => {
    fetch("/api/workspace/summary", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setWorkspaceId(payload.workspace?.id || ""))
      .catch(() => undefined);
  }, []);

  const savePlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("plan"); setMessage("");
    try {
      const response = await fetch("/api/workspace/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, title, extractedText: text, sourceType: "manual" }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save plan.");
      setMessage("Growth plan saved. Next: ask AI to summarize or convert it into tasks.");
      setTitle(""); setText("");
    } catch (err: any) { setMessage(err.message || "Could not save plan."); }
    finally { setBusy(null); }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUploadFile(event.target.files?.[0] || null);
  };

  const uploadPlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!uploadFile) {
      setMessage("Choose a .md, .markdown, or .txt file first.");
      return;
    }
    setBusy("upload"); setMessage("");
    try {
      const formData = new FormData();
      formData.append("workspaceId", workspaceId);
      formData.append("title", uploadTitle);
      formData.append("file", uploadFile);
      const response = await fetch("/api/workspace/plans/upload", { method: "POST", body: formData });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not upload plan.");
      setMessage("Plan uploaded privately and text extracted. Next: use AI Advisor to summarize it.");
      setUploadTitle("");
      setUploadFile(null);
      event.currentTarget.reset();
    } catch (err: any) { setMessage(err.message || "Could not upload plan."); }
    finally { setBusy(null); }
  };

  const saveTarget = async () => {
    setBusy("target"); setMessage("");
    try {
      const response = await fetch("/api/workspace/targets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, label: targetLabel, targetValue: Number(targetValue || 0) }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save target.");
      setMessage("Target saved."); setTargetLabel(""); setTargetValue("");
    } catch (err: any) { setMessage(err.message || "Could not save target."); }
    finally { setBusy(null); }
  };

  const saveMilestone = async () => {
    setBusy("milestone"); setMessage("");
    try {
      const response = await fetch("/api/workspace/milestones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, title: milestoneTitle }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save milestone.");
      setMessage("Milestone saved."); setMilestoneTitle("");
    } catch (err: any) { setMessage(err.message || "Could not save milestone."); }
    finally { setBusy(null); }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {!workspaceId ? <div style={card}>Login to an approved workspace before saving plans.</div> : null}
      {message ? <div style={card}>{message}</div> : null}
      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        <form onSubmit={uploadPlan} style={card}>
          <div style={{ color: "var(--gcc-blue)", fontSize: 12, fontWeight: 900, letterSpacing: ".18em", textTransform: "uppercase" }}>Private upload</div>
          <h2 style={{ color: "var(--gcc-navy)", marginBottom: 8, marginTop: 8 }}>Upload a growth plan</h2>
          <p style={muted}>Upload a Markdown or text plan. The original file is stored privately, and readable text is saved for AI summaries and task planning.</p>
          <label style={label}>Plan title<input required style={input} value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Q2 growth execution plan" /></label>
          <label style={{ ...label, marginTop: 14 }}>
            Plan file
            <input required accept=".md,.markdown,.txt,text/plain,text/markdown" style={input} type="file" onChange={onFileChange} />
          </label>
          <p style={{ ...muted, fontSize: 13 }}>Supported now: .md, .markdown, .txt up to 2MB. PDF/DOCX extraction is intentionally queued for the next safe phase.</p>
          <button disabled={!!busy || !workspaceId} style={{ ...button, marginTop: 10 }}>{busy === "upload" ? "Uploading..." : "Upload privately"}</button>
        </form>
        <form onSubmit={savePlan} style={card}>
          <div style={{ color: "var(--gcc-blue)", fontSize: 12, fontWeight: 900, letterSpacing: ".18em", textTransform: "uppercase" }}>Manual backup</div>
          <h2 style={{ color: "var(--gcc-navy)", marginBottom: 8, marginTop: 8 }}>Paste a growth plan</h2>
          <p style={muted}>Paste text when you do not have a file ready. This uses the same plan model as uploads.</p>
          <label style={label}>Plan title<input required style={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Q2 investor and growth plan" /></label>
          <label style={{ ...label, marginTop: 14 }}>Plan text<textarea required style={{ ...input, minHeight: 220 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your growth plan, investor strategy, social plan, team plan..." /></label>
          <button disabled={!!busy || !workspaceId} style={{ ...button, marginTop: 16 }}>{busy === "plan" ? "Saving..." : "Save pasted plan"}</button>
        </form>
      </section>
      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
        <div style={card}>
          <h3 style={{ color: "var(--gcc-navy)", marginTop: 0 }}>Set a target</h3>
          <label style={label}>Target<input style={input} value={targetLabel} onChange={(e) => setTargetLabel(e.target.value)} placeholder="Reach 40 investors" /></label>
          <label style={{ ...label, marginTop: 12 }}>Target number<input type="number" style={input} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="40" /></label>
          <button disabled={!!busy || !workspaceId} onClick={saveTarget} style={{ ...secondaryButton, marginTop: 14 }}>{busy === "target" ? "Saving..." : "Save target"}</button>
        </div>
        <div style={card}>
          <h3 style={{ color: "var(--gcc-navy)", marginTop: 0 }}>Set a milestone</h3>
          <label style={label}>Milestone<input style={input} value={milestoneTitle} onChange={(e) => setMilestoneTitle(e.target.value)} placeholder="First investor meeting booked" /></label>
          <button disabled={!!busy || !workspaceId} onClick={saveMilestone} style={{ ...secondaryButton, marginTop: 14 }}>{busy === "milestone" ? "Saving..." : "Save milestone"}</button>
        </div>
      </section>
    </div>
  );
}
