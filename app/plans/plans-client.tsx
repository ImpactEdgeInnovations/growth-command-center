"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { aiPanel, button, card, chip, input, label, muted, secondaryButton } from "../ui/styles";

type SavedPlan = {
  id: string;
  title: string;
  status?: string;
  ai_status?: string;
  source_type?: string;
};

type PlanSuggestions = {
  summary: string;
  targets: Array<{ label: string; metricKey?: string; targetValue: number; notes?: string }>;
  milestones: Array<{ title: string; description?: string; ownerName?: string }>;
  tasks: Array<{ title: string; lane: string; assigneeName?: string; priority: string; notes?: string }>;
  investors: Array<{
    investorName: string;
    companyName?: string;
    contactName?: string;
    contactEmail?: string;
    stage: string;
    status: string;
    source?: string;
    lastResponse?: string;
    notes?: string;
  }>;
};

type ProspectResearch = {
  summary: string;
  prospects: PlanSuggestions["investors"];
  outreachTargets: PlanSuggestions["targets"];
  outreachTasks: PlanSuggestions["tasks"];
  feedbackQuestions: Array<{ question: string; askTo?: string; whyAsk?: string }>;
  emailAngles: Array<{ audience?: string; subject: string; message: string }>;
  sources: Array<{ title?: string; url: string }>;
};

type SuggestionSelection = {
  targets: boolean[];
  milestones: boolean[];
  tasks: boolean[];
  investors: boolean[];
};

type DraftBrief = {
  companyName: string;
  companyWebsite: string;
  businessType: string;
  stage: "idea" | "early" | "growing" | "fundraising" | "scaling";
  topGoal: string;
  market: string;
  channels: string;
  outreachContext: string;
  context: string;
};

const checkedAll = (suggestions: PlanSuggestions): SuggestionSelection => ({
  targets: suggestions.targets.map(() => true),
  milestones: suggestions.milestones.map(() => true),
  tasks: suggestions.tasks.map(() => true),
  investors: suggestions.investors.map(() => true),
});

