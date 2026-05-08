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
      "Live web research is not configured in this environment. Add known companies, investors, partners, or customer segments manually, then let AI turn them into outreach records.",
    prospects: [],
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
    sources: parsed.sources.length ? parsed.sources : sources,
  };
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
    "Use web search and return practical, human-reviewable outreach records.",
    "Do not invent verified email addresses. Only include an email if it appears in provided user context or a cited source.",
    "If no email is found, leave contactEmail blank and write a research/follow-up note.",
    "Prefer organization-level websites, portfolio pages, official contact pages, accelerators, associations, or fund/company websites over low-quality directories.",
    "Return only JSON with keys: summary, prospects, sources.",
    "Each prospect must use: investorName, companyName, contactName, contactEmail, stage, status, source, notes.",
    "Sources must be clickable source URLs used to support the recommendations.",
  ].join(" ");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      tools: [{ type: optionalEnv("OPENAI_WEB_SEARCH_TOOL", "web_search"), external_web_access: true }],
      tool_choice: "auto",
      include: ["web_search_call.action.sources"],
      input: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            `Company: ${input.companyName}`,
            `Website: ${input.companyWebsite || "Not supplied"}`,
            `Business type: ${input.businessType}`,
            `Goal: ${input.topGoal}`,
            `Market: ${input.market || "Not supplied"}`,
            `Channels: ${input.channels || "Not supplied"}`,
            `Known/desired prospects from user:\n${input.outreachContext || "Not supplied"}`,
            "Find up to 8 realistic prospects. Prefer official sites, public portfolio/team/contact pages, LinkedIn-style public company info, incubators, accelerators, funds, associations, or relevant customer/company targets.",
          ].join("\n"),
        },
      ],
    }),
  });

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
