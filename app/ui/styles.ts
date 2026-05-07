import type { CSSProperties } from "react";

export const shell: CSSProperties = { maxWidth: 1180, margin: "0 auto", padding: "30px 20px 56px" };
export const card: CSSProperties = {
  border: "1px solid var(--gcc-line)",
  background: "rgba(255,255,255,.9)",
  borderRadius: 28,
  padding: 22,
  boxShadow: "var(--gcc-shadow)",
  backdropFilter: "blur(18px)",
};
export const input: CSSProperties = {
  width: "100%",
  border: "1px solid rgba(8,58,99,.16)",
  borderRadius: 18,
  padding: "13px 14px",
  marginTop: 7,
  outline: "none",
  background: "rgba(255,255,255,.88)",
  color: "var(--gcc-ink)",
};
export const label: CSSProperties = { display: "block", color: "var(--gcc-ink)", fontWeight: 850, fontSize: 13 };
export const button: CSSProperties = {
  border: 0,
  borderRadius: 18,
  background: "linear-gradient(135deg,var(--gcc-navy),var(--gcc-blue))",
  color: "white",
  padding: "13px 18px",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 14px 32px rgba(11,142,216,.24)",
};
export const secondaryButton: CSSProperties = {
  ...button,
  background: "rgba(255,255,255,.86)",
  color: "var(--gcc-navy)",
  border: "1px solid rgba(8,58,99,.14)",
  boxShadow: "0 12px 28px rgba(6,27,52,.08)",
};
export const navPill: CSSProperties = {
  ...secondaryButton,
  borderRadius: 999,
  padding: "10px 14px",
  fontSize: 13,
  boxShadow: "0 10px 24px rgba(6,27,52,.07)",
};
export const primaryNavPill: CSSProperties = {
  ...navPill,
  background: "linear-gradient(135deg,var(--gcc-navy),var(--gcc-blue))",
  color: "white",
  border: "1px solid rgba(255,255,255,.2)",
};
export const eyebrow: CSSProperties = {
  color: "var(--gcc-blue)",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: ".24em",
  fontWeight: 900,
};
export const muted: CSSProperties = { color: "var(--gcc-muted)", lineHeight: 1.7 };
export const pageTitle: CSSProperties = {
  color: "var(--gcc-navy)",
  fontSize: "clamp(36px,5vw,58px)",
  lineHeight: 1.02,
  letterSpacing: "-0.015em",
  margin: "12px 0",
};
export const aiPanel: CSSProperties = {
  ...card,
  borderColor: "rgba(11,142,216,.2)",
  background:
    "radial-gradient(circle at top left, rgba(35,183,240,.18), transparent 36%), linear-gradient(135deg,rgba(255,255,255,.96),rgba(232,247,255,.94))",
};
export const metricCard: CSSProperties = {
  ...card,
  padding: 18,
  boxShadow: "0 16px 46px rgba(6,27,52,.08)",
  background: "linear-gradient(180deg,rgba(255,255,255,.94),rgba(248,252,255,.9))",
};
export const chip: CSSProperties = {
  border: "1px solid rgba(11,142,216,.18)",
  background: "rgba(232,247,255,.82)",
  color: "var(--gcc-blue)",
  borderRadius: 999,
  padding: "7px 10px",
  fontSize: 12,
  fontWeight: 900,
};
