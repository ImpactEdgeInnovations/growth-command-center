import { optionalEnv } from "@/src/lib/env";

const fallbackAdvice = (prompt: string, context?: string) => {
  const trimmedPrompt = prompt.trim();
  const contextHint = context?.trim()
    ? "I used the supplied business context and kept the recommendations practical."
    : "Add a growth plan or workspace context for sharper advice.";
  return [
    "AI advisor draft",
    "",
    `Question: ${trimmedPrompt}`,
    "",
    contextHint,
    "",
    "Recommended next steps:",
    "1. Pick one measurable weekly target.",
    "2. Assign one owner and one due date for each task.",
    "3. Log investor/customer follow-ups immediately after each conversation.",
    "4. Review blockers every Friday and decide the next week's top three priorities.",
    "",
    "Note: This is a safe fallback because no live AI provider key is configured yet.",
  ].join("\n");
};

export async function generateGrowthAdvice({
  prompt,
  context,
  briefType,
}: {
  prompt: string;
  context?: string;
  briefType: string;
}) {
  const apiKey = optionalEnv("OPENAI_API_KEY");
  const model = optionalEnv("OPENAI_MODEL", "gpt-4.1-mini");
  if (!apiKey) {
    return { text: fallbackAdvice(prompt, context), model: "fallback-rules" };
  }

  const system = [
    "You are Growth Command Center's AI advisor for founders and operators.",
    "Use layman language. Be practical, concise, and action-oriented.",
    "Never claim you sent a message or made a business decision.",
    "Always require human approval before outbound communication or operational decisions.",
    "If asked for research, explain what can be inferred from provided context and what still needs verification.",
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
          content: `Brief type: ${briefType}\n\nPrompt:\n${prompt}\n\nContext:\n${context || "No extra context supplied."}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`AI provider failed: ${response.status} ${body}`);
  }

  const payload: any = await response.json();
  const text =
    payload.output_text ||
    payload.output?.flatMap((item: any) => item.content || [])
      ?.map((part: any) => part.text || "")
      ?.join("\n")
      ?.trim() ||
    fallbackAdvice(prompt, context);

  return { text, model };
}
