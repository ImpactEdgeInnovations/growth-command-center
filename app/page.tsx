import AccessRequestForm from "./ui/access-request-form";
import { card, chip, muted, navPill, primaryNavPill } from "./ui/styles";

const features = [
  ["AI plan builder", "Describe the business, draft a growth plan with AI, then approve targets and tasks before they become real work."],
  ["Investor CRM", "Track companies contacted, responses, stages, and next follow-ups."],
  ["Team accountability", "See what marketers, founders, and operators promised and delivered."],
  ["AI advisor", "Ask for summaries and recommendations, then approve before anything is sent."],
];

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", padding: "28px 20px 58px" }}>
      <nav style={{ maxWidth: 1180, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <strong style={{ color: "var(--gcc-navy)", fontSize: 21, letterSpacing: -.5 }}>Growth Command Center</strong>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/super-admin" style={navPill}>Super admin</a>
          <a href="/login" style={navPill}>Login</a>
          <a href="/workspace" style={primaryNavPill}>Workspace</a>
        </div>
      </nav>

      <section style={{ maxWidth: 1180, margin: "64px auto 0", display: "grid", gap: 30, gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", alignItems: "center" }}>
        <div>
          <p style={chip}>AI-native growth operating system</p>
          <h1 style={{ fontSize: "clamp(42px, 6vw, 76px)", lineHeight: 1.02, margin: "18px 0", color: "var(--gcc-navy)", letterSpacing: "-0.018em", maxWidth: 780 }}>
            Run growth like an operating system, not a scattered notebook.
          </h1>
          <p style={{ ...muted, fontSize: 18, maxWidth: 670 }}>
            Track growth targets, investor outreach, marketer activity, social progress,
            founder priorities, and AI recommendations from one multi-company workspace.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 26, flexWrap: "wrap" }}>
            <a href="/plans" style={{ ...primaryNavPill, padding: "14px 18px" }}>Draft plan with AI</a>
            <a href="/ai-advisor" style={{ ...navPill, padding: "14px 18px" }}>Ask AI advisor</a>
            <a href="/weekly-review" style={{ ...navPill, padding: "14px 18px" }}>Weekly review</a>
          </div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", marginTop: 28, maxWidth: 650 }}>
            {["Plan", "Execute", "Review"].map((item, index) => (
              <div key={item} style={{ ...card, padding: 14, boxShadow: "0 12px 34px rgba(6,27,52,.07)" }}>
                <span style={{ ...chip, background: "rgba(255,255,255,.78)" }}>0{index + 1}</span>
                <strong style={{ display: "block", color: "var(--gcc-navy)", marginTop: 12 }}>{item}</strong>
              </div>
            ))}
          </div>
        </div>

        <div>
          <AccessRequestForm />
        </div>
        <div style={{ ...card, gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14 }}>
          <div>
            <p style={chip}>How companies get in</p>
            <strong style={{ display: "block", color: "var(--gcc-navy)", fontSize: 24, marginTop: 12 }}>Controlled access, clean onboarding.</strong>
          </div>
          <ol style={{ margin: "14px 0 0", paddingLeft: 20, color: "var(--gcc-muted)", lineHeight: 1.8 }}>
            <li>Company requests access.</li>
            <li>Super admin approves workspace.</li>
            <li>Owner invites team members.</li>
            <li>Team uploads a growth plan or creates one manually.</li>
            <li>AI converts it into draft targets and tasks for human approval.</li>
          </ol>
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "42px auto 0", display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
        {features.map(([title, body]) => (
          <div key={title} style={{ ...card, padding: 18, boxShadow: "0 14px 38px rgba(6,27,52,.07)" }}>
            <strong style={{ color: "var(--gcc-navy)" }}>{title}</strong>
            <p style={{ color: "var(--gcc-muted)", lineHeight: 1.65, fontSize: 14 }}>{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
