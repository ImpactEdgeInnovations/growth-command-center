import { z } from "zod";
import { optionalEnv } from "@/src/lib/env";

export const aiPlanDraftSchema = z.object({
  title: z.string().trim().min(2).max(160),
  planText: z.string().trim().min(300).max(30000),
});

export type AiPlanDraft = z.infer<typeof aiPlanDraftSchema>;

function fallbackPlanDraft({
  companyName,
  businessType,
  stage,
  topGoal,
  market,
  channels,
  context,
}: {
  companyName: string;
  businessType: string;
  stage: string;
  topGoal: string;
  market?: string;
  channels?: string;
  context?: string;
}): AiPlanDraft {
  const title = `${companyName} Growth Plan`;
  const planText = [
    `# ${title}`,
    "",
    "## 1. Simple Goal",
    `${companyName} is a ${stage} ${businessType}. The immediate growth goal is: ${topGoal}.`,
    "",
    "## 2. Target Market",
    market?.trim()
      ? `Primary market: ${market.trim()}.`
      : "Define the highest-value customer segment before spending heavily on channels.",
    "",
    "## 3. Main Growth Channels",
    channels?.trim()
      ? `Priority channels: ${channels.trim()}.`
      : "Start with founder-led outreach, direct sales, referrals, and one consistent content channel.",
    "",
    "## 4. First 30 Days",
    "- Confirm the ideal customer profile and write a one-page value proposition.",
    "- Build a prospect list with names, companies, contacts, stage, and follow-up dates.",
    "- Run weekly outreach and track replies, meetings, objections, and conversions.",
    "- Publish simple proof-led content that explains the problem, solution, and customer benefit.",
    "- Review numbers every Friday and choose the next week's top three actions.",
    "",
    "## 5. Investor / Partner Readiness",
    "- Keep a clean list of investor or partner prospects.",
    "- Track who was contacted, what they said, and the next follow-up date.",
    "- Prepare a short traction note that explains progress, risks, and next milestones.",
    "",
    "## 6. Team Accountability",
    "- Assign each task to one owner.",
    "- Give every task a due date and priority.",
    "- Separate founder tasks, marketing tasks, sales tasks, investor tasks, and operations tasks.",
    "",
    "## 7. Weekly Review Rhythm",
    "- Wins: what worked this week.",
    "- Blockers: what slowed us down.",
    "- Numbers: outreach sent, replies, meetings, signups, revenue, content, and investor progress.",
    "- Next focus: the top three actions for the next seven days.",
    context?.trim() ? `\n## Extra Context\n${context.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return { title, planText };
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

function parseDraft(text: string, fallback: AiPlanDraft) {
  const trimmed = text.trim();
  const jsonCandidate = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0] || "";
  if (!jsonCandidate) return fallback;
  return aiPlanDraftSchema.parse(JSON.parse(jsonCandidate));
}

export async function generateAiPlanDraft(input: {
  companyName: string;
  businessType: string;
  stage: string;
  topGoal: string;
  market?: string;
  channels?: string;
  context?: string;
}): Promise<{ draft: AiPlanDraft; model: string }> {
  const fallback = fallbackPlanDraft(input);
  const apiKey = optionalEnv("OPENAI_API_KEY");
  const model = optionalEnv("OPENAI_MODEL", "gpt-4.1-mini");
  if (!apiKey) return { draft: fallback, model: "fallback-rules" };

  const system = [
    "You are Growth Command Center's AI growth-plan builder.",
    "Create practical founder/operator growth plans in simple language.",
    "Use uploaded context when supplied, including Markdown tables, checklists, investor/company contacts, weekly targets, and notes.",
    "The plan must be useful to convert into targets, milestones, team tasks, investor outreach, and weekly reviews.",
    "Do not claim to execute actions or contact anyone.",
    "Return only valid JSON with keys: title and planText.",
    "planText must be Markdown with sections: Goal, Market, Channels, First 30 Days, Investor/Partner Readiness, Team Accountability, Weekly Review Rhythm.",
  ].join(" ");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            `Company: ${input.companyName}`,
            `Business type: ${input.businessType}`,
            `Stage: ${input.stage}`,
            `Top goal: ${input.topGoal}`,
            `Market: ${input.market || "Not supplied"}`,
            `Channels: ${input.channels || "Not supplied"}`,
            `Extra context and uploaded notes: ${(input.context || "Not supplied").slice(0, 12000)}`,
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) return { draft: fallback, model: "fallback-rules" };
  const payload = await response.json().catch(() => null);
  const outputText = payload ? extractOutputText(payload) : "";
  try {
    return { draft: parseDraft(outputText, fallback), model };
  } catch {
    return { draft: fallback, model: "fallback-rules" };
  }
}
