"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { aiPanel, button, card, chip, input, label, muted, secondaryButton } from "../ui/styles";

const getWeekBounds = () => {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const toDateInput = (date: Date) => date.toISOString().slice(0, 10);
  return { weekStart: toDateInput(monday), weekEnd: toDateInput(sunday) };
};

export default function WeeklyReviewClient() {
  const bounds = useMemo(() => getWeekBounds(), []);
  const [workspaceId, setWorkspaceId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    weekStart: bounds.weekStart,
    weekEnd: bounds.weekEnd,
    headline: "",
    wins: "",
    blockers: "",
    numbers: "",
    nextFocus: "",
    founderNote: "",
    status: "submitted",
  });

  useEffect(() => {
    fetch("/api/workspace/summary", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setWorkspaceId(payload.workspace?.id || ""))
      .catch(() => undefined);
  }, []);

  const setField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/workspace/weekly-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, ...form }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save weekly review.");
      setMessage("Weekly review saved. Next: ask AI to summarize risks and next actions.");
    } catch (error: any) {
      setMessage(error.message || "Could not save weekly review.");
    } finally {
      setBusy(false);
    }
  };

  const askAi = async () => {
    setBusy(true);
    setMessage("");
    try {
      const context = [
        `Week: ${form.weekStart} to ${form.weekEnd}`,
        `Headline: ${form.headline}`,
        `Wins: ${form.wins}`,
        `Blockers: ${form.blockers}`,
        `Numbers: ${form.numbers}`,
        `Next focus: ${form.nextFocus}`,
        `Founder note: ${form.founderNote}`,
      ].join("\n\n");
      const response = await fetch("/api/ai/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspaceId || undefined,
          briefType: "weekly_review",
          prompt:
            "Summarize this weekly growth review in simple language. Highlight wins, risks, and the top three actions for next week.",
          context,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "AI advisor failed.");
      setMessage(payload.advice || "No AI summary returned.");
    } catch (error: any) {
      setMessage(error.message || "AI advisor failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {!workspaceId ? <div style={card}>Login to an approved workspace before saving weekly reviews.</div> : null}
      {message ? <pre style={{ ...card, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{message}</pre> : null}
      <form onSubmit={submit} style={aiPanel}>
        <span style={chip}>Weekly rhythm</span>
        <h2 style={{ color: "var(--gcc-navy)", marginTop: 12, letterSpacing: -.8 }}>Weekly founder review</h2>
        <p style={muted}>
          This is the weekly rhythm: what happened, what blocked us, what the numbers say,
          and what we focus on next.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          <label style={label}>Week start<input type="date" style={input} value={form.weekStart} onChange={(e) => setField("weekStart", e.target.value)} /></label>
          <label style={label}>Week end<input type="date" style={input} value={form.weekEnd} onChange={(e) => setField("weekEnd", e.target.value)} /></label>
        </div>
        <label style={{ ...label, marginTop: 14 }}>Headline<input style={input} value={form.headline} onChange={(e) => setField("headline", e.target.value)} placeholder="Example: Investor outreach improved, but content output slipped" /></label>
        <label style={{ ...label, marginTop: 14 }}>Wins<textarea style={{ ...input, minHeight: 95 }} value={form.wins} onChange={(e) => setField("wins", e.target.value)} placeholder="What worked this week?" /></label>
        <label style={{ ...label, marginTop: 14 }}>Blockers<textarea style={{ ...input, minHeight: 95 }} value={form.blockers} onChange={(e) => setField("blockers", e.target.value)} placeholder="What slowed us down?" /></label>
        <label style={{ ...label, marginTop: 14 }}>Numbers<textarea style={{ ...input, minHeight: 95 }} value={form.numbers} onChange={(e) => setField("numbers", e.target.value)} placeholder="Investor emails sent, replies, meetings, posts, signups, revenue..." /></label>
        <label style={{ ...label, marginTop: 14 }}>Next week focus<textarea style={{ ...input, minHeight: 95 }} value={form.nextFocus} onChange={(e) => setField("nextFocus", e.target.value)} placeholder="Top priorities for the next seven days" /></label>
        <label style={{ ...label, marginTop: 14 }}>Founder note<textarea style={{ ...input, minHeight: 95 }} value={form.founderNote} onChange={(e) => setField("founderNote", e.target.value)} placeholder="Optional founder context or decision needed" /></label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <button disabled={busy || !workspaceId} style={button}>{busy ? "Saving..." : "Save weekly review"}</button>
          <button type="button" disabled={busy || !workspaceId} onClick={askAi} style={secondaryButton}>Ask AI to summarize</button>
        </div>
      </form>
    </div>
  );
}
