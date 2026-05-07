import { getSessionFromCookies } from "@/src/lib/auth/session";
import { apiError } from "@/src/lib/api/response";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { planSuggestionApproveSchema } from "@/src/lib/validators/workspace";
import { assertWorkspaceAccess, canWriteWorkspace } from "@/src/lib/workspace/access";
import { assertUsageLimit } from "@/src/lib/workspace/usage-limits";

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const parsed = planSuggestionApproveSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Approve at least one AI suggestion before saving.", 400);

  const access = await assertWorkspaceAccess(parsed.data.workspaceId, session);
  if (!access.ok) return apiError("Workspace access denied.", 403, "FORBIDDEN");
  if (!canWriteWorkspace(access.role)) return apiError("View-only teammates cannot change this workspace.", 403, "READ_ONLY_ROLE");
  if (parsed.data.targets.length) {
    const limit = await assertUsageLimit(parsed.data.workspaceId, "targets", parsed.data.targets.length);
    if (!limit.ok) return apiError(limit.error, limit.status, limit.code);
  }
  if (parsed.data.milestones.length) {
    const limit = await assertUsageLimit(parsed.data.workspaceId, "milestones", parsed.data.milestones.length);
    if (!limit.ok) return apiError(limit.error, limit.status, limit.code);
  }
  if (parsed.data.tasks.length) {
    const limit = await assertUsageLimit(parsed.data.workspaceId, "tasks", parsed.data.tasks.length);
    if (!limit.ok) return apiError(limit.error, limit.status, limit.code);
  }

  const supabase = createSupabaseAdminClient();
  const { data: plan } = await supabase
    .from("growth_plans")
    .select("id")
    .eq("id", parsed.data.growthPlanId)
    .eq("workspace_id", parsed.data.workspaceId)
    .maybeSingle();
  if (!plan) return apiError("Growth plan not found.", 404, "PLAN_NOT_FOUND");

  const now = new Date().toISOString();
  const [targets, milestones, tasks] = await Promise.all([
    parsed.data.targets.length
      ? supabase
          .from("growth_targets")
          .insert(
            parsed.data.targets.map((target) => ({
              workspace_id: parsed.data.workspaceId,
              growth_plan_id: parsed.data.growthPlanId,
              label: target.label,
              metric_key: target.metricKey || null,
              target_value: target.targetValue,
              current_value: 0,
              notes: target.notes || null,
            }))
          )
          .select("*")
      : Promise.resolve({ data: [], error: null }),
    parsed.data.milestones.length
      ? supabase
          .from("growth_milestones")
          .insert(
            parsed.data.milestones.map((milestone) => ({
              workspace_id: parsed.data.workspaceId,
              growth_plan_id: parsed.data.growthPlanId,
              title: milestone.title,
              description: milestone.description || null,
              owner_name: milestone.ownerName || null,
            }))
          )
          .select("*")
      : Promise.resolve({ data: [], error: null }),
    parsed.data.tasks.length
      ? supabase
          .from("team_tasks")
          .insert(
            parsed.data.tasks.map((task) => ({
              workspace_id: parsed.data.workspaceId,
              growth_plan_id: parsed.data.growthPlanId,
              title: task.title,
              lane: task.lane,
              assignee_name: task.assigneeName || null,
              priority: task.priority,
              notes: task.notes || null,
            }))
          )
          .select("*")
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (targets.error || milestones.error || tasks.error) {
    return apiError("Could not save one or more approved suggestions.", 500, "SUGGESTION_SAVE_FAILED");
  }

  if (parsed.data.briefId) {
    await supabase
      .from("ai_briefs")
      .update({
        status: "approved",
        reviewed_by: session.userId,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", parsed.data.briefId)
      .eq("workspace_id", parsed.data.workspaceId);
  }

  await supabase
    .from("growth_plans")
    .update({ ai_status: "approved", status: "reviewed", updated_at: now })
    .eq("id", parsed.data.growthPlanId)
    .eq("workspace_id", parsed.data.workspaceId);

  await supabase.from("audit_logs").insert({
    workspace_id: parsed.data.workspaceId,
    actor_user_id: session.userId,
    actor_email: session.email,
    action: "ai_plan_suggestions_approved",
    entity_type: "growth_plan",
    entity_id: parsed.data.growthPlanId,
    details: {
      brief_id: parsed.data.briefId || null,
      targets: targets.data?.length || 0,
      milestones: milestones.data?.length || 0,
      tasks: tasks.data?.length || 0,
    },
  });

  return Response.json({
    ok: true,
    saved: {
      targets: targets.data || [],
      milestones: milestones.data || [],
      tasks: tasks.data || [],
    },
  });
}
