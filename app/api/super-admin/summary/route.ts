import { requireSuperAdmin } from "@/src/lib/auth/session";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { apiError, isSchemaMissingError } from "@/src/lib/api/response";

const safeCount = async (query: PromiseLike<{ count: number | null; error: any }>) => {
  const { count, error } = await query;
  if (error) return 0;
  return count || 0;
};

export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const supabase = createSupabaseAdminClient();
  const applications = await supabase
    .from("workspace_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(80);

  if (applications.error) {
    if (isSchemaMissingError(applications.error)) {
      return Response.json({ ok: true, schemaReady: false, applications: [], workspaces: [], counts: {} });
    }
    return apiError("Failed to load applications.", 500);
  }

  const workspaces = await supabase
    .from("workspaces")
    .select("id,company_name,slug,status,plan,subscription_enabled,subscription_status,billing_notes,owner_email,created_at")
    .order("created_at", { ascending: false })
    .limit(80);

  const [targets, milestones, tasks, aiBriefs] = await Promise.all([
    safeCount(supabase.from("growth_targets").select("*", { count: "exact", head: true }).neq("status", "closed")),
    safeCount(supabase.from("growth_milestones").select("*", { count: "exact", head: true }).in("status", ["planned", "in_progress", "blocked"])),
    safeCount(supabase.from("team_tasks").select("*", { count: "exact", head: true }).in("status", ["todo", "in_progress", "blocked"])),
    safeCount(supabase.from("ai_briefs").select("*", { count: "exact", head: true }).eq("status", "draft")),
  ]);

  const applicationRows = applications.data || [];
  const workspaceRows = workspaces.data || [];
  return Response.json({
    ok: true,
    schemaReady: true,
    applications: applicationRows,
    workspaces: workspaceRows,
    counts: {
      pendingApplications: applicationRows.filter((row: any) => row.status === "pending").length,
      approvedWorkspaces: workspaceRows.filter((row: any) => row.status === "approved").length,
      subscriptionsOn: workspaceRows.filter((row: any) => row.subscription_enabled).length,
      activeTargets: targets,
      openMilestones: milestones,
      openTasks: tasks,
      aiDrafts: aiBriefs,
    },
  });
}
