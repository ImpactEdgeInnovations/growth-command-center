"use client";

import { useEffect, useState } from "react";
import { card, muted, secondaryButton } from "../ui/styles";
import WorkspaceActionForms from "./workspace-action-forms";

type Summary = { workspace?: any; counts?: Record<string, number>; recent?: Record<string, any[]> };

export default function WorkspaceClient() {
  const [summary, setSummary] = useState<Summary>({ counts: {}, recent: {} });
  const [message, setMessage] = useState("");

  const loadSummary = () => {
    fetch("/api/workspace/summary", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Login to load workspace.");
        setSummary(payload);
      })
      .catch((error) => setMessage(error.message || "Could not load workspace."));
  };

  useEffect(() => {
    loadSummary();
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
          <a href="/weekly-review" style={secondaryButton}>Weekly review</a>
        </div>
        <p style={muted}>Best flow: add the plan, convert it into targets and milestones, assign team tasks, then run weekly review.</p>
      </section>
      {summary.workspace?.id ? (
        <WorkspaceActionForms workspaceId={summary.workspace.id} onSaved={loadSummary} />
      ) : null}
      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
        <div style={card}>
          <h2 style={{ color: "var(--gcc-navy)", marginTop: 0 }}>Team tasks</h2>
          {(summary.recent?.tasks || []).length === 0 ? <p style={muted}>No team tasks yet.</p> : (summary.recent?.tasks || []).map((task) => <p key={task.id} style={muted}><strong>{task.title}</strong><br />{task.lane} · {task.priority} · {task.status}</p>)}
        </div>
        <div style={card}>
          <h2 style={{ color: "var(--gcc-navy)", marginTop: 0 }}>Investor outreach</h2>
          {(summary.recent?.investors || []).length === 0 ? <p style={muted}>No investor outreach yet.</p> : (summary.recent?.investors || []).map((item) => <p key={item.id} style={muted}><strong>{item.investor_name}</strong><br />{item.stage} · {item.status}</p>)}
        </div>
        <div style={card}>
          <h2 style={{ color: "var(--gcc-navy)", marginTop: 0 }}>Marketing activity</h2>
          {(summary.recent?.marketing || []).length === 0 ? <p style={muted}>No marketing activity yet.</p> : (summary.recent?.marketing || []).map((item) => <p key={item.id} style={muted}><strong>{item.title}</strong><br />{item.channel} · {item.metric_name || "No metric"} {item.metric_value || ""}</p>)}
        </div>
        <div style={card}>
          <h2 style={{ color: "var(--gcc-navy)", marginTop: 0 }}>Weekly reviews</h2>
          {(summary.recent?.weeklyReviews || []).length === 0 ? <p style={muted}>No weekly reviews yet.</p> : (summary.recent?.weeklyReviews || []).map((item) => <p key={item.id} style={muted}><strong>{item.headline || "Weekly review"}</strong><br />{item.week_start} to {item.week_end} · {item.status}</p>)}
        </div>
      </section>
      <section style={card}>
        <h2 style={{ color: "var(--gcc-navy)", marginTop: 0 }}>Recent plans</h2>
        {(summary.recent?.plans || []).length === 0 ? <p style={muted}>No growth plans yet.</p> : (summary.recent?.plans || []).map((plan) => <p key={plan.id} style={muted}><strong>{plan.title}</strong> · {plan.status}</p>)}
      </section>
    </div>
  );
}
