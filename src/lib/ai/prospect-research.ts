import { z } from "zod";
import { optionalEnv } from "@/src/lib/env";

export const prospectResearchResultSchema = z.object({
  summary: z.string().trim().min(10).max(1600),
  prospects: z
    .array(
      z.object({
        investorName: z.string().trim().min(2).max(180),
        companyName: z.string().trim().max(180).optional(),
        contactName: z.string().trim().max(120).optional(),
        contactEmail: z.string().trim().email().max(180).optional().or(z.literal("")),
        stage: z.enum(["identified", "contacted", "warm", "meeting", "diligence", "committed", "passed"]).default("identified"),
        status: z.enum(["open", "follow_up", "warm", "closed", "archived"]).default("open"),
        source: z.string().trim().max(240).optional(),
        notes: z.string().trim().max(1200).optional(),
      })
    )
    .max(12)
    .default([]),
  outreachTargets: z
    .array(
      z.object({
        label: z.string().trim().min(2).max(160),
        metricKey: z.string().trim().max(80).optional(),
        targetValue: z.coerce.number().min(0).default(0),
        notes: z.string().trim().max(1200).optional(),
      })
    )
    .max(5)
    .default([]),
  outreachTasks: z
    .array(
      z.object({
        title: z.string().trim().min(2).max(180),
        lane: z.enum(["founder", "marketing", "sales", "investor", "ops", "content", "growth"]).default("growth"),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        notes: z.string().trim().max(1200).optional(),
      })
    )
    .max(10)
    .default([]),
  feedbackQuestions: z
    .array(
      z.object({
        question: z.string().trim().min(5).max(240),
        askTo: z.string().trim().max(160).optional(),
        whyAsk: z.string().trim().max(500).optional(),
      })
    )
    .max(8)
    .default([]),
  emailAngles: z
    .array(
      z.object({
        audience: z.string().trim().max(160).optional(),
        subject: z.string().trim().min(4).max(180),
        message: z.string().trim().min(20).max(1200),
      })
    )
    .max(4)
    .default([]),
  sources: z
    .array(
      z.object({
        title: z.string().trim().max(240).optional(),
        url: z.string().trim().url().max(500),
      })
    )
    .max(20)
    .default([]),
});

export type ProspectResearchResult = z.infer<typeof prospectResearchResultSchema>;

function fallbackResearch(): ProspectResearchResult {
  return {
    summary:
      "Live web research is not configured in this environment. You can still start with a lightweight operator plan: define who to contact, set weekly outreach targets, collect feedback, and approve any records before they become workspace data.",
    prospects: [],
    outreachTargets: [
      {
        label: "Send first qualified outreach messages",
        metricKey: "outreach_sent",
        targetValue: 20,
        notes: "Start with a small enough batch that every reply can be handled personally.",
      },
      {
        label: "Collect customer or investor feedback replies",
        metricKey: "feedback_replies",
        targetValue: 8,
        notes: "The goal is learning, not just sending emails.",
      },
      {
        label: "Book discovery or investor conversations",
        metricKey: "meetings_booked",
        targetValue: 3,
        notes: "Meetings are the clearest sign that outreach is becoming real pipeline.",
      },
    ],
    outreachTasks: [
      {
        title: "Build the first prospect list",
        lane: "growth",
        priority: "high",
        notes: "List companies, investors, partners, or customers you can contact this week.",
      },
      {
        title: "Send the first outreach batch",
        lane: "sales",
        priority: "high",
        notes: "Keep the message short and ask for feedback or a 15-minute conversation.",
      },
      {
        title: "Log every reply and objection",
        lane: "growth",
        priority: "medium",
        notes: "Feedback becomes the next version of your growth plan.",
      },
    ],
    feedbackQuestions: [
      {
        question: "What problem would make you seriously consider using or funding this?",
        askTo: "qualified prospects",
        whyAsk: "This reveals whether the pain is urgent enough.",
      },
      {
        question: "What would make this feel trustworthy enough to try?",
        askTo: "customers, partners, or investors",
        whyAsk: "Trust objections usually decide whether early growth works.",
      },
      {
        question: "Who else should we speak to next?",
        askTo: "any warm respondent",
        whyAsk: "Warm referrals are usually stronger than cold lists.",
      },
    ],
    emailAngles: [
      {
        audience: "customer or partner prospect",
        subject: "Quick feedback on a growth idea",
        message:
          "Hi {{name}}, I am building {{company}} for {{market}} and would value quick feedback from people close to this problem. Would you be open to a 15-minute call this week?",
      },
    ],
    sources: [],
  };
}

function extractOutputText(payload: any) {
  return (
    payload.output_text ||
    payload.output
      ?.flatMap((item: any) => item.content || [])
      ?.map((part: any) => part.text || "")
      ?.join("\n")
      ?.trim() ||
    ""
  );
}

