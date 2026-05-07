import type { CSSProperties } from "react";

export const shell: CSSProperties = { maxWidth: 1120, margin: "0 auto", padding: "36px 20px" };
export const card: CSSProperties = { border: "1px solid rgba(15,23,42,.1)", background: "rgba(255,255,255,.86)", borderRadius: 24, padding: 20, boxShadow: "0 18px 60px rgba(15,23,42,.08)" };
export const input: CSSProperties = { width: "100%", border: "1px solid rgba(15,23,42,.14)", borderRadius: 16, padding: "12px 13px", marginTop: 6, outline: "none" };
export const label: CSSProperties = { display: "block", color: "var(--gcc-ink)", fontWeight: 800, fontSize: 13 };
export const button: CSSProperties = { border: 0, borderRadius: 16, background: "var(--gcc-navy)", color: "white", padding: "12px 16px", fontWeight: 800, cursor: "pointer" };
export const secondaryButton: CSSProperties = { ...button, background: "white", color: "var(--gcc-navy)", border: "1px solid rgba(15,23,42,.14)" };
export const eyebrow: CSSProperties = { color: "var(--gcc-blue)", fontSize: 12, textTransform: "uppercase", letterSpacing: ".24em", fontWeight: 800 };
export const muted: CSSProperties = { color: "var(--gcc-muted)", lineHeight: 1.7 };
