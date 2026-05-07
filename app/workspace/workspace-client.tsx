"use client";

import { useEffect, useState } from "react";
import { card, muted, secondaryButton } from "../ui/styles";

type Summary = { workspace?: any; counts?: Record<string, number>; recent?: Record<string, any[]> };

export default function WorkspaceClient() {
  const [summary, setSummary] = useState<Summary>({ counts: {}, recent: {} });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/workspace/summary", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Login to load workspace.");
        setSummary(payload);
      })
      .catch((error) => setMessage(error.message || "Could not load workspace."));
  }, []);

  const counts = summary.counts || {};
  return (
    <div style={{ display: "grid", gap: 18 }}>
      {message ? <div style={{ ...card, color: "var(--gcc-rose)", fontWeight: 800 }}>{message}</div> : null}
      {summary.workspace ? <div style={card}><strong style={{ color: "var(--gcc-navy)", fontSize: 20 }}>{summary.workspace.company_name}</strong><p style={muted}>Plan: {summary.workspace.plan} · Subscription: {summary.workspace.subscription_enabled ? summary.workspace.subscription_status : "off"}</p></div> : null}
      <section style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))" }}>
        {[["Plans", counts.plans || 0], ["Targets", counts.targets || 0], ["Milestones", counts.milestones || 0], ["Tasks", counts.tasks || 0], ["Investor follow-ups", counts.investorFollowups || 0], ["Marketing logs", counts.marketingActivities || 0]].map(([label, value]) => <div key={label} style={card}><p style={{ fontSize: 28, fontWeight: 900, margin: 0, color: "var(--gcc-navy)" }}>{value}</p><p style={{ ...muted, margin: 0 }}>{label}</p></div>)}
      </section>
      <section style={card}>
        <h2 style={{ color: "var(--gcc-navy)", marginTop: 0 }}>Start here</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/plans" style={secondaryButton}>Upload / paste growth plan</a>
          <a href="/ai-advisor" style={secondaryButton}>Ask AI advisor</a>
        </div>
        <p style={muted}>Best flow: add the plan, convert it into targets and milestones, assign team tasks, then run weekly review.</p>
      </section>
      <section style={card}>
        <h2 style={{ color: "var(--gcc-navy)", marginTop: 0 }}>Recent plans</h2>
        {(summary.recent?.plans || []).length === 0 ? <p style={muted}>No growth plans yet.</p> : (summary.recent?.plans || []).map((plan) => <p key={plan.id} style={muted}><strong>{plan.title}</strong> · {plan.status}</p>)}
      </section>
    </div>
  );
}
