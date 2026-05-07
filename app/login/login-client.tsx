"use client";

import { useState, type FormEvent } from "react";
import { button, card, input, label, muted } from "../ui/styles";

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const requestCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth/request-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not send code.");
      setStep("code"); setMessage("Check your email for the 6-digit code.");
    } catch (err: any) { setError(err.message || "Could not send code."); }
    finally { setBusy(false); }
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth/verify-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not verify code.");
      window.location.href = payload.next || "/workspace";
    } catch (err: any) { setError(err.message || "Could not verify code."); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={step === "email" ? requestCode : verifyCode} style={{ ...card, maxWidth: 520, margin: "60px auto" }}>
      <strong style={{ color: "var(--gcc-navy)", fontSize: 24 }}>Sign in by email</strong>
      <p style={{ ...muted, marginTop: 8 }}>Companies must be approved first. Super admins use their allowlisted email.</p>
      <label style={{ ...label, marginTop: 18 }}>Email<input disabled={step === "code"} required type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={input} /></label>
      {step === "code" ? <label style={{ ...label, marginTop: 14 }}>6-digit code<input required value={code} onChange={(e) => setCode(e.target.value)} style={input} placeholder="123456" /></label> : null}
      {error ? <p style={{ color: "var(--gcc-rose)", fontWeight: 700 }}>{error}</p> : null}
      {message ? <p style={{ color: "var(--gcc-emerald)", fontWeight: 700 }}>{message}</p> : null}
      <button disabled={busy} style={{ ...button, width: "100%", marginTop: 18 }}>{busy ? "Working..." : step === "email" ? "Send code" : "Verify and continue"}</button>
    </form>
  );
}
