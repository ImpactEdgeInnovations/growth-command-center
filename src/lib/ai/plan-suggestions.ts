import { z } from "zod";
import { optionalEnv } from "@/src/lib/env";

const laneSchema = z.enum(["founder", "marketing", "sales", "investor", "ops", "content", "growth"]);
const prioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export const planSuggestionsSchema = z.object({
  summary: z.string().trim().min(10).max(1800),
  targets: z
    .array(
      z.object({
        label: z.string().trim().min(2).max(160),
        metricKey: z.string().trim().max(80).optional(),
        targetValue: z.coerce.number().min(0).default(0),
        notes: z.string().trim().max(1200).optional(),
      })
    )
    .min(1)
    .max(5),
  milestones: z
    .array(
      z.object({
        title: z.string().trim().min(2).max(180),
        description: z.string().trim().max(1200).optional(),
        ownerName: z.string().trim().max(120).optional(),
      })
    )
    .max(5)
    .default([]),
  tasks: z
    .array(
      z.object({
        title: z.string().trim().min(2).max(180),
        lane: laneSchema.default("growth"),
        assigneeName: z.string().trim().max(120).optional(),
        priority: prioritySchema.default("medium"),
        notes: z.string().trim().max(1200).optional(),
      })
    )
    .min(1)
    .max(12),
  investors: z
    .array(
      z.object({
        investorName: z.string().trim().min(2).max(180),
        companyName: z.string().trim().max(180).optional(),
        contactName: z.string().trim().max(120).optional(),
        contactEmail: z.string().trim().email().max(180).optional().or(z.literal("")),
        stage: z
          .enum(["identified", "contacted", "warm", "meeting", "diligence", "committed", "passed"])
          .default("identified"),
        status: z.enum(["open", "follow_up", "warm", "closed", "archived"]).default("open"),
        source: z.string().trim().max(140).optional(),
        lastResponse: z.string().trim().max(1200).optional(),
        notes: z.string().trim().max(1200).optional(),
      })
    )
    .max(20)
    .default([]),
});

export type PlanSuggestions = z.infer<typeof planSuggestionsSchema>;

function extractOutreachRows(text: string) {
  const rows = text
    .split("\n")
    .filter((line) => line.includes("|") && /@|investor|company|contact|email|fund|partner/i.test(line))
    .map((line) =>
      line
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean)
    )
    .filter((cells) => cells.length >= 2 && !cells.every((cell) => /^-+$/.test(cell.replace(/\s/g, ""))))
    .filter((cells) => !/email|contact|company|investor|status|stage/i.test(cells.join(" ").toLowerCase()) || /@/.test(cells.join(" ")))
    .slice(0, 10);

  return rows
    .map((cells, index) => {
      const email = cells.find((cell) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(cell)) || "";
      const nonEmailCells = cells.filter((cell) => cell !== email);
      const first = nonEmailCells[0] || `Outreach prospect ${index + 1}`;
      const second = nonEmailCells.find((cell) => cell !== first) || "";
      return {
        investorName: first,
        companyName: second,
        contactEmail: email,
        stage: "identified" as const,
        status: "open" as const,
        source: "Imported from growth plan table/checklist",
        notes: cells.join(" · "),
      };
    })
    .filter((row) => row.investorName.length > 1);
}

