"use client";

import { useEffect, useState } from "react";
import { button, card, chip, input, label, metricCard, muted, secondaryButton } from "../ui/styles";

type Summary = {
  ok?: boolean;
  schemaReady?: boolean;
  applications?: any[];
  workspaces?: any[];
  counts?: Record<string, number>;
};

type WorkspaceDraft = {
  status: "approved" | "suspended";
  plan: "trial" | "starter" | "growth" | "enterprise";
  subscriptionEnabled: boolean;
  subscriptionStatus: "off" | "trial" | "active" | "past_due" | "cancelled";
  billingNotes: string;
};

export default function SuperAdminClient() {
  const [summary, setSummary] = useState<Summary>({ applications: [], workspaces: [], counts: {} });
  const [workspaceDrafts, setWorkspaceDrafts] = useState<Record<string, WorkspaceDraft>>({});
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
    setWorkspaceDrafts(
      Object.fromEntries(
        (payload.workspaces || []).map((row: any) => [
          row.id,
          {
            status: row.status === "suspended" ? "suspended" : "approved",
            plan: row.plan || "trial",
            subscriptionEnabled: Boolean(row.subscription_enabled),
            subscriptionStatus: row.subscription_status || "off",
            billingNotes: row.billing_notes || "",
          },
        ])
      )
    );
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

  const setWorkspaceDraft = <K extends keyof WorkspaceDraft>(id: string, key: K, value: WorkspaceDraft[K]) => {
    setWorkspaceDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] || {
          status: "approved",
          plan: "trial",
          subscriptionEnabled: false,
          subscriptionStatus: "off",
          billingNotes: "",
        }),
        [key]: value,
      },
    }));
  };

  const saveWorkspace = async (id: string) => {
    const draft = workspaceDrafts[id];
    if (!draft) return;
    setBusy(`workspace:${id}`);
    setMessage("");
    const response = await fetch("/api/super-admin/workspaces", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: id, ...draft }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy("");
    if (!response.ok) {
      setMessage(payload.error || "Could not update workspace.");
      return;
    }
    setMessage("Workspace subscription controls updated.");
    await load();
  };

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
        ].map(([label, value]) => <div key={label} style={metricCard}><p style={{ fontSize: 31, fontWeight: 950, margin: 0, color: "var(--gcc-navy)" }}>{value}</p><p style={{ ...muted, margin: "4px 0 0" }}>{label}</p></div>)}
      </section>
      <section style={card}>
        <span style={chip}>Needs review</span>
        <h2 style={{ color: "var(--gcc-navy)", marginTop: 12 }}>Company applications</h2>
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
        <span style={chip}>Approved tenants</span>
        <h2 style={{ color: "var(--gcc-navy)", marginTop: 12 }}>Approved workspaces</h2>
        <p style={muted}>Use this to keep beta access free, start trials, upgrade plans, or temporarily suspend a workspace.</p>
        <div style={{ display: "grid", gap: 14 }}>
          {(summary.workspaces || []).map((row) => {
            const draft = workspaceDrafts[row.id] || {
              status: row.status === "suspended" ? "suspended" : "approved",
              plan: row.plan || "trial",
              subscriptionEnabled: Boolean(row.subscription_enabled),
              subscriptionStatus: row.subscription_status || "off",
              billingNotes: row.billing_notes || "",
            };
            return (
              <div key={row.id} style={{ border: "1px solid rgba(8,58,99,.12)", borderRadius: 22, padding: 16, background: "rgba(255,255,255,.68)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                  <span><strong style={{ color: "var(--gcc-navy)" }}>{row.company_name}</strong><br /><small style={muted}>{row.owner_email}</small></span>
                  <span style={chip}>{row.subscription_enabled ? `${row.plan} · ${row.subscription_status}` : "subscription off"}</span>
                </div>
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
                  <label style={label}>
                    Workspace status
                    <select style={input} value={draft.status} onChange={(event) => setWorkspaceDraft(row.id, "status", event.target.value as WorkspaceDraft["status"])}>
                      <option value="approved">Approved</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </label>
                  <label style={label}>
                    Plan
                    <select style={input} value={draft.plan} onChange={(event) => setWorkspaceDraft(row.id, "plan", event.target.value as WorkspaceDraft["plan"])}>
                      <option value="trial">Trial</option>
                      <option value="starter">Starter</option>
                      <option value="growth">Growth</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </label>
                  <label style={label}>
                    Subscription status
                    <select
                      style={input}
                      value={draft.subscriptionStatus}
                      onChange={(event) => setWorkspaceDraft(row.id, "subscriptionStatus", event.target.value as WorkspaceDraft["subscriptionStatus"])}
                    >
                      <option value="off">Off</option>
                      <option value="trial">Trial</option>
                      <option value="active">Active</option>
                      <option value="past_due">Past due</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </label>
                </div>
                <label style={{ ...label, display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
                  <input
                    type="checkbox"
                    checked={draft.subscriptionEnabled}
                    onChange={(event) => setWorkspaceDraft(row.id, "subscriptionEnabled", event.target.checked)}
                  />
                  Subscription enabled
                </label>
                <label style={{ ...label, marginTop: 12 }}>
                  Billing notes
                  <textarea
                    style={{ ...input, minHeight: 76 }}
                    value={draft.billingNotes}
                    onChange={(event) => setWorkspaceDraft(row.id, "billingNotes", event.target.value)}
                    placeholder="Example: free beta until June, founder discount, invoice note..."
                  />
                </label>
                <button disabled={busy === `workspace:${row.id}`} onClick={() => saveWorkspace(row.id)} style={{ ...button, marginTop: 12 }}>
                  {busy === `workspace:${row.id}` ? "Saving..." : "Save controls"}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