export default function PlansClient() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [draftBrief, setDraftBrief] = useState<DraftBrief>({
    companyName: "",
    companyWebsite: "",
    businessType: "",
    stage: "early",
    topGoal: "",
    market: "",
    channels: "",
    outreachContext: "",
    context: "",
  });
  const [contextFileName, setContextFileName] = useState("");
  const [prospectResearch, setProspectResearch] = useState<ProspectResearch | null>(null);
  const [researchModel, setResearchModel] = useState("");
  const [researchBriefId, setResearchBriefId] = useState("");
  const [researchSelection, setResearchSelection] = useState<boolean[]>([]);
  const [researchTargetSelection, setResearchTargetSelection] = useState<boolean[]>([]);
  const [researchTaskSelection, setResearchTaskSelection] = useState<boolean[]>([]);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [targetLabel, setTargetLabel] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState<PlanSuggestions | null>(null);
  const [selection, setSelection] = useState<SuggestionSelection>({ targets: [], milestones: [], tasks: [], investors: [] });
  const [briefId, setBriefId] = useState("");
  const [suggestionModel, setSuggestionModel] = useState("");
  const [busy, setBusy] = useState<"draft" | "research" | "saveResearch" | "plan" | "upload" | "target" | "milestone" | "suggest" | "approve" | null>(null);

  const loadWorkspace = () => {
    fetch("/api/workspace/summary", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        const nextWorkspaceId = payload.workspace?.id || "";
        const nextPlans = payload.recent?.plans || [];
        setWorkspaceId(nextWorkspaceId);
        setPlans(nextPlans);
        setSelectedPlanId((current) => current || nextPlans[0]?.id || "");
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  const setDraftField = <K extends keyof DraftBrief>(key: K, value: DraftBrief[K]) => {
    setDraftBrief((current) => ({ ...current, [key]: value }));
  };

  const onDraftContextFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setMessage("Use a Markdown/text context file under 1MB for the AI business brief.");
      event.currentTarget.value = "";
      return;
    }
    const extensionOk = /\.(md|markdown|txt)$/i.test(file.name);
    if (!extensionOk) {
      setMessage("For AI context, upload .md, .markdown, or .txt. PDF/DOCX extraction comes later.");
      event.currentTarget.value = "";
      return;
    }
    const fileText = await file.text();
    const clipped = fileText.slice(0, 9000);
    setContextFileName(file.name);
    setDraftBrief((current) => ({
      ...current,
      context: [
        current.context,
        `\n\n## Uploaded business context (${file.name})\n${clipped}`,
      ].filter(Boolean).join("\n").slice(0, 12000),
    }));
    setMessage("Context file added. AI will use it to understand your plan, tables, checklists, contacts, and weekly targets.");
  };

  const generatePlanDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("draft"); setMessage("");
    try {
      const response = await fetch("/api/ai/plan-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, ...draftBrief }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not draft growth plan.");
      setTitle(payload.title || `${draftBrief.companyName} Growth Plan`);
      setText(payload.planText || "");
      setMessage(`AI drafted a plan using ${payload.model}. Review it below, edit anything you want, then save it as a growth plan.`);
    } catch (err: any) { setMessage(err.message || "Could not draft growth plan."); }
    finally { setBusy(null); }
  };

  const researchProspects = async () => {
    setBusy("research"); setMessage(""); setProspectResearch(null); setResearchBriefId(""); setResearchSelection([]); setResearchTargetSelection([]); setResearchTaskSelection([]);
    try {
      const response = await fetch("/api/ai/research-prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, ...draftBrief }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not research prospects.");
      const research = {
        summary: payload.research?.summary || "AI research draft is ready.",
        prospects: payload.research?.prospects || [],
        outreachTargets: payload.research?.outreachTargets || [],
        outreachTasks: payload.research?.outreachTasks || [],
        feedbackQuestions: payload.research?.feedbackQuestions || [],
        emailAngles: payload.research?.emailAngles || [],
        sources: payload.research?.sources || [],
      };
      setProspectResearch(research);
      setResearchModel(payload.model || "");
      setResearchBriefId(payload.brief?.id || "");
      setResearchSelection(research.prospects.map(() => true));
      setResearchTargetSelection(research.outreachTargets.map(() => true));
      setResearchTaskSelection(research.outreachTasks.map(() => true));
      setMessage("Growth operator draft is ready. Review who to contact, weekly targets, tasks, email angles, and feedback questions before saving.");
    } catch (err: any) {
      setMessage(err.message || "Could not research prospects.");
    } finally {
      setBusy(null);
    }
  };

  const cleanCell = (value?: string) => (value || "").replace(/\|/g, "/").replace(/\s+/g, " ").trim();

  const appendResearchToOutreachContext = () => {
    if (!prospectResearch?.prospects?.length) {
      setMessage("No research prospects to add yet.");
      return;
    }
    const selectedProspects = prospectResearch.prospects.filter((_, index) => researchSelection[index]);
    const selectedTargets = prospectResearch.outreachTargets.filter((_, index) => researchTargetSelection[index]);
    const selectedTasks = prospectResearch.outreachTasks.filter((_, index) => researchTaskSelection[index]);
    if (!selectedProspects.length && !selectedTargets.length && !selectedTasks.length) {
      setMessage("Select at least one prospect, target, or task before adding research to the plan context.");
      return;
    }
    const sections = [
      selectedProspects.length
        ? [
            "## AI researched prospects",
            "| Company / Investor | Contact | Email | Stage | Source | Notes |",
            "| --- | --- | --- | --- | --- | --- |",
            ...selectedProspects.map((item) =>
              `| ${cleanCell(item.companyName || item.investorName)} | ${cleanCell(item.contactName)} | ${cleanCell(item.contactEmail)} | ${cleanCell(item.stage || "identified")} | ${cleanCell(item.source)} | ${cleanCell(item.notes)} |`
            ),
          ].join("\n")
        : "",
      selectedTargets.length
        ? [
            "## AI weekly outreach targets",
            ...selectedTargets.map((target) => `- ${target.label}: ${target.targetValue}${target.metricKey ? ` (${target.metricKey})` : ""}${target.notes ? ` — ${target.notes}` : ""}`),
          ].join("\n")
        : "",
      selectedTasks.length
        ? [
            "## AI outreach tasks",
            ...selectedTasks.map((task) => `- [${task.priority}] ${task.title}${task.notes ? ` — ${task.notes}` : ""}`),
          ].join("\n")
        : "",
      prospectResearch.feedbackQuestions.length
        ? [
            "## Feedback questions to ask",
            ...prospectResearch.feedbackQuestions.map((item) => `- ${item.question}${item.askTo ? ` (${item.askTo})` : ""}${item.whyAsk ? ` — ${item.whyAsk}` : ""}`),
          ].join("\n")
        : "",
    ].filter(Boolean).join("\n\n");
    setDraftField("outreachContext", [draftBrief.outreachContext, sections].filter(Boolean).join("\n\n").slice(0, 8000));
    setMessage("Research added to the outreach field. You can edit it before drafting or saving anything.");
  };

  const toggleResearchSelection = (index: number) => {
    setResearchSelection((current) => current.map((checked, itemIndex) => (itemIndex === index ? !checked : checked)));
  };
  const toggleResearchTargetSelection = (index: number) => {
    setResearchTargetSelection((current) => current.map((checked, itemIndex) => (itemIndex === index ? !checked : checked)));
  };
  const toggleResearchTaskSelection = (index: number) => {
    setResearchTaskSelection((current) => current.map((checked, itemIndex) => (itemIndex === index ? !checked : checked)));
  };

  const saveResearchToOutreach = async () => {
    if (!prospectResearch) {
      setMessage("No AI research to save yet.");
      return;
    }
    const selectedProspects = prospectResearch.prospects.filter((_, index) => researchSelection[index]);
    const selectedTargets = prospectResearch.outreachTargets.filter((_, index) => researchTargetSelection[index]);
    const selectedTasks = prospectResearch.outreachTasks.filter((_, index) => researchTaskSelection[index]);
    if (!selectedProspects.length && !selectedTargets.length && !selectedTasks.length) {
      setMessage("Select at least one prospect, target, or task before saving.");
      return;
    }
    setBusy("saveResearch"); setMessage("");
    try {
      const response = await fetch("/api/ai/research-prospects/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, briefId: researchBriefId || null, prospects: selectedProspects, targets: selectedTargets, tasks: selectedTasks }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save researched action plan.");
      setMessage(`Saved research plan: ${payload.saved?.prospects?.length || 0} outreach records, ${payload.saved?.targets?.length || 0} targets, ${payload.saved?.tasks?.length || 0} tasks.`);
      setProspectResearch(null);
      setResearchSelection([]);
      setResearchTargetSelection([]);
      setResearchTaskSelection([]);
      setResearchBriefId("");
      loadWorkspace();
    } catch (err: any) {
      setMessage(err.message || "Could not save researched prospects.");
    } finally {
      setBusy(null);
    }
  };

  const savePlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("plan"); setMessage("");
    try {
      const response = await fetch("/api/workspace/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, title, extractedText: text, sourceType: "manual" }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save plan.");
      setMessage("Growth plan saved. Next: generate AI suggestions and approve only what you want to create.");
      setTitle(""); setText("");
      loadWorkspace();
    } catch (err: any) { setMessage(err.message || "Could not save plan."); }
    finally { setBusy(null); }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUploadFile(event.target.files?.[0] || null);
  };

  const uploadPlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!uploadFile) {
      setMessage("Choose a .md, .markdown, or .txt file first.");
      return;
    }
    setBusy("upload"); setMessage("");
    try {
      const formData = new FormData();
      formData.append("workspaceId", workspaceId);
      formData.append("title", uploadTitle);
      formData.append("file", uploadFile);
      const response = await fetch("/api/workspace/plans/upload", { method: "POST", body: formData });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not upload plan.");
      setMessage("Plan uploaded privately and text extracted. Next: generate draft targets and tasks.");
      setUploadTitle("");
      setUploadFile(null);
      event.currentTarget.reset();
      loadWorkspace();
    } catch (err: any) { setMessage(err.message || "Could not upload plan."); }
    finally { setBusy(null); }
  };

  const generateSuggestions = async () => {
    if (!selectedPlanId) {
      setMessage("Save or upload a plan first, then choose it for AI suggestions.");
      return;
    }
    setBusy("suggest"); setMessage(""); setSuggestions(null);
    try {
      const response = await fetch("/api/ai/plan-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, growthPlanId: selectedPlanId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not generate AI suggestions.");
      setSuggestions(payload.suggestions);
      setSelection(checkedAll(payload.suggestions));
      setBriefId(payload.brief?.id || "");
      setSuggestionModel(payload.model || "");
      setMessage("AI suggestions are ready. Review them first; nothing is saved until you approve.");
      loadWorkspace();
    } catch (err: any) { setMessage(err.message || "Could not generate AI suggestions."); }
    finally { setBusy(null); }
  };

  const toggleSuggestion = (section: keyof SuggestionSelection, index: number) => {
    setSelection((current) => ({
      ...current,
      [section]: current[section].map((checked, itemIndex) => (itemIndex === index ? !checked : checked)),
    }));
  };

  const approveSuggestions = async () => {
    if (!suggestions) return;
    setBusy("approve"); setMessage("");
    const approved = {
      targets: suggestions.targets.filter((_, index) => selection.targets[index]),
      milestones: suggestions.milestones.filter((_, index) => selection.milestones[index]),
      tasks: suggestions.tasks.filter((_, index) => selection.tasks[index]),
      investors: suggestions.investors.filter((_, index) => selection.investors[index]),
    };
    try {
      const response = await fetch("/api/ai/plan-suggestions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, growthPlanId: selectedPlanId, briefId: briefId || null, ...approved }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not approve suggestions.");
      setMessage(`Approved and saved: ${payload.saved?.targets?.length || 0} targets, ${payload.saved?.milestones?.length || 0} milestones, ${payload.saved?.tasks?.length || 0} tasks, ${payload.saved?.investors?.length || 0} outreach records.`);
      setSuggestions(null);
      setBriefId("");
      setSuggestionModel("");
      loadWorkspace();
    } catch (err: any) { setMessage(err.message || "Could not approve suggestions."); }
    finally { setBusy(null); }
  };

  const saveTarget = async () => {
    setBusy("target"); setMessage("");
    try {
      const response = await fetch("/api/workspace/targets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, label: targetLabel, targetValue: Number(targetValue || 0) }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save target.");
      setMessage("Target saved."); setTargetLabel(""); setTargetValue("");
      loadWorkspace();
    } catch (err: any) { setMessage(err.message || "Could not save target."); }
    finally { setBusy(null); }
  };

  const saveMilestone = async () => {
    setBusy("milestone"); setMessage("");
    try {
      const response = await fetch("/api/workspace/milestones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, title: milestoneTitle }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save milestone.");
      setMessage("Milestone saved."); setMilestoneTitle("");
      loadWorkspace();
    } catch (err: any) { setMessage(err.message || "Could not save milestone."); }
    finally { setBusy(null); }
  };

  return (
    <div style={{ display: "grid", gap: 20, width: "100%" }}>
      {!workspaceId ? <div style={card}>Login to an approved workspace before saving plans.</div> : null}
      {message ? <div style={card}>{message}</div> : null}

      <form onSubmit={generatePlanDraft} style={aiPanel}>
        <div style={chip}>AI-first planning</div>
        <h2 style={{ color: "var(--gcc-navy)", fontSize: 30, letterSpacing: -1, margin: "8px 0" }}>Let AI draft the first growth plan</h2>
        <p style={{ ...muted, maxWidth: 820 }}>
          Describe the business in plain language. AI drafts a practical plan, then you edit and save it.
          Nothing becomes official until a human approves it.
        </p>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
          <label style={label}>Company name<input required style={input} value={draftBrief.companyName} onChange={(event) => setDraftField("companyName", event.target.value)} placeholder="Acme Foods" /></label>
          <label style={label}>Website<input style={input} value={draftBrief.companyWebsite} onChange={(event) => setDraftField("companyWebsite", event.target.value)} placeholder="https://example.com" /></label>
          <label style={label}>Business type<input required style={input} value={draftBrief.businessType} onChange={(event) => setDraftField("businessType", event.target.value)} placeholder="B2B lending platform, restaurant, agency..." /></label>
          <label style={label}>
            Stage
            <select style={input} value={draftBrief.stage} onChange={(event) => setDraftField("stage", event.target.value as DraftBrief["stage"])}>
              <option value="idea">Idea / pre-launch</option>
              <option value="early">Early users</option>
              <option value="growing">Growing</option>
              <option value="fundraising">Fundraising</option>
              <option value="scaling">Scaling</option>
            </select>
          </label>
        </div>
        <label style={{ ...label, marginTop: 14 }}>Main goal<textarea required style={{ ...input, minHeight: 82 }} value={draftBrief.topGoal} onChange={(event) => setDraftField("topGoal", event.target.value)} placeholder="Example: reach 40 investors, onboard 100 paying customers, launch in Nairobi, improve social growth..." /></label>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", marginTop: 14 }}>
          <label style={label}>Target market<input style={input} value={draftBrief.market} onChange={(event) => setDraftField("market", event.target.value)} placeholder="Kenyan SMEs, lenders, founders, restaurants..." /></label>
          <label style={label}>Channels to use<input style={input} value={draftBrief.channels} onChange={(event) => setDraftField("channels", event.target.value)} placeholder="LinkedIn, WhatsApp, investor email, referrals..." /></label>
        </div>
        <label style={{ ...label, marginTop: 14 }}>
          Who should we talk to?
          <textarea
            style={{ ...input, minHeight: 100 }}
            value={draftBrief.outreachContext}
            onChange={(event) => setDraftField("outreachContext", event.target.value)}
            placeholder={"Paste target companies, investors, partners, emails, or a small table. Example:\n| Company | Contact | Email | Notes |\n| Acme Capital | Jane Doe | jane@example.com | Warm intro needed |"}
          />
        </label>
        <p style={{ ...muted, margin: "8px 0 0", fontSize: 13 }}>
          AI can research who to talk to, suggest weekly email/meeting targets, draft first-message angles, and give feedback questions. It will not invent verified email addresses.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" disabled={!!busy || !workspaceId || !draftBrief.companyName || !draftBrief.businessType || !draftBrief.topGoal} onClick={researchProspects} style={secondaryButton}>
            {busy === "research" ? "Researching..." : "Research prospects with AI"}
          </button>
          {prospectResearch &&
          prospectResearch.prospects.length + prospectResearch.outreachTargets.length + prospectResearch.outreachTasks.length > 0 ? (
            <>
              <button type="button" disabled={!!busy} onClick={saveResearchToOutreach} style={button}>{busy === "saveResearch" ? "Saving..." : "Save selected action plan"}</button>
              <button type="button" disabled={!!busy} onClick={appendResearchToOutreachContext} style={secondaryButton}>Use selected in plan context</button>
            </>
          ) : null}
        </div>
        {prospectResearch ? (
          <div style={{ ...card, boxShadow: "none", marginTop: 14 }}>
            <strong style={{ color: "var(--gcc-navy)" }}>AI research draft</strong>
            <p style={{ ...muted, margin: "6px 0 10px" }}>{prospectResearch.summary}</p>
            {researchModel ? <p style={{ ...muted, fontSize: 12 }}>Model: {researchModel} · review before use</p> : null}
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", margin: "12px 0" }}>
              {[
                ["Prospects", prospectResearch.prospects.length],
                ["Weekly targets", prospectResearch.outreachTargets.length],
                ["Next tasks", prospectResearch.outreachTasks.length],
                ["Feedback prompts", prospectResearch.feedbackQuestions.length],
              ].map(([title, value]) => (
                <div key={title} style={{ border: "1px solid rgba(8,58,99,.1)", borderRadius: 18, padding: 12, background: "rgba(248,252,255,.9)" }}>
                  <div style={{ color: "var(--gcc-navy)", fontWeight: 900, fontSize: 20 }}>{value}</div>
                  <div style={{ ...muted, fontSize: 12, lineHeight: 1.35 }}>{title}</div>
                </div>
              ))}
            </div>
            {prospectResearch.prospects.length ? (
              <div style={{ overflowX: "auto" }}>
                <strong style={{ color: "var(--gcc-navy)", fontSize: 14 }}>Who to talk to first</strong>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                  <thead>
                    <tr>
                      {["Use", "Company / Investor", "Contact", "Email", "Stage", "Notes"].map((heading) => (
                        <th key={heading} style={{ textAlign: "left", color: "var(--gcc-navy)", borderBottom: "1px solid rgba(8,58,99,.12)", padding: "8px 6px", fontSize: 12 }}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {prospectResearch.prospects.map((item, index) => (
                      <tr key={`${item.investorName}-${index}`}>
                        <td style={{ padding: "8px 6px" }}>
                          <input aria-label={`Select ${item.companyName || item.investorName}`} type="checkbox" checked={researchSelection[index] ?? true} onChange={() => toggleResearchSelection(index)} />
                        </td>
                        <td style={{ padding: "8px 6px", color: "var(--gcc-ink)" }}>{item.companyName || item.investorName}</td>
                        <td style={{ padding: "8px 6px", color: "var(--gcc-muted)" }}>{item.contactName || "Research needed"}</td>
                        <td style={{ padding: "8px 6px", color: "var(--gcc-muted)" }}>{item.contactEmail || "Not verified"}</td>
                        <td style={{ padding: "8px 6px", color: "var(--gcc-muted)" }}>{item.stage}</td>
                        <td style={{ padding: "8px 6px", color: "var(--gcc-muted)" }}>{item.notes || item.source || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p style={muted}>No verified prospects returned. Add known targets manually or broaden the market/context.</p>}
            {prospectResearch.outreachTargets.length ? (
              <div style={{ marginTop: 18 }}>
                <strong style={{ color: "var(--gcc-navy)", fontSize: 14 }}>Targets to hit this week</strong>
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", marginTop: 10 }}>
                  {prospectResearch.outreachTargets.map((target, index) => (
                    <label key={`${target.label}-${index}`} style={{ display: "flex", gap: 10, alignItems: "flex-start", border: "1px solid rgba(8,58,99,.1)", borderRadius: 18, padding: 12, background: "rgba(255,255,255,.78)" }}>
                      <input type="checkbox" checked={researchTargetSelection[index] ?? true} onChange={() => toggleResearchTargetSelection(index)} />
                      <span>
                        <strong style={{ color: "var(--gcc-navy)" }}>{target.targetValue} · {target.label}</strong>
                        <span style={{ ...muted, display: "block", fontSize: 13 }}>{target.notes || target.metricKey || "Track this every week."}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            {prospectResearch.outreachTasks.length ? (
              <div style={{ marginTop: 18 }}>
                <strong style={{ color: "var(--gcc-navy)", fontSize: 14 }}>What to do next</strong>
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  {prospectResearch.outreachTasks.map((task, index) => (
                    <label key={`${task.title}-${index}`} style={{ display: "flex", gap: 10, alignItems: "flex-start", border: "1px solid rgba(8,58,99,.1)", borderRadius: 16, padding: 11, background: "rgba(255,255,255,.72)" }}>
                      <input type="checkbox" checked={researchTaskSelection[index] ?? true} onChange={() => toggleResearchTaskSelection(index)} />
                      <span>
                        <strong style={{ color: "var(--gcc-ink)" }}>{task.title}</strong>
                        <span style={{ ...muted, display: "block", fontSize: 13 }}>{task.lane} · {task.priority}{task.notes ? ` · ${task.notes}` : ""}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            {prospectResearch.emailAngles.length ? (
              <div style={{ marginTop: 18 }}>
                <strong style={{ color: "var(--gcc-navy)", fontSize: 14 }}>First email/message angles</strong>
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", marginTop: 10 }}>
                  {prospectResearch.emailAngles.map((angle, index) => (
                    <div key={`${angle.subject}-${index}`} style={{ border: "1px solid rgba(11,142,216,.16)", borderRadius: 18, padding: 13, background: "rgba(232,247,255,.45)" }}>
                      <div style={{ ...muted, fontSize: 12 }}>{angle.audience || "General outreach"}</div>
                      <strong style={{ color: "var(--gcc-navy)", display: "block", marginTop: 4 }}>Subject: {angle.subject}</strong>
                      <p style={{ ...muted, fontSize: 13, marginBottom: 0 }}>{angle.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {prospectResearch.feedbackQuestions.length ? (
              <div style={{ marginTop: 18 }}>
                <strong style={{ color: "var(--gcc-navy)", fontSize: 14 }}>Feedback questions to ask after they reply</strong>
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  {prospectResearch.feedbackQuestions.map((item, index) => (
                    <div key={`${item.question}-${index}`} style={{ borderLeft: "4px solid var(--gcc-blue)", padding: "8px 12px", background: "rgba(248,252,255,.88)", borderRadius: 12 }}>
                      <strong style={{ color: "var(--gcc-ink)" }}>{item.question}</strong>
                      <p style={{ ...muted, fontSize: 13, margin: "4px 0 0" }}>{item.askTo ? `Ask: ${item.askTo}. ` : ""}{item.whyAsk || ""}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {prospectResearch.sources.length ? (
              <div style={{ marginTop: 12 }}>
                <strong style={{ color: "var(--gcc-navy)", fontSize: 13 }}>Sources</strong>
                <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
                  {prospectResearch.sources.map((source) => (
                    <a key={source.url} href={source.url} target="_blank" rel="noreferrer" style={{ color: "var(--gcc-blue)", fontSize: 13 }}>{source.title || source.url}</a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <label style={{ ...label, marginTop: 14 }}>Extra context<textarea style={{ ...input, minHeight: 120 }} value={draftBrief.context} onChange={(event) => setDraftField("context", event.target.value)} placeholder="Paste notes, constraints, current numbers, team capacity, budget, investor lists, customer/company tables, or weekly checklists..." /></label>
        <div style={{ marginTop: 14, border: "1px dashed rgba(11,142,216,.3)", borderRadius: 20, padding: 14, background: "rgba(232,247,255,.52)" }}>
          <label style={label}>
            Add a Markdown/text context file for AI
            <input accept=".md,.markdown,.txt,text/plain,text/markdown" style={input} type="file" onChange={onDraftContextFileChange} />
          </label>
          <p style={{ ...muted, margin: "8px 0 0", fontSize: 13 }}>
            Upload a business plan, weekly target checklist, investor/company table, or outreach notes. AI reads it as context only; saving still needs your approval.
            {contextFileName ? ` Added: ${contextFileName}.` : ""}
          </p>
        </div>
        <button disabled={!!busy || !workspaceId} style={{ ...button, marginTop: 16 }}>{busy === "draft" ? "Drafting plan..." : "Draft plan with AI"}</button>
      </form>

      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        <form onSubmit={uploadPlan} style={card}>
          <div style={chip}>Private upload</div>
          <h2 style={{ color: "var(--gcc-navy)", marginBottom: 8, marginTop: 8 }}>Upload a growth plan</h2>
          <p style={muted}>Upload a Markdown or text plan. The original file is stored privately, and readable text is saved for AI summaries and task planning.</p>
          <label style={label}>Plan title<input required style={input} value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Q2 growth execution plan" /></label>
          <label style={{ ...label, marginTop: 14 }}>
            Plan file
            <input required accept=".md,.markdown,.txt,text/plain,text/markdown" style={input} type="file" onChange={onFileChange} />
          </label>
          <p style={{ ...muted, fontSize: 13 }}>Supported now: .md, .markdown, .txt up to 2MB. PDF/DOCX extraction is queued for the next safe phase.</p>
          <button disabled={!!busy || !workspaceId} style={{ ...button, marginTop: 10 }}>{busy === "upload" ? "Uploading..." : "Upload privately"}</button>
        </form>
        <form onSubmit={savePlan} style={card}>
          <div style={chip}>Manual backup</div>
          <h2 style={{ color: "var(--gcc-navy)", marginBottom: 8, marginTop: 8 }}>Paste a growth plan</h2>
          <p style={muted}>Paste text when you do not have a file ready. This uses the same plan model as uploads.</p>
          <label style={label}>Plan title<input required style={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Q2 investor and growth plan" /></label>
          <label style={{ ...label, marginTop: 14 }}>Plan text<textarea required style={{ ...input, minHeight: 220 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your growth plan, investor strategy, social plan, team plan..." /></label>
          <button disabled={!!busy || !workspaceId} style={{ ...button, marginTop: 16 }}>{busy === "plan" ? "Saving..." : "Save pasted plan"}</button>
        </form>
      </section>

      <section style={aiPanel}>
        <div style={chip}>Human-approved AI</div>
        <h2 style={{ color: "var(--gcc-navy)", marginBottom: 8, marginTop: 8 }}>Convert a saved plan into draft targets, tasks, and outreach</h2>
        <p style={muted}>AI prepares the first draft from your plan, including companies/emails in tables where possible. You choose what to approve before anything becomes real workspace data.</p>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(220px,1fr) auto", alignItems: "end" }}>
          <label style={label}>
            Saved plan
            <select style={input} value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)}>
              <option value="">Choose a saved plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>{plan.title} · {plan.ai_status || plan.status || "draft"}</option>
              ))}
            </select>
          </label>
          <button type="button" disabled={!!busy || !workspaceId || !selectedPlanId} onClick={generateSuggestions} style={button}>
            {busy === "suggest" ? "Drafting..." : "Generate draft"}
          </button>
        </div>

        {suggestions ? (
          <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
            <div style={{ ...card, boxShadow: "none" }}>
              <strong style={{ color: "var(--gcc-navy)" }}>AI summary</strong>
              <p style={{ ...muted, marginBottom: 0 }}>{suggestions.summary}</p>
              {suggestionModel ? <p style={{ ...muted, fontSize: 12 }}>Model: {suggestionModel} · human approval required</p> : null}
            </div>
            <SuggestionList title="Targets" items={suggestions.targets} selected={selection.targets} onToggle={(index) => toggleSuggestion("targets", index)} render={(item) => `${item.label} · target ${item.targetValue}${item.notes ? ` · ${item.notes}` : ""}`} />
            <SuggestionList title="Milestones" items={suggestions.milestones} selected={selection.milestones} onToggle={(index) => toggleSuggestion("milestones", index)} render={(item) => `${item.title}${item.description ? ` · ${item.description}` : ""}`} />
            <SuggestionList title="Team tasks" items={suggestions.tasks} selected={selection.tasks} onToggle={(index) => toggleSuggestion("tasks", index)} render={(item) => `${item.title} · ${item.lane} · ${item.priority}${item.notes ? ` · ${item.notes}` : ""}`} />
            <SuggestionList title="Investor / company outreach" items={suggestions.investors} selected={selection.investors} onToggle={(index) => toggleSuggestion("investors", index)} render={(item) => `${item.investorName}${item.companyName ? ` · ${item.companyName}` : ""}${item.contactEmail ? ` · ${item.contactEmail}` : ""} · ${item.stage}${item.notes ? ` · ${item.notes}` : ""}`} />
            <button type="button" disabled={busy === "approve"} onClick={approveSuggestions} style={{ ...button, justifySelf: "start" }}>
              {busy === "approve" ? "Saving approved items..." : "Approve selected items"}
            </button>
          </div>
        ) : null}
      </section>

      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
        <div style={card}>
          <h3 style={{ color: "var(--gcc-navy)", marginTop: 0 }}>Set a target</h3>
          <label style={label}>Target<input style={input} value={targetLabel} onChange={(e) => setTargetLabel(e.target.value)} placeholder="Reach 40 investors" /></label>
          <label style={{ ...label, marginTop: 12 }}>Target number<input type="number" style={input} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="40" /></label>
          <button disabled={!!busy || !workspaceId} onClick={saveTarget} style={{ ...secondaryButton, marginTop: 14 }}>{busy === "target" ? "Saving..." : "Save target"}</button>
        </div>
        <div style={card}>
          <h3 style={{ color: "var(--gcc-navy)", marginTop: 0 }}>Set a milestone</h3>
          <label style={label}>Milestone<input style={input} value={milestoneTitle} onChange={(e) => setMilestoneTitle(e.target.value)} placeholder="First investor meeting booked" /></label>
          <button disabled={!!busy || !workspaceId} onClick={saveMilestone} style={{ ...secondaryButton, marginTop: 14 }}>{busy === "milestone" ? "Saving..." : "Save milestone"}</button>
        </div>
      </section>
    </div>
  );
}

function SuggestionList<T>({
  title,
  items,
  selected,
  onToggle,
  render,
}: {
  title: string;
  items: T[];
  selected: boolean[];
  onToggle: (index: number) => void;
  render: (item: T) => string;
}) {
  if (items.length === 0) return null;
  return (
    <div style={{ ...card, boxShadow: "none" }}>
      <strong style={{ color: "var(--gcc-navy)" }}>{title}</strong>
      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {items.map((item, index) => (
          <label key={`${title}-${index}`} style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "var(--gcc-ink)", lineHeight: 1.55 }}>
            <input type="checkbox" checked={selected[index] || false} onChange={() => onToggle(index)} style={{ marginTop: 5 }} />
            <span>{render(item)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
