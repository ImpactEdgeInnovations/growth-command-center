"use client";

import { useEffect, useState } from "react";
import { aiPanel, button, card, chip, metricCard, muted, secondaryButton } from "../ui/styles";
import WorkspaceActionForms from "./workspace-action-forms";
import WorkspaceMembersPanel from "./workspace-members-panel";

type Summary = {
  workspace?: any;
  counts?: Record<string, number>;
  recent?: Record<string, any[]>;
  usage?: {
    plan?: string;
    counts?: Record<string, number>;
    limits?: Record<string, number | null>;
    labels?: Record<string, string>;
  };
};

export default function WorkspaceClient() {
  const [summary, setSummary] = useState<Summary>({ counts: {}, recent: {} });
  const [message, setMessage] = useState("");
  const [aiBrief, setAiBrief] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

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

  const generateWorkspaceBrief = async () => {
    const workspaceId = summary.workspace?.id;
    if (!workspaceId) {
      setMessage("Login to an approved workspace before asking AI for a brief.");
      return;
    }
    setAiBusy(true);
    setMessage("");
    setAiBrief("");
    try {
      const response = await fetch("/api/ai/workspace-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not generate workspace brief.");
      setAiBrief(payload.advice || "No AI brief returned.");
      setAiModel(payload.model || "");
    } catch (error: any) {
      setMessage(error.message || "Could not generate workspace brief.");
    } finally {
      setAiBusy(false);
    }
  };

  const counts = summary.counts || {};
  return (
    <div style={{ display: "grid", gap: 18 }}>
      {message ? <div style={{ ...card, color: "var(--gcc-rose)", fontWeight: 800 }}>{message}</div> : null}
      {summary.workspace ? (
        <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <span style={chip}>Active workspace</span>
            <strong style={{ display: "block", color: "var(--gcc-navy)", fontSize: 24, letterSpacing: -.6, marginTop: 10 }}>{summary.workspace.company_name}</strong>
          </div>
          <p style={{ ...muted, margin: 0 }}>Plan: {summary.workspace.plan} · Subscription: {summary.workspace.subscription_enabled ? summary.workspace.subscription_status : "off"}</p>
        </div>
      ) : null}
      {summary.usage?.counts ? (
        <section style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <span style={chip}>Plan limits</span>
              <h2 style={{ color: "var(--gcc-navy)", margin: "10px 0 4px" }}>Usage stays predictable as the workspace grows.</h2>
              <p style={{ ...muted, margin: 0 }}>Super admin can upgrade the plan before a team hits a wall.</p>
            </div>
            <strong style={{ color: "var(--gcc-blue)", textTransform: "uppercase", letterSpacing: ".12em", fontSize: 12 }}>{summary.usage.plan || "trial"}</strong>
          </div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", marginTop: 16 }}>
            {Object.keys(summary.usage.labels || {}).map((metric) => {
              const count = summary.usage?.counts?.[metric] || 0;
              const limit = summary.usage?.limits?.[metric];
              const pct = limit ? Math.min(100, Math.round((count / limit) * 100)) : 0;
              return (
                <div key={metric} style={{ border: "1px solid rgba(8,58,99,.1)", borderRadius: 18, padding: 12, background: "rgba(248,252,255,.86)" }}>
                  <strong style={{ color: "var(--gcc-navy)", display: "block" }}>{count} / {limit ?? "∞"}</strong>
                  <p style={{ ...muted, margin: "3px 0 8px", fontSize: 12 }}>{summary.usage?.labels?.[metric]}</p>
                  {limit ? <div style={{ height: 7, borderRadius: 999, background: "rgba(8,58,99,.08)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: pct > 85 ? "var(--gcc-rose)" : pct > 65 ? "var(--gcc-amber)" : "var(--gcc-blue)" }} /></div> : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
      <section style={aiPanel}>
        <div style={chip}>AI command brief</div>
        <h2 style={{ color: "var(--gcc-navy)", margin: "8px 0", fontSize: 28, letterSpacing: -1 }}>Ask AI what deserves attention this week</h2>
        <p style={{ ...muted, maxWidth: 780 }}>
          AI reads the current workspace snapshot — plans, targets, tasks, investors, marketing, and weekly reviews —
          then drafts a practical weekly brief. Humans still approve decisions before external action.
        </p>
        <button type="button" disabled={aiBusy || !summary.workspace?.id} onClick={generateWorkspaceBrief} style={button}>
          {aiBusy ? "Reading workspace..." : "Generate weekly AI brief"}
        </button>
        {aiBrief ? (
          <pre style={{ ...card, boxShadow: "none", marginTop: 16, whiteSpace: "pre-wrap", lineHeight: 1.7, color: "var(--gcc-ink)" }}>
            {aiBrief}
            {aiModel ? `\n\nModel: ${aiModel} · human approval required` : ""}
          </pre>
        ) : null}
      </section>
      <section style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))" }}>
        {[["Plans", counts.plans || 0], ["Targets", counts.targets || 0], ["Milestones", counts.milestones || 0], ["Tasks", counts.tasks || 0], ["Investor follow-ups", counts.investorFollowups || 0], ["Marketing logs", counts.marketingActivities || 0]].map(([label, value]) => <div key={label} style={metricCard}><p style={{ fontSize: 31, fontWeight: 950, margin: 0, color: "var(--gcc-navy)", letterSpacing: -1 }}>{value}</p><p style={{ ...muted, margin: "4px 0 0" }}>{label}</p></div>)}
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
        <>
          <WorkspaceMembersPanel workspaceId={summary.workspace.id} />
          <WorkspaceActionForms workspaceId={summary.workspace.id} onSaved={loadSummary} />
        </>
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