function extractSources(payload: any) {
  const sourceMap = new Map<string, { title?: string; url: string }>();
  const addSource = (source: any) => {
    const url = String(source?.url || source?.uri || "").trim();
    if (!url || !/^https?:\/\//i.test(url)) return;
    sourceMap.set(url, { title: String(source?.title || source?.name || "").slice(0, 240) || undefined, url });
  };

  for (const item of payload?.output || []) {
    for (const source of item?.action?.sources || []) addSource(source);
    for (const content of item?.content || []) {
      for (const annotation of content?.annotations || []) {
        if (annotation?.type === "url_citation") addSource(annotation);
      }
    }
  }

  return Array.from(sourceMap.values()).slice(0, 20);
}

function parseResearch(text: string, sources: Array<{ title?: string; url: string }>) {
  const trimmed = text.trim();
  const jsonCandidate = trimmed.startsWith("{") ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0] || "";
  if (!jsonCandidate) return { ...fallbackResearch(), sources };
  const parsed = prospectResearchResultSchema.parse(JSON.parse(jsonCandidate));
  return {
    ...parsed,
    prospects: parsed.prospects.map((prospect) => ({
      ...prospect,
      source: prospect.source?.slice(0, 240),
      notes: [
        prospect.notes,
        !prospect.contactEmail ? "Email not verified; confirm contact details before outreach." : "",
      ]
        .filter(Boolean)
        .join(" "),
    })),
    outreachTargets: parsed.outreachTargets.length ? parsed.outreachTargets : fallbackResearch().outreachTargets,
    outreachTasks: parsed.outreachTasks.length ? parsed.outreachTasks : fallbackResearch().outreachTasks,
    feedbackQuestions: parsed.feedbackQuestions.length ? parsed.feedbackQuestions : fallbackResearch().feedbackQuestions,
    emailAngles: parsed.emailAngles,
    sources: parsed.sources.length ? parsed.sources : sources,
  };
}

async function callOpenAiResearch(apiKey: string, model: string, system: string, userContent: string, toolType: string) {
  return fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      tools: [{ type: toolType }],
      tool_choice: "auto",
      input: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    }),
  });
}

export async function researchProspects(input: {
  companyName: string;
  companyWebsite?: string;
  businessType: string;
  topGoal: string;
  market?: string;
  channels?: string;
  outreachContext?: string;
}): Promise<{ research: ProspectResearchResult; model: string }> {
  const apiKey = optionalEnv("OPENAI_API_KEY");
  const model = optionalEnv("OPENAI_MODEL", "gpt-4.1-mini");
  if (!apiKey) return { research: fallbackResearch(), model: "fallback-rules" };

  const system = [
    "You are Growth Command Center's web research assistant.",
    "Research likely investors, partners, companies, or customer prospects for the user's growth goal.",
    "Think like an operator starting the business: who should we talk to next, what should we ask, what targets should we hit this week, and what follow-up work should happen after replies arrive?",
    "Use web search and return practical, human-reviewable outreach records.",
    "Do not invent verified email addresses. Only include an email if it appears in provided user context or a cited source.",
    "If no email is found, leave contactEmail blank and write a research/follow-up note.",
    "Prefer organization-level websites, portfolio pages, official contact pages, accelerators, associations, or fund/company websites over low-quality directories.",
    "Return only JSON with keys: summary, prospects, outreachTargets, outreachTasks, feedbackQuestions, emailAngles, sources.",
    "Each prospect must use: investorName, companyName, contactName, contactEmail, stage, status, source, notes.",
    "outreachTargets are weekly measurable goals such as emails sent, replies, meetings, demos, customer interviews, or investor conversations.",
    "outreachTasks are concrete next actions for founder, sales, marketing, investor, ops, content, or growth lanes.",
    "feedbackQuestions are short questions to ask prospects after outreach.",
    "emailAngles are short first-message drafts with subject and message. Keep them plain and human.",
    "Sources must be clickable source URLs used to support the recommendations.",
  ].join(" ");

  const userContent = [
    `Company: ${input.companyName}`,
    `Website: ${input.companyWebsite || "Not supplied"}`,
    `Business type: ${input.businessType}`,
    `Goal: ${input.topGoal}`,
    `Market: ${input.market || "Not supplied"}`,
    `Channels: ${input.channels || "Not supplied"}`,
    `Known/desired prospects from user:\n${input.outreachContext || "Not supplied"}`,
    "Find up to 8 realistic prospects. Prefer official sites, public portfolio/team/contact pages, LinkedIn-style public company info, incubators, accelerators, funds, associations, or relevant customer/company targets.",
    "Also return 3-5 weekly outreach targets, 5-8 next tasks, 4-6 feedback questions, and 2-4 first email/message angles.",
  ].join("\n");

  const preferredTool = optionalEnv("OPENAI_WEB_SEARCH_TOOL", "web_search_preview");
  let response = await callOpenAiResearch(apiKey, model, system, userContent, preferredTool);
  if (!response.ok && preferredTool !== "web_search") {
    response = await callOpenAiResearch(apiKey, model, system, userContent, "web_search");
  }

  if (!response.ok) return { research: fallbackResearch(), model: "fallback-rules" };

  const payload = await response.json().catch(() => null);
  if (!payload) return { research: fallbackResearch(), model: "fallback-rules" };

  const sources = extractSources(payload);
  try {
    return { research: parseResearch(extractOutputText(payload), sources), model };
  } catch {
    return { research: { ...fallbackResearch(), sources }, model: "fallback-rules" };
  }
}
