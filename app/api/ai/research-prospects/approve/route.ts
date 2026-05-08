import { getSessionFromCookies } from "@/src/lib/auth/session";
import { apiError } from "@/src/lib/api/response";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { prospectResearchApproveSchema } from "@/src/lib/validators/workspace";
import { assertWorkspaceAccess, canWriteWorkspace } from "@/src/lib/workspace/access";
import { assertUsageLimit } from "@/src/lib/workspace/usage-limits";

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const parsed = prospectResearchApproveSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Choose at least one researched item to save.", 400, "NO_RESEARCH_ITEMS_SELECTED");

  const access = await assertWorkspaceAccess(parsed.data.workspaceId, session);
  if (!access.ok) return apiError("Workspace access denied.", 403, "FORBIDDEN");
  if (!canWriteWorkspace(access.role)) return apiError("View-only teammates cannot save outreach records.", 403, "READ_ONLY_ROLE");

  if (parsed.data.prospects.length) {
    const limit = await assertUsageLimit(parsed.data.workspaceId, "investors", parsed.data.prospects.length);
    if (!limit.ok) return apiError(limit.error, limit.status, limit.code);
  }
  if (parsed.data.targets.length) {
    const limit = await assertUsageLimit(parsed.data.workspaceId, "targets", parsed.data.targets.length);
    if (!limit.ok) return apiError(limit.error, limit.status, limit.code);
  }
  if (parsed.data.tasks.length) {
    const limit = await assertUsageLimit(parsed.data.workspaceId, "tasks", parsed.data.tasks.length);
    if (!limit.ok) return apiError(limit.error, limit.status, limit.code);
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const [prospects, targets, tasks] = await Promise.all([
    parsed.data.prospects.length
      ? supabase
          .from("investor_outreach")
          .insert(
            parsed.data.prospects.map((prospect) => ({
              workspace_id: parsed.data.workspaceId,
              investor_name: prospect.investorName,
              company_name: prospect.companyName || null,
              contact_name: prospect.contactName || null,
              contact_email: prospect.contactEmail || null,
              stage: prospect.stage,
              status: prospect.status,
              source: prospect.source || "AI web research",
              notes: prospect.notes || null,
            }))
          )
          .select("*")
      : Promise.resolve({ data: [], error: null }),
    parsed.data.targets.length
      ? supabase
          .from("growth_targets")
          .insert(
            parsed.data.targets.map((target) => ({
              workspace_id: parsed.data.workspaceId,
              growth_plan_id: null,
              label: target.label,
              metric_key: target.metricKey || null,
              target_value: target.targetValue,
              current_value: 0,
              owner_name: "Founder / growth team",
              notes: target.notes || "Created from AI prospect research.",
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
              growth_plan_id: null,
              title: task.title,
              lane: task.lane,
              priority: task.priority,
              notes: task.notes || "Created from AI prospect research.",
            }))
          )
          .select("*")
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (prospects.error || targets.error || tasks.error) {
    return apiError("Could not save one or more researched items.", 500, "RESEARCH_SAVE_FAILED");
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

  await supabase.from("audit_logs").insert({
    workspace_id: parsed.data.workspaceId,
    actor_user_id: session.userId,
    actor_email: session.email,
    action: "ai_prospect_research_approved",
    entity_type: "investor_outreach",
    entity_id: null,
    details: {
      brief_id: parsed.data.briefId || null,
      prospects: prospects.data?.length || 0,
      targets: targets.data?.length || 0,
      tasks: tasks.data?.length || 0,
    },
  });

  return Response.json({
    ok: true,
    saved: {
      prospects: prospects.data || [],
      targets: targets.data || [],
      tasks: tasks.data || [],
    },
  });
}
