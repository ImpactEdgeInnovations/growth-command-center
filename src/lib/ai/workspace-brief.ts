import { optionalEnv } from "@/src/lib/env";

function fallbackWorkspaceBrief(context: string) {
  const hasInvestors = /Investor outreach/i.test(context) && !/No investor outreach/i.test(context);
  const hasTasks = /Team tasks/i.test(context) && !/No team tasks/i.test(context);
  return [
    "AI weekly command brief",
    "",
    "What matters most:",
    "1. Pick one measurable growth target for the next seven days.",
    hasTasks
      ? "2. Review open team tasks and move anything unclear into one owner + one due date."
      : "2. Create the first team tasks from your plan so work has clear owners.",
    hasInvestors
      ? "3. Follow up with warm investor or partner prospects before adding too many new leads."
      : "3. Add your first investor, partner, or customer outreach list so follow-ups do not live in memory.",
    "",
    "Watch-outs:",
    "- Avoid tracking too many numbers at once. Pick the few that prove momentum.",
    "- Do the weekly review even if the week was messy; it keeps the execution rhythm honest.",
    "",
    "Next best action:",
    "Open Plans, generate AI targets/tasks from the latest plan, then approve only the items your team can execute this week.",
    "",
    "Note: This is a safe fallback because no live AI provider key is configured yet.",
  ].join("\n");
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

export async function generateWorkspaceBrief(context: string) {
  const apiKey = optionalEnv("OPENAI_API_KEY");
  const model = optionalEnv("OPENAI_MODEL", "gpt-4.1-mini");
  if (!apiKey) return { text: fallbackWorkspaceBrief(context), model: "fallback-rules" };

  const system = [
    "You are Growth Command Center's AI chief-of-staff for founders and growth teams.",
    "Use layman language. Be concise, practical, and specific.",
    "Read the workspace snapshot and produce a weekly command brief.",
    "Include: top 3 priorities, risks/watch-outs, investor/follow-up advice, marketing advice, and one next best action.",
    "Never claim you sent messages, approved work, or changed records.",
    "Remind the user that humans approve decisions before external action.",
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
        { role: "user", content: `Workspace snapshot:\n${context.slice(0, 14000)}` },
      ],
    }),
  });

  if (!response.ok) return { text: fallbackWorkspaceBrief(context), model: "fallback-rules" };
  const payload = await response.json().catch(() => null);
  const text = payload ? extractOutputText(payload) : "";
  return { text: text || fallbackWorkspaceBrief(context), model: text ? model : "fallback-rules" };
}
