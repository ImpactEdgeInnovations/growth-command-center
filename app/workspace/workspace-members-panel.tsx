"use client";

import { useCallback, useEffect, useState } from "react";
import { button, card, chip, input, label, muted, secondaryButton } from "../ui/styles";

type Member = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  status: string;
  joined_at: string | null;
  created_at: string;
};

export default function WorkspaceMembersPanel({ workspaceId }: { workspaceId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("member");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const loadMembers = useCallback(() => {
    fetch(`/api/workspace/members?workspaceId=${workspaceId}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Could not load team access.");
        setMembers(payload.members || []);
        setCanManage(Boolean(payload.canManage));
      })
      .catch((error) => setMessage(error.message || "Could not load team access."));
  }, [workspaceId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const inviteMember = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/workspace/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, email, fullName, role }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not invite teammate.");
      setEmail("");
      setFullName("");
      setRole("member");
      setMessage("Invite saved. They can log in with this email and receive a verification code.");
      loadMembers();
    } catch (error: any) {
      setMessage(error.message || "Could not invite teammate.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <span style={chip}>Team access</span>
          <h2 style={{ color: "var(--gcc-navy)", margin: "10px 0 6px" }}>Invite teammates safely</h2>
          <p style={{ ...muted, maxWidth: 680, margin: 0 }}>
            Add marketers, founders, operators, or investor-relations teammates. Each person logs in by email code,
            and their role controls how much they can change.
          </p>
        </div>
        <span style={{ ...chip, background: canManage ? "rgba(232,247,255,.82)" : "rgba(244,247,250,.9)", color: canManage ? "var(--gcc-blue)" : "var(--gcc-muted)" }}>
          {canManage ? "Owner/admin controls enabled" : "View-only access"}
        </span>
      </div>

      {message ? (
        <p style={{ ...muted, color: message.toLowerCase().includes("could not") || message.toLowerCase().includes("only") ? "var(--gcc-rose)" : "var(--gcc-emerald)", fontWeight: 850 }}>
          {message}
        </p>
      ) : null}

      {canManage ? (
        <form onSubmit={inviteMember} style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", alignItems: "end", marginTop: 16 }}>
          <label style={label}>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" placeholder="teammate@company.com" style={input} />
          </label>
          <label style={label}>
            Name
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Optional" style={input} />
          </label>
          <label style={label}>
            Role
            <select value={role} onChange={(event) => setRole(event.target.value)} style={input}>
              <option value="admin">Admin - manage workspace</option>
              <option value="member">Member - add execution data</option>
              <option value="viewer">Viewer - read only</option>
            </select>
          </label>
          <button disabled={busy} style={button}>{busy ? "Saving invite..." : "Invite teammate"}</button>
        </form>
      ) : null}

      <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
        {members.length === 0 ? (
          <p style={muted}>No teammates invited yet.</p>
        ) : (
          members.map((member) => (
            <div key={member.id} style={{ ...secondaryButton, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", boxShadow: "none", cursor: "default" }}>
              <div>
                <strong style={{ color: "var(--gcc-navy)" }}>{member.full_name || member.email || "Invited teammate"}</strong>
                <p style={{ ...muted, margin: "3px 0 0", fontSize: 13 }}>{member.email}</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={chip}>{member.role}</span>
                <span style={{ ...chip, background: member.status === "active" ? "rgba(236,253,245,.9)" : "rgba(255,251,235,.9)", color: member.status === "active" ? "var(--gcc-emerald)" : "var(--gcc-amber)" }}>
                  {member.status === "active" ? "Active" : "Invited"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
