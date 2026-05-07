import { optionalEnv } from "@/src/lib/env";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(input: SendEmailInput) {
  const apiKey = optionalEnv("RESEND_API_KEY");
  const from = optionalEnv("RESEND_FROM", "Growth Command Center <hello@example.com>");
  if (!apiKey) {
    console.info("[email:dry-run]", { to: input.to, subject: input.subject, text: input.text });
    return { ok: true, dryRun: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Email send failed: ${response.status} ${body}`);
  }
  return { ok: true, dryRun: false };
}
