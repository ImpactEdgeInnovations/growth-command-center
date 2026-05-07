import { loginCodeSchema } from "@/src/lib/validators/public";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { createOtpCode, hashCode } from "@/src/lib/auth/codes";
import { sendEmail } from "@/src/lib/email/send";
import { apiError, isSchemaMissingError } from "@/src/lib/api/response";
import { superAdminEmails } from "@/src/lib/env";

export async function POST(request: Request) {
  const parsed = loginCodeSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Enter a valid email address.", 400);

  const email = parsed.data.email.toLowerCase();
  const supabase = createSupabaseAdminClient();
  const isEnvSuperAdmin = superAdminEmails().includes(email);

  const [userResult, memberResult] = await Promise.all([
    supabase.from("platform_users").select("id,status,role").eq("email", email).maybeSingle(),
    supabase.from("workspace_members").select("id,status").eq("email", email).in("status", ["invited", "active"]).limit(1),
  ]);

  if (userResult.error && isSchemaMissingError(userResult.error)) return apiError("Growth Command Center SQL is not installed yet.", 409, "SCHEMA_MISSING");
  if (!isEnvSuperAdmin && !userResult.data && (memberResult.data || []).length === 0) {
    return apiError("No approved workspace found for this email. Request company access first.", 404, "NO_WORKSPACE");
  }
  if (userResult.data?.status === "suspended") return apiError("This account is suspended.", 403, "SUSPENDED");

  const code = createOtpCode();
  const { error } = await supabase.from("auth_codes").insert({
    email,
    code_hash: hashCode(email, code),
    purpose: "login",
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (error) return apiError("Could not create login code.", 500);

  await sendEmail({
    to: email,
    subject: "Your Growth Command Center login code",
    text: `Your Growth Command Center login code is ${code}. It expires in 10 minutes.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px"><h2 style="color:#06243a">Growth Command Center</h2><p>Your login code is:</p><div style="font-size:32px;font-weight:700;letter-spacing:6px;color:#1479b8">${code}</div><p style="color:#62748a">It expires in 10 minutes.</p></div>`,
  });

  return Response.json({ ok: true, message: "Login code sent." });
}
