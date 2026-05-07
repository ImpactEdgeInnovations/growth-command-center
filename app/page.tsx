import AccessRequestForm from "./ui/access-request-form";

const features = [
  ["Upload plans", "Upload Markdown/text plans now, extract the plan, and convert it into human-approved targets and tasks."],
  ["Investor CRM", "Track companies contacted, responses, stages, and next follow-ups."],
  ["Team accountability", "See what marketers, founders, and operators promised and delivered."],
  ["AI advisor", "Ask for summaries and recommendations, then approve before anything is sent."],
];

const eyebrow = { color: "var(--gcc-blue)", fontSize: 12, textTransform: "uppercase" as const, letterSpacing: ".24em", fontWeight: 800 };
const pill = { border: "1px solid rgba(15,23,42,.12)", borderRadius: 999, padding: "9px 14px", background: "rgba(255,255,255,.72)", color: "var(--gcc-ink)", fontSize: 14, fontWeight: 700 };
const pillDark = { ...pill, background: "var(--gcc-navy)", color: "white" };
const cta = { ...pillDark, padding: "13px 18px" };
const secondary = { ...pill, padding: "13px 18px" };

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", padding: "32px 20px" }}>
      <nav style={{ maxWidth: 1120, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ color: "var(--gcc-navy)", fontSize: 20 }}>Growth Command Center</strong>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/super-admin" style={pill}>Super admin</a>
          <a href="/login" style={pill}>Login</a>
          <a href="/workspace" style={pillDark}>Workspace demo</a>
        </div>
      </nav>

      <section style={{ maxWidth: 1120, margin: "64px auto 0", display: "grid", gap: 28, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", alignItems: "center" }}>
        <div>
          <p style={eyebrow}>Spin-off ready Growth OS</p>
          <h1 style={{ fontSize: "clamp(38px, 6vw, 68px)", lineHeight: 1, margin: "18px 0", color: "var(--gcc-navy)", letterSpacing: -2 }}>
            Run growth like an operating system, not a scattered notebook.
          </h1>
          <p style={{ color: "var(--gcc-muted)", fontSize: 17, lineHeight: 1.75, maxWidth: 640 }}>
            Track growth targets, investor outreach, marketer activity, social progress,
            founder priorities, and AI recommendations from one multi-company workspace.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 26, flexWrap: "wrap" }}>
            <a href="/plans" style={cta}>Upload growth plan</a>
            <a href="/ai-advisor" style={secondary}>Ask AI advisor</a>
            <a href="/weekly-review" style={secondary}>Weekly review</a>
          </div>
        </div>

        <div>
          <AccessRequestForm />
        </div>
        <div style={{ border: "1px solid rgba(15, 23, 42, 0.1)", background: "rgba(255,255,255,.82)", borderRadius: 30, padding: 22, boxShadow: "0 24px 80px rgba(15, 23, 42, .12)", gridColumn: "1 / -1" }}>
          <p style={eyebrow}>How companies get in</p>
          <ol style={{ margin: "14px 0 0", paddingLeft: 20, color: "var(--gcc-muted)", lineHeight: 1.8 }}>
            <li>Company requests access.</li>
            <li>Super admin approves workspace.</li>
            <li>Owner invites team members.</li>
            <li>Team uploads a growth plan or creates one manually.</li>
            <li>AI converts it into draft targets and tasks for human approval.</li>
          </ol>
        </div>
      </section>

      <section style={{ maxWidth: 1120, margin: "42px auto 0", display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
        {features.map(([title, body]) => (
          <div key={title} style={{ border: "1px solid rgba(15, 23, 42, 0.08)", background: "rgba(255,255,255,.76)", borderRadius: 24, padding: 18 }}>
            <strong style={{ color: "var(--gcc-navy)" }}>{title}</strong>
            <p style={{ color: "var(--gcc-muted)", lineHeight: 1.65, fontSize: 14 }}>{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
