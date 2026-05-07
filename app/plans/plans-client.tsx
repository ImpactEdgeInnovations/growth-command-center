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
};

type SuggestionSelection = {
  targets: boolean[];
  milestones: boolean[];
  tasks: boolean[];
};

type DraftBrief = {
  companyName: string;
  businessType: string;
  stage: "idea" | "early" | "growing" | "fundraising" | "scaling";
  topGoal: string;
  market: string;
  channels: string;
  context: string;
};

const checkedAll = (suggestions: PlanSuggestions): SuggestionSelection => ({
  targets: suggestions.targets.map(() => true),
  milestones: suggestions.milestones.map(() => true),
  tasks: suggestions.tasks.map(() => true),
});

export default function PlansClient() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [draftBrief, setDraftBrief] = useState<DraftBrief>({
    companyName: "",
    businessType: "",
    stage: "early",
    topGoal: "",
    market: "",
    channels: "",
    context: "",
  });
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [targetLabel, setTargetLabel] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState<PlanSuggestions | null>(null);
  const [selection, setSelection] = useState<SuggestionSelection>({ targets: [], milestones: [], tasks: [] });
  const [briefId, setBriefId] = useState("");
  const [suggestionModel, setSuggestionModel] = useState("");
  const [busy, setBusy] = useState<"draft" | "plan" | "upload" | "target" | "milestone" | "suggest" | "approve" | null>(null);

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
    };
    try {
      const response = await fetch("/api/ai/plan-suggestions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, growthPlanId: selectedPlanId, briefId: briefId || null, ...approved }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not approve suggestions.");
      setMessage(`Approved and saved: ${payload.saved?.targets?.length || 0} targets, ${payload.saved?.milestones?.length || 0} milestones, ${payload.saved?.tasks?.length || 0} tasks.`);
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
    <div style={{ display: "grid", gap: 18 }}>
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
        <label style={{ ...label, marginTop: 14 }}>Extra context<textarea style={{ ...input, minHeight: 95 }} value={draftBrief.context} onChange={(event) => setDraftField("context", event.target.value)} placeholder="Paste notes, constraints, current numbers, team capacity, budget, or investor context..." /></label>
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
        <h2 style={{ color: "var(--gcc-navy)", marginBottom: 8, marginTop: 8 }}>Convert a saved plan into draft targets and tasks</h2>
        <p style={muted}>AI prepares the first draft. You choose what to approve before anything becomes a real target, milestone, or task.</p>
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
