"use client";

import { useState, type FormEvent } from "react";
import { button, card, chip, input, label, muted } from "./styles";

const initial = { companyName: "", contactName: "", contactEmail: "", contactPhone: "", website: "", expectedTeamSize: "", useCase: "" };

export default function AccessRequestForm() {
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const setField = (key: keyof typeof initial, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, expectedTeamSize: form.expectedTeamSize ? Number(form.expectedTeamSize) : undefined }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not submit request.");
      setMessage(payload.message || "Request received.");
      setForm(initial);
    } catch (err: any) {
      setError(err.message || "Could not submit request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={card}>
      <span style={chip}>Private beta</span>
      <strong style={{ display: "block", color: "var(--gcc-navy)", fontSize: 23, letterSpacing: -.5, marginTop: 12 }}>Request company access</strong>
      <p style={{ ...muted, marginTop: 8 }}>Super admin approves companies first. After approval, the owner logs in by email code.</p>
      <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
        <label style={label}>Company name<input required style={input} value={form.companyName} onChange={(e) => setField("companyName", e.target.value)} placeholder="Example Ventures" /></label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          <label style={label}>Contact name<input required style={input} value={form.contactName} onChange={(e) => setField("contactName", e.target.value)} placeholder="Grace Wanjiku" /></label>
          <label style={label}>Work email<input required type="email" style={input} value={form.contactEmail} onChange={(e) => setField("contactEmail", e.target.value)} placeholder="grace@company.com" /></label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          <label style={label}>Phone<input style={input} value={form.contactPhone} onChange={(e) => setField("contactPhone", e.target.value)} placeholder="+254..." /></label>
          <label style={label}>Team size<input type="number" min="1" style={input} value={form.expectedTeamSize} onChange={(e) => setField("expectedTeamSize", e.target.value)} placeholder="5" /></label>
        </div>
        <label style={label}>Website<input style={input} value={form.website} onChange={(e) => setField("website", e.target.value)} placeholder="https://company.com" /></label>
        <label style={label}>What do you want Growth Command Center to help you track?<textarea required style={{ ...input, minHeight: 120 }} value={form.useCase} onChange={(e) => setField("useCase", e.target.value)} placeholder="Investor outreach, marketer tasks, social growth, founder targets..." /></label>
      </div>
      {error ? <p style={{ color: "var(--gcc-rose)", fontWeight: 700 }}>{error}</p> : null}
      {message ? <p style={{ color: "var(--gcc-emerald)", fontWeight: 700 }}>{message}</p> : null}
      <button disabled={busy} style={{ ...button, width: "100%", marginTop: 18 }}>{busy ? "Submitting..." : "Request access"}</button>
    </form>
  );
}
