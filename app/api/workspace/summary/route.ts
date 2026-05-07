import { getSessionFromCookies } from "@/src/lib/auth/session";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { apiError } from "@/src/lib/api/response";

export async function GET(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const supabase = createSupabaseAdminClient();
  const url = new URL(request.url);
  const requestedWorkspaceId = url.searchParams.get("workspaceId");

  let workspaceId = requestedWorkspaceId || "";
  if (!workspaceId) {
    if (session.role === "super_admin") {
      const { data } = await supabase.from("workspaces").select("id").eq("status", "approved").order("created_at", { ascending: true }).limit(1).maybeSingle();
      workspaceId = data?.id || "";
    } else {
      const { data } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", session.userId).eq("status", "active").limit(1).maybeSingle();
      workspaceId = data?.workspace_id || "";
    }
  }
  if (!workspaceId) return Response.json({ ok: true, workspace: null, counts: {}, recent: {} });

  if (session.role !== "super_admin") {
    const { data: member } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", session.userId)
      .eq("status", "active")
      .maybeSingle();
    if (!member) return apiError("Workspace access denied.", 403, "FORBIDDEN");
  }

  const workspace = await supabase.from("workspaces").select("*").eq("id", workspaceId).maybeSingle();
  const [plans, targets, milestones, tasks, investors, marketing, weeklyReviews] = await Promise.all([
    supabase
      .from("growth_plans")
      .select("id,title,status,ai_status,source_type,updated_at,created_at")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase.from("growth_targets").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }).limit(8),
    supabase.from("growth_milestones").select("*").eq("workspace_id", workspaceId).order("due_at", { ascending: true }).limit(8),
    supabase.from("team_tasks").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }).limit(8),
    supabase.from("investor_outreach").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }).limit(8),
    supabase.from("marketing_activities").select("*").eq("workspace_id", workspaceId).order("activity_date", { ascending: false }).limit(8),
    supabase.from("weekly_reviews").select("*").eq("workspace_id", workspaceId).order("week_start", { ascending: false }).limit(6),
  ]);

  return Response.json({
    ok: true,
    workspace: workspace.data || null,
    counts: {
      plans: plans.data?.length || 0,
      targets: targets.data?.length || 0,
      milestones: milestones.data?.length || 0,
      tasks: tasks.data?.length || 0,
      investorFollowups: investors.data?.filter((row: any) => ["open", "follow_up", "warm"].includes(row.status)).length || 0,
      marketingActivities: marketing.data?.length || 0,
      weeklyReviews: weeklyReviews.data?.length || 0,
    },
    recent: {
      plans: plans.data || [],
      targets: targets.data || [],
      milestones: milestones.data || [],
      tasks: tasks.data || [],
      investors: investors.data || [],
      marketing: marketing.data || [],
      weeklyReviews: weeklyReviews.data || [],
    },
  });
}
