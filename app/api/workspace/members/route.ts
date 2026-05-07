import { getSessionFromCookies } from "@/src/lib/auth/session";
import { apiError } from "@/src/lib/api/response";
import { optionalEnv } from "@/src/lib/env";
import { sendEmail } from "@/src/lib/email/send";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { workspaceMemberInviteSchema, workspaceMemberUpdateSchema } from "@/src/lib/validators/workspace";
import { assertWorkspaceAccess, canManageWorkspace } from "@/src/lib/workspace/access";

export async function GET(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const workspaceId = new URL(request.url).searchParams.get("workspaceId") || "";
  if (!workspaceId) return apiError("Choose a workspace before loading members.", 400);

  const access = await assertWorkspaceAccess(workspaceId, session);
  if (!access.ok) return apiError("Workspace access denied.", 403, "FORBIDDEN");

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("id,user_id,email,full_name,role,status,joined_at,created_at,updated_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) return apiError("Could not load workspace members.", 500);

  return Response.json({
    ok: true,
    canManage: canManageWorkspace(access.role),
    members: data || [],
  });
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const parsed = workspaceMemberInviteSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Enter a valid invite email and role.", 400);

  const access = await assertWorkspaceAccess(parsed.data.workspaceId, session);
  if (!access.ok) return apiError("Workspace access denied.", 403, "FORBIDDEN");
  if (!canManageWorkspace(access.role)) {
    return apiError("Only workspace owners/admins can invite teammates.", 403, "FORBIDDEN");
  }

  const supabase = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id,company_name,slug,status")
    .eq("id", parsed.data.workspaceId)
    .maybeSingle();
  if (!workspace || workspace.status !== "approved") return apiError("Workspace is not approved yet.", 400);

  const { data: user } = await supabase
    .from("platform_users")
    .select("id,status")
    .eq("email", parsed.data.email)
    .maybeSingle();

  if (user?.status === "suspended") {
    return apiError("This user account is suspended and cannot be invited.", 403, "SUSPENDED");
  }

  const memberStatus = user?.id ? "active" : "invited";
  const { data: existing } = await supabase
    .from("workspace_members")
    .select("id,status,role")
    .eq("workspace_id", parsed.data.workspaceId)
    .eq("email", parsed.data.email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.role === "owner") {
    return apiError("Workspace owner access is managed by the super admin panel.", 400, "OWNER_MANAGED");
  }

  const memberPayload = {
    workspace_id: parsed.data.workspaceId,
    user_id: user?.id || null,
    email: parsed.data.email,
    full_name: parsed.data.fullName || null,
    role: parsed.data.role,
    status: memberStatus,
    invited_by: session.userId,
    joined_at: user?.id ? nowIso : null,
    updated_at: nowIso,
  };

  const result = existing
    ? await supabase.from("workspace_members").update(memberPayload).eq("id", existing.id).select("*").maybeSingle()
    : await supabase.from("workspace_members").insert(memberPayload).select("*").maybeSingle();

  if (result.error || !result.data) return apiError("Could not save teammate invite.", 500);

  await supabase.from("audit_logs").insert({
    workspace_id: parsed.data.workspaceId,
    actor_user_id: session.userId,
    actor_email: session.email,
    action: "workspace_member_invited",
    entity_type: "workspace_member",
    entity_id: result.data.id,
    details: {
      email: parsed.data.email,
      role: parsed.data.role,
      status: memberStatus,
      workspace: workspace.company_name,
    },
  });

  const appUrl = optionalEnv("APP_URL", "http://127.0.0.1:3010").replace(/\/$/, "");
  await sendEmail({
    to: parsed.data.email,
    subject: `You're invited to ${workspace.company_name} on Growth Command Center`,
    text: `You have been invited to ${workspace.company_name} on Growth Command Center. Log in with this email at ${appUrl}/login to receive your verification code.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#f2f9ff;color:#061b34">
        <div style="background:white;border:1px solid #d7ecfb;border-radius:22px;padding:22px">
          <p style="font-size:12px;text-transform:uppercase;letter-spacing:.18em;color:#0b8ed8;font-weight:800">Growth Command Center</p>
          <h2 style="margin:6px 0 10px;color:#06243a">You're invited to ${workspace.company_name}</h2>
          <p style="line-height:1.6;color:#52657a">Use this email address to log in. We will send a fresh verification code each time for security.</p>
          <a href="${appUrl}/login" style="display:inline-block;background:#0b8ed8;color:white;text-decoration:none;padding:12px 16px;border-radius:14px;font-weight:800">Open Growth Command Center</a>
        </div>
      </div>
    `,
  }).catch(async (error) => {
    await supabase.from("audit_logs").insert({
      workspace_id: parsed.data.workspaceId,
      actor_user_id: session.userId,
      actor_email: session.email,
      action: "workspace_member_invite_email_failed",
      entity_type: "workspace_member",
      entity_id: result.data.id,
      details: { email: parsed.data.email, message: error?.message || "Email send failed" },
    });
  });

  return Response.json({ ok: true, member: result.data });
}

export async function PATCH(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const parsed = workspaceMemberUpdateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Choose a valid teammate role and status.", 400);

  const access = await assertWorkspaceAccess(parsed.data.workspaceId, session);
  if (!access.ok) return apiError("Workspace access denied.", 403, "FORBIDDEN");
  if (!canManageWorkspace(access.role)) {
    return apiError("Only workspace owners/admins can update teammate access.", 403, "FORBIDDEN");
  }

  const supabase = createSupabaseAdminClient();
  const { data: member } = await supabase
    .from("workspace_members")
    .select("id,user_id,email,full_name,role,status")
    .eq("id", parsed.data.memberId)
    .eq("workspace_id", parsed.data.workspaceId)
    .maybeSingle();

  if (!member) return apiError("Team member not found.", 404);
  if (member.role === "owner") {
    return apiError("Workspace owner access is managed by the super admin panel.", 400, "OWNER_MANAGED");
  }
  if (member.user_id === session.userId) {
    return apiError("You cannot change your own access from this panel.", 400, "SELF_ACCESS_LOCKED");
  }
  if (!member.user_id && parsed.data.status === "active") {
    return apiError("Invited teammates become active after their first email-code login.", 400, "INVITE_NOT_CLAIMED");
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("workspace_members")
    .update({
      role: parsed.data.role,
      status: parsed.data.status,
      updated_at: nowIso,
    })
    .eq("id", parsed.data.memberId)
    .select("*")
    .maybeSingle();

  if (error || !updated) return apiError("Could not update teammate access.", 500);

  await supabase.from("audit_logs").insert({
    workspace_id: parsed.data.workspaceId,
    actor_user_id: session.userId,
    actor_email: session.email,
    action: "workspace_member_access_updated",
    entity_type: "workspace_member",
    entity_id: parsed.data.memberId,
    details: {
      email: member.email,
      previous_role: member.role,
      previous_status: member.status,
      next_role: parsed.data.role,
      next_status: parsed.data.status,
    },
  });

  return Response.json({ ok: true, member: updated });
}