const fallbackSuggestions = (title: string, text: string): PlanSuggestions => {
  const investorHeavy = /investor|fundraise|raise|vc|capital|pitch/i.test(text);
  const marketingHeavy = /marketing|content|social|linkedin|campaign|brand/i.test(text);
  const extractedOutreach = extractOutreachRows(text);
  return {
    summary: `Draft suggestions for "${title}". Review the targets and tasks, edit anything that feels too broad, then approve only what your team can actually execute this week.`,
    targets: [
      {
        label: investorHeavy ? "Reach qualified investor prospects" : "Create qualified growth conversations",
        metricKey: investorHeavy ? "investor_outreach" : "qualified_conversations",
        targetValue: investorHeavy ? 30 : 20,
        notes: "Start with a realistic number the team can track weekly.",
      },
      {
        label: marketingHeavy ? "Publish consistent growth content" : "Complete weekly growth execution reviews",
        metricKey: marketingHeavy ? "content_posts" : "weekly_reviews",
        targetValue: marketingHeavy ? 8 : 4,
        notes: "The aim is consistency, not noise.",
      },
      {
        label: "Book decision-maker meetings",
        metricKey: "meetings_booked",
        targetValue: 5,
        notes: "Use this to measure whether outreach is turning into real conversations.",
      },
    ],
    milestones: [
      {
        title: "Turn the plan into a 30-day execution board",
        description: "Agree the first targets, owners, and due dates before work starts spreading across chats.",
      },
      {
        title: "Complete the first weekly founder review",
        description: "Record wins, blockers, numbers, and next week's focus.",
      },
    ],
    tasks: [
      {
        title: "Pick the top three growth priorities for this week",
        lane: "founder",
        priority: "high",
        notes: "Keep the team focused on the few actions that move the numbers.",
      },
      {
        title: investorHeavy ? "Build a shortlist of investor prospects" : "Build a shortlist of high-value prospects",
        lane: investorHeavy ? "investor" : "sales",
        priority: "high",
        notes: "Capture name, company, email, stage, and next follow-up date.",
      },
      {
        title: "Create the first weekly metrics snapshot",
        lane: "growth",
        priority: "medium",
        notes: "Track the numbers that prove whether the plan is working.",
      },
      {
        title: marketingHeavy ? "Draft the next two content posts" : "Draft the next outreach message",
        lane: marketingHeavy ? "content" : "growth",
        priority: "medium",
        notes: "Prepare the message, but keep human approval before sending externally.",
      },
    ],
    investors: extractedOutreach.length
      ? extractedOutreach
      : investorHeavy
        ? [
            {
              investorName: "Build investor shortlist from your network",
              companyName: "To be filled by founder",
              contactEmail: "",
              stage: "identified",
              status: "open",
              source: "AI fallback",
              notes: "Replace this with real investor/company names, emails, and follow-up notes.",
            },
          ]
        : [],
  };
};

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

function parseSuggestions(text: string, title: string, planText: string) {
  const trimmed = text.trim();
  const jsonCandidate = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0] || "";
  const parsed = jsonCandidate ? JSON.parse(jsonCandidate) : null;
  return planSuggestionsSchema.parse(parsed || fallbackSuggestions(title, planText));
}

export async function generatePlanSuggestions({
  title,
  planText,
}: {
  title: string;
  planText: string;
}): Promise<{ suggestions: PlanSuggestions; model: string }> {
  const fallback = fallbackSuggestions(title, planText);
  const apiKey = optionalEnv("OPENAI_API_KEY");
  const model = optionalEnv("OPENAI_MODEL", "gpt-4.1-mini");
  if (!apiKey) return { suggestions: fallback, model: "fallback-rules" };

  const system = [
    "You are Growth Command Center's AI planning assistant.",
    "Use simple founder/operator language.",
    "Convert a business growth plan into draft targets, milestones, team tasks, and outreach records.",
    "If the plan includes Markdown tables, checklists, company names, investor names, emails, or contacts, extract them into investors.",
    "Never approve or send anything. The human user must review and approve suggestions.",
    "Return only valid JSON with keys: summary, targets, milestones, tasks, investors.",
    "Targets must have label, metricKey, targetValue, notes.",
    "Tasks must have title, lane, priority, notes. Lane must be founder, marketing, sales, investor, ops, content, or growth.",
    "Investors can also represent partner/customer/company outreach and must use investorName, companyName, contactName, contactEmail, stage, status, source, lastResponse, notes.",
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
          content: `Plan title: ${title}\n\nPlan text:\n${planText.slice(0, 12000)}`,
        },
      ],
    }),
  });

  if (!response.ok) return { suggestions: fallback, model: "fallback-rules" };

  const payload = await response.json().catch(() => null);
  const outputText = payload ? extractOutputText(payload) : "";
  try {
    return { suggestions: parseSuggestions(outputText, title, planText), model };
  } catch {
    return { suggestions: fallback, model: "fallback-rules" };
  }
}
