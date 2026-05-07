import { getSessionFromCookies } from "@/src/lib/auth/session";
import { apiError } from "@/src/lib/api/response";
import { generateWorkspaceBrief } from "@/src/lib/ai/workspace-brief";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { workspaceBriefSchema } from "@/src/lib/validators/workspace";
import { assertWorkspaceAccess } from "@/src/lib/workspace/access";

const listLines = (title: string, rows: any[], render: (row: any) => string) => {
  if (!rows.length) return `${title}: none yet.`;
  return [`${title}:`, ...rows.map((row) => `- ${render(row)}`)].join("\n");
};

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const parsed = workspaceBriefSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Choose a workspace first.", 400);

  const access = await assertWorkspaceAccess(parsed.data.workspaceId, session);
  if (!access.ok) return apiError("Workspace access denied.", 403, "FORBIDDEN");

  const supabase = createSupabaseAdminClient();
  const [
    workspace,
    plans,
    targets,
    milestones,
    tasks,
    investors,
    marketing,
    weeklyReviews,
  ] = await Promise.all([
    supabase.from("workspaces").select("company_name,plan,subscription_enabled,subscription_status").eq("id", parsed.data.workspaceId).maybeSingle(),
    supabase.from("growth_plans").select("title,status,ai_status,updated_at").eq("workspace_id", parsed.data.workspaceId).order("updated_at", { ascending: false }).limit(5),
    supabase.from("growth_targets").select("label,target_value,current_value,status,notes").eq("workspace_id", parsed.data.workspaceId).order("updated_at", { ascending: false }).limit(8),
    supabase.from("growth_milestones").select("title,status,due_at,owner_name").eq("workspace_id", parsed.data.workspaceId).order("due_at", { ascending: true }).limit(8),
    supabase.from("team_tasks").select("title,lane,priority,status,assignee_name,due_at").eq("workspace_id", parsed.data.workspaceId).order("updated_at", { ascending: false }).limit(10),
    supabase.from("investor_outreach").select("investor_name,company_name,stage,status,next_follow_up_at,last_response").eq("workspace_id", parsed.data.workspaceId).order("updated_at", { ascending: false }).limit(8),
    supabase.from("marketing_activities").select("title,channel,activity_type,metric_name,metric_value,activity_date").eq("workspace_id", parsed.data.workspaceId).order("activity_date", { ascending: false }).limit(8),
    supabase.from("weekly_reviews").select("headline,week_start,week_end,wins,blockers,numbers,next_focus").eq("workspace_id", parsed.data.workspaceId).order("week_start", { ascending: false }).limit(3),
  ]);

  const context = [
    `Workspace: ${workspace.data?.company_name || "Unknown company"}`,
    `Plan: ${workspace.data?.plan || "trial"} · Subscription: ${workspace.data?.subscription_enabled ? workspace.data?.subscription_status : "off"}`,
    listLines("Growth plans", plans.data || [], (row) => `${row.title} · ${row.status} · AI ${row.ai_status}`),
    listLines("Targets", targets.data || [], (row) => `${row.label} · ${row.current_value}/${row.target_value} · ${row.status}${row.notes ? ` · ${row.notes}` : ""}`),
    listLines("Milestones", milestones.data || [], (row) => `${row.title} · ${row.status}${row.due_at ? ` · due ${row.due_at}` : ""}${row.owner_name ? ` · ${row.owner_name}` : ""}`),
    listLines("Team tasks", tasks.data || [], (row) => `${row.title} · ${row.lane} · ${row.priority} · ${row.status}${row.assignee_name ? ` · ${row.assignee_name}` : ""}`),
    listLines("Investor outreach", investors.data || [], (row) => `${row.investor_name}${row.company_name ? ` / ${row.company_name}` : ""} · ${row.stage} · ${row.status}${row.next_follow_up_at ? ` · follow up ${row.next_follow_up_at}` : ""}${row.last_response ? ` · ${row.last_response}` : ""}`),
    listLines("Marketing activity", marketing.data || [], (row) => `${row.title} · ${row.channel} · ${row.activity_type}${row.metric_name ? ` · ${row.metric_name}: ${row.metric_value || 0}` : ""}`),
    listLines("Weekly reviews", weeklyReviews.data || [], (row) => `${row.week_start} to ${row.week_end} · ${row.headline || "No headline"} · focus: ${row.next_focus || "not set"}`),
  ].join("\n\n");

  const result = await generateWorkspaceBrief(context);
  const { data: brief } = await supabase
    .from("ai_briefs")
    .insert({
      workspace_id: parsed.data.workspaceId,
      brief_type: "weekly_review",
      prompt: "Generate a weekly workspace command brief from current growth activity.",
      response: result.text,
      model: result.model,
      status: "draft",
      created_by: session.userId,
    })
    .select("*")
    .maybeSingle();

  await supabase.from("audit_logs").insert({
    workspace_id: parsed.data.workspaceId,
    actor_user_id: session.userId,
    actor_email: session.email,
    action: "ai_workspace_brief_generated",
    entity_type: "ai_brief",
    entity_id: brief?.id || null,
    details: { model: result.model },
  });

  return Response.json({
    ok: true,
    advice: result.text,
    model: result.model,
    brief,
    requiresHumanApproval: true,
  });
}
