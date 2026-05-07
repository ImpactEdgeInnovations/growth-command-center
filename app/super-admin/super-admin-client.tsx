"use client";

import { useEffect, useState } from "react";
import { button, card, muted, secondaryButton } from "../ui/styles";

type Summary = {
  ok?: boolean;
  schemaReady?: boolean;
  applications?: any[];
  workspaces?: any[];
  counts?: Record<string, number>;
};

export default function SuperAdminClient() {
  const [summary, setSummary] = useState<Summary>({ applications: [], workspaces: [], counts: {} });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const load = async () => {
    setMessage("");
    const response = await fetch("/api/super-admin/summary", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.error || "Login as super admin to view this panel.");
      return;
    }
    setSummary(payload);
  };

  useEffect(() => { load(); }, []);

  const review = async (id: string, action: "approve" | "reject") => {
    setBusy(`${action}:${id}`); setMessage("");
    const response = await fetch("/api/super-admin/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, plan: "trial", subscriptionEnabled: false }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy("");
    if (!response.ok) { setMessage(payload.error || "Could not update application."); return; }
    setMessage(action === "approve" ? "Workspace approved. Owner can now login by email code." : "Application rejected.");
    await load();
  };

  const counts = summary.counts || {};
  const pending = (summary.applications || []).filter((row) => row.status === "pending");

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {message ? <div style={{ ...card, color: message.includes("approved") ? "var(--gcc-emerald)" : "var(--gcc-rose)", fontWeight: 800 }}>{message}</div> : null}
      {!summary.schemaReady && !message ? <div style={card}>SQL foundation pending. Run <code>supabase/sql/001_growth_os_foundation.sql</code>.</div> : null}
      <section style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))" }}>
        {[
          ["Applications", counts.pendingApplications || 0],
          ["Workspaces", counts.approvedWorkspaces || 0],
          ["Subscriptions on", counts.subscriptionsOn || 0],
          ["AI drafts", counts.aiDrafts || 0],
        ].map(([label, value]) => <div key={label} style={card}><p style={{ fontSize: 30, fontWeight: 900, margin: 0, color: "var(--gcc-navy)" }}>{value}</p><p style={{ ...muted, margin: 0 }}>{label}</p></div>)}
      </section>
      <section style={card}>
        <h2 style={{ color: "var(--gcc-navy)", marginTop: 0 }}>Company applications</h2>
        <p style={muted}>Approve companies manually. Subscription can stay off during early controlled launch.</p>
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {pending.length === 0 ? <p style={muted}>No pending companies.</p> : pending.map((row) => (
            <div key={row.id} style={{ border: "1px solid rgba(15,23,42,.1)", borderRadius: 18, padding: 14 }}>
              <strong>{row.company_name}</strong>
              <p style={{ ...muted, margin: "6px 0" }}>{row.contact_name} · {row.contact_email}</p>
              <p style={{ ...muted, margin: "6px 0" }}>{row.use_case || "No use case."}</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button disabled={busy === `approve:${row.id}`} onClick={() => review(row.id, "approve")} style={button}>{busy === `approve:${row.id}` ? "Approving..." : "Approve workspace"}</button>
                <button disabled={busy === `reject:${row.id}`} onClick={() => review(row.id, "reject")} style={secondaryButton}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section style={card}>
        <h2 style={{ color: "var(--gcc-navy)", marginTop: 0 }}>Approved workspaces</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {(summary.workspaces || []).map((row) => <div key={row.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(15,23,42,.08)", paddingBottom: 10 }}><span><strong>{row.company_name}</strong><br /><small style={muted}>{row.owner_email}</small></span><span style={{ color: "var(--gcc-blue)", fontWeight: 800 }}>{row.subscription_enabled ? row.subscription_status : "subscription off"}</span></div>)}
        </div>
      </section>
    </div>
  );
}
