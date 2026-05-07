import { cookies } from "next/headers";
import { verifyCodeSchema } from "@/src/lib/validators/public";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { hashCode } from "@/src/lib/auth/codes";
import { apiError } from "@/src/lib/api/response";
import { superAdminEmails } from "@/src/lib/env";

export async function POST(request: Request) {
  const parsed = verifyCodeSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Enter the 6-digit code sent to your email.", 400);

  const email = parsed.data.email.toLowerCase();
  const supabase = createSupabaseAdminClient();
  const expectedHash = hashCode(email, parsed.data.code);
  const nowIso = new Date().toISOString();

  const { data: authCode, error: codeError } = await supabase
    .from("auth_codes")
    .select("id,email,expires_at,consumed_at")
    .eq("email", email)
    .eq("code_hash", expectedHash)
    .is("consumed_at", null)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (codeError || !authCode) return apiError("Invalid or expired login code.", 401, "INVALID_CODE");

  const isSuperAdmin = superAdminEmails().includes(email);
  const { data: existingUser } = await supabase
    .from("platform_users")
    .select("id,email,role,status")
    .eq("email", email)
    .maybeSingle();

  if (existingUser?.status === "suspended") return apiError("This account is suspended.", 403, "SUSPENDED");

  let user = existingUser;
  if (!user) {
    const { data: inserted, error: insertError } = await supabase
      .from("platform_users")
      .insert({ email, role: isSuperAdmin ? "super_admin" : "member", status: "active" })
      .select("id,email,role,status")
      .maybeSingle();
    if (insertError || !inserted) return apiError("Could not create account.", 500);
    user = inserted;
  } else if (isSuperAdmin && user.role !== "super_admin") {
    const { data: updated } = await supabase
      .from("platform_users")
      .update({ role: "super_admin", updated_at: nowIso })
      .eq("id", user.id)
      .select("id,email,role,status")
      .maybeSingle();
    user = updated || user;
  }

  await Promise.all([
    supabase.from("auth_codes").update({ consumed_at: nowIso }).eq("id", authCode.id),
    supabase.from("platform_users").update({ last_login_at: nowIso, updated_at: nowIso }).eq("id", user.id),
    supabase
      .from("workspace_members")
      .update({ user_id: user.id, status: "active", joined_at: nowIso, updated_at: nowIso })
      .eq("email", email)
      .in("status", ["invited", "active"]),
  ]);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: session, error: sessionError } = await supabase
    .from("platform_sessions")
    .insert({ user_id: user.id, email, role: user.role, expires_at: expiresAt })
    .select("id")
    .maybeSingle();
  if (sessionError || !session) return apiError("Could not create session.", 500);

  const cookieStore = await cookies();
  cookieStore.set("gcc_session", session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });

  return Response.json({ ok: true, role: user.role, next: user.role === "super_admin" ? "/super-admin" : "/workspace" });
}
