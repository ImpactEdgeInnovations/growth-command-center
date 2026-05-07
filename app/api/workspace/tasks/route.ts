import { getSessionFromCookies } from "@/src/lib/auth/session";
import { assertWorkspaceAccess, canWriteWorkspace } from "@/src/lib/workspace/access";
import { assertUsageLimit } from "@/src/lib/workspace/usage-limits";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { apiError } from "@/src/lib/api/response";
import { taskSchema } from "@/src/lib/validators/workspace";

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");
  const parsed = taskSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Add a task title before saving.", 400);
  const access = await assertWorkspaceAccess(parsed.data.workspaceId, session);
  if (!access.ok) return apiError("Workspace access denied.", 403, "FORBIDDEN");
  if (!canWriteWorkspace(access.role)) return apiError("View-only teammates cannot change this workspace.", 403, "READ_ONLY_ROLE");
  const limit = await assertUsageLimit(parsed.data.workspaceId, "tasks");
  if (!limit.ok) return apiError(limit.error, limit.status, limit.code);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("team_tasks")
    .insert({
      workspace_id: parsed.data.workspaceId,
      growth_plan_id: parsed.data.growthPlanId || null,
      title: parsed.data.title,
      lane: parsed.data.lane,
      assignee_name: parsed.data.assigneeName || null,
      assignee_email: parsed.data.assigneeEmail || null,
      priority: parsed.data.priority,
      due_at: parsed.data.dueAt || null,
      notes: parsed.data.notes || null,
    })
    .select("*")
    .maybeSingle();
  if (error || !data) return apiError("Failed to save team task.", 500);
  return Response.json({ ok: true, task: data });
}
