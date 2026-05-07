import { requireSuperAdmin } from "@/src/lib/auth/session";
import { apiError } from "@/src/lib/api/response";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { superAdminWorkspaceUpdateSchema } from "@/src/lib/validators/workspace";

export async function PATCH(request: Request) {
  const session = await requireSuperAdmin();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const parsed = superAdminWorkspaceUpdateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Choose a valid workspace plan and subscription state.", 400);

  const subscriptionStatus = parsed.data.subscriptionEnabled
    ? parsed.data.subscriptionStatus === "off"
      ? "trial"
      : parsed.data.subscriptionStatus
    : "off";

  const supabase = createSupabaseAdminClient();
  const { data: workspace, error: loadError } = await supabase
    .from("workspaces")
    .select("id,company_name,plan,subscription_enabled,subscription_status,status")
    .eq("id", parsed.data.workspaceId)
    .maybeSingle();
  if (loadError || !workspace) return apiError("Workspace not found.", 404, "WORKSPACE_NOT_FOUND");

  const update = {
    status: parsed.data.status,
    plan: parsed.data.plan,
    subscription_enabled: parsed.data.subscriptionEnabled,
    subscription_status: subscriptionStatus,
    billing_notes: parsed.data.billingNotes || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("workspaces")
    .update(update)
    .eq("id", parsed.data.workspaceId)
    .select("id,company_name,slug,status,plan,subscription_enabled,subscription_status,billing_notes,owner_email,created_at")
    .maybeSingle();
  if (error || !data) return apiError("Failed to update workspace subscription controls.", 500);

  await supabase.from("audit_logs").insert({
    actor_user_id: session.userId,
    actor_email: session.email,
    action: "workspace_subscription_updated",
    entity_type: "workspace",
    entity_id: parsed.data.workspaceId,
    workspace_id: parsed.data.workspaceId,
    details: {
      before: {
        status: workspace.status,
        plan: workspace.plan,
        subscriptionEnabled: workspace.subscription_enabled,
        subscriptionStatus: workspace.subscription_status,
      },
      after: {
        status: update.status,
        plan: update.plan,
        subscriptionEnabled: update.subscription_enabled,
        subscriptionStatus: update.subscription_status,
      },
    },
  });

  return Response.json({ ok: true, workspace: data });
}
