"use client";

import { useState } from "react";
import { button, card, chip, input, label, muted, secondaryButton } from "../ui/styles";

type Props = {
  workspaceId: string;
  onSaved?: () => void;
};

const postJson = async (url: string, body: Record<string, unknown>) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Could not save item.");
  return payload;
};

export default function WorkspaceActionForms({ workspaceId, onSaved }: Props) {
  const [tab, setTab] = useState<"task" | "investor" | "marketing">("task");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [task, setTask] = useState({ title: "", lane: "growth", assigneeName: "", priority: "medium" });
  const [investor, setInvestor] = useState({ investorName: "", companyName: "", contactEmail: "", stage: "identified", nextFollowUpAt: "" });
  const [marketing, setMarketing] = useState({ channel: "", activityType: "", title: "", metricName: "", metricValue: "" });

  const save = async () => {
    setBusy(true);
    setMessage("");
    try {
      if (tab === "task") {
        await postJson("/api/workspace/tasks", { workspaceId, ...task });
        setTask({ title: "", lane: "growth", assigneeName: "", priority: "medium" });
        setMessage("Team task saved.");
      }
      if (tab === "investor") {
        await postJson("/api/workspace/investors", { workspaceId, ...investor });
        setInvestor({ investorName: "", companyName: "", contactEmail: "", stage: "identified", nextFollowUpAt: "" });
        setMessage("Investor outreach saved.");
      }
      if (tab === "marketing") {
        await postJson("/api/workspace/marketing", {
          workspaceId,
          ...marketing,
          metricValue: marketing.metricValue ? Number(marketing.metricValue) : undefined,
        });
        setMarketing({ channel: "", activityType: "", title: "", metricName: "", metricValue: "" });
        setMessage("Marketing activity saved.");
      }
      onSaved?.();
    } catch (error: any) {
      setMessage(error.message || "Could not save item.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={card}>
      <span style={chip}>Capture work fast</span>
      <h2 style={{ color: "var(--gcc-navy)", marginTop: 12 }}>Quick add</h2>
      <p style={muted}>Capture work as it happens so the weekly growth picture stays honest.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[
          ["task", "Team task"],
          ["investor", "Investor touch"],
          ["marketing", "Marketing activity"],
        ].map(([key, value]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key as typeof tab)}
            style={tab === key ? button : secondaryButton}
          >
            {value}
          </button>
        ))}
      </div>

      {tab === "task" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <label style={label}>Task title<input style={input} value={task.title} onChange={(e) => setTask((current) => ({ ...current, title: e.target.value }))} placeholder="Follow up with 10 investor leads" /></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            <label style={label}>Lane<select style={input} value={task.lane} onChange={(e) => setTask((current) => ({ ...current, lane: e.target.value }))}><option value="growth">Growth</option><option value="founder">Founder</option><option value="marketing">Marketing</option><option value="investor">Investor</option><option value="sales">Sales</option><option value="ops">Ops</option></select></label>
            <label style={label}>Owner<input style={input} value={task.assigneeName} onChange={(e) => setTask((current) => ({ ...current, assigneeName: e.target.value }))} placeholder="Samuel" /></label>
            <label style={label}>Priority<select style={input} value={task.priority} onChange={(e) => setTask((current) => ({ ...current, priority: e.target.value }))}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
          </div>
        </div>
      ) : null}

      {tab === "investor" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <label style={label}>Investor / fund name<input style={input} value={investor.investorName} onChange={(e) => setInvestor((current) => ({ ...current, investorName: e.target.value }))} placeholder="Acme Ventures" /></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            <label style={label}>Company<input style={input} value={investor.companyName} onChange={(e) => setInvestor((current) => ({ ...current, companyName: e.target.value }))} /></label>
            <label style={label}>Email<input style={input} value={investor.contactEmail} onChange={(e) => setInvestor((current) => ({ ...current, contactEmail: e.target.value }))} /></label>
            <label style={label}>Stage<select style={input} value={investor.stage} onChange={(e) => setInvestor((current) => ({ ...current, stage: e.target.value }))}><option value="identified">Identified</option><option value="contacted">Contacted</option><option value="warm">Warm</option><option value="meeting">Meeting</option><option value="diligence">Diligence</option><option value="committed">Committed</option><option value="passed">Passed</option></select></label>
          </div>
        </div>
      ) : null}

      {tab === "marketing" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <label style={label}>Activity title<input style={input} value={marketing.title} onChange={(e) => setMarketing((current) => ({ ...current, title: e.target.value }))} placeholder="LinkedIn founder post" /></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            <label style={label}>Channel<input style={input} value={marketing.channel} onChange={(e) => setMarketing((current) => ({ ...current, channel: e.target.value }))} placeholder="LinkedIn" /></label>
            <label style={label}>Activity type<input style={input} value={marketing.activityType} onChange={(e) => setMarketing((current) => ({ ...current, activityType: e.target.value }))} placeholder="Post" /></label>
            <label style={label}>Metric<input style={input} value={marketing.metricName} onChange={(e) => setMarketing((current) => ({ ...current, metricName: e.target.value }))} placeholder="Views" /></label>
            <label style={label}>Value<input type="number" style={input} value={marketing.metricValue} onChange={(e) => setMarketing((current) => ({ ...current, metricValue: e.target.value }))} placeholder="1200" /></label>
          </div>
        </div>
      ) : null}

      {message ? <p style={{ color: message.includes("saved") ? "var(--gcc-emerald)" : "var(--gcc-rose)", fontWeight: 800 }}>{message}</p> : null}
      <button type="button" disabled={busy || !workspaceId} onClick={save} style={{ ...button, marginTop: 14 }}>{busy ? "Saving..." : "Save item"}</button>
    </section>
  );
}
