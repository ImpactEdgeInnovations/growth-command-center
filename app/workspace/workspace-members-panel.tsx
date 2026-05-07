"use client";

import { useCallback, useEffect, useState } from "react";
import { button, card, chip, input, label, muted, secondaryButton } from "../ui/styles";

type Member = {
  id: string;
  user_id: string | null;
  email: string | null;
  full_name: string | null;
  role: string;
  status: string;
  joined_at: string | null;
  created_at: string;
};

const roleNotes = [
  ["Admin", "Invite teammates and manage growth execution."],
  ["Member", "Add tasks, outreach, marketing logs, and reviews."],
  ["Viewer", "Read-only access for advisors or observers."],
];

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

  const updateMember = async (memberId: string, nextRole: string, nextStatus: string) => {
    setMessage("");
    const response = await fetch("/api/workspace/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, memberId, role: nextRole, status: nextStatus }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Could not update teammate access.");
    setMessage("Team access updated and logged.");
    loadMembers();
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

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", marginTop: 16 }}>
        {roleNotes.map(([title, note]) => (
          <div key={title} style={{ border: "1px solid rgba(8,58,99,.1)", borderRadius: 20, padding: 14, background: "rgba(248,252,255,.82)" }}>
            <strong style={{ color: "var(--gcc-navy)" }}>{title}</strong>
            <p style={{ ...muted, margin: "4px 0 0", fontSize: 13 }}>{note}</p>
          </div>
        ))}
      </div>

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
            <MemberAccessRow key={member.id} member={member} canManage={canManage} onUpdate={updateMember} />
          ))
        )}
      </div>
    </section>
  );
}

function MemberAccessRow({
  member,
  canManage,
  onUpdate,
}: {
  member: Member;
  canManage: boolean;
  onUpdate: (memberId: string, role: string, status: string) => Promise<void>;
}) {
  const [rowRole, setRowRole] = useState(member.role === "owner" ? "admin" : member.role);
  const [rowStatus, setRowStatus] = useState(member.status);
  const [busy, setBusy] = useState(false);
  const [rowMessage, setRowMessage] = useState("");
  const isOwner = member.role === "owner";

  useEffect(() => {
    setRowRole(member.role === "owner" ? "admin" : member.role);
    setRowStatus(member.status);
  }, [member.role, member.status]);

  const save = async () => {
    setBusy(true);
    setRowMessage("");
    try {
      await onUpdate(member.id, rowRole, rowStatus);
    } catch (error: any) {
      setRowMessage(error.message || "Could not update access.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ ...secondaryButton, display: "grid", gap: 12, boxShadow: "none", cursor: "default", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <strong style={{ color: "var(--gcc-navy)" }}>{member.full_name || member.email || "Invited teammate"}</strong>
          <p style={{ ...muted, margin: "3px 0 0", fontSize: 13 }}>{member.email}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={chip}>{member.role}</span>
          <span style={{ ...chip, background: member.status === "active" ? "rgba(236,253,245,.9)" : member.status === "suspended" || member.status === "removed" ? "rgba(255,241,242,.92)" : "rgba(255,251,235,.9)", color: member.status === "active" ? "var(--gcc-emerald)" : member.status === "suspended" || member.status === "removed" ? "var(--gcc-rose)" : "var(--gcc-amber)" }}>
            {member.status}
          </span>
        </div>
      </div>

      {canManage ? (
        isOwner ? (
          <p style={{ ...muted, margin: 0, fontSize: 13 }}>Owner access is locked here. Super admin controls owner-level changes.</p>
        ) : (
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", alignItems: "end" }}>
            <label style={label}>
              Role
              <select value={rowRole} onChange={(event) => setRowRole(event.target.value)} style={input}>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>
            <label style={label}>
              Status
              <select value={rowStatus} onChange={(event) => setRowStatus(event.target.value)} style={input}>
                <option value="invited">Invited</option>
                <option value="active" disabled={!member.user_id}>Active</option>
                <option value="suspended">Suspended</option>
                <option value="removed">Removed</option>
              </select>
            </label>
            <button type="button" disabled={busy || (rowRole === member.role && rowStatus === member.status)} onClick={save} style={button}>
              {busy ? "Saving..." : "Save access"}
            </button>
          </div>
        )
      ) : null}
      {rowMessage ? <p style={{ ...muted, color: "var(--gcc-rose)", fontSize: 13, margin: 0 }}>{rowMessage}</p> : null}
    </div>
  );
}
