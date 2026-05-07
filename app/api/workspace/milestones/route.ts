import { getSessionFromCookies } from "@/src/lib/auth/session";
import { assertWorkspaceAccess, canWriteWorkspace } from "@/src/lib/workspace/access";
import { assertUsageLimit } from "@/src/lib/workspace/usage-limits";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { apiError } from "@/src/lib/api/response";
import { milestoneSchema } from "@/src/lib/validators/workspace";

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");
  const parsed = milestoneSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Add a milestone title.", 400);
  const access = await assertWorkspaceAccess(parsed.data.workspaceId, session);
  if (!access.ok) return apiError("Workspace access denied.", 403, "FORBIDDEN");
  if (!canWriteWorkspace(access.role)) return apiError("View-only teammates cannot change this workspace.", 403, "READ_ONLY_ROLE");
  const limit = await assertUsageLimit(parsed.data.workspaceId, "milestones");
  if (!limit.ok) return apiError(limit.error, limit.status, limit.code);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("growth_milestones").insert({
    workspace_id: parsed.data.workspaceId,
    growth_plan_id: parsed.data.growthPlanId || null,
    title: parsed.data.title,
    description: parsed.data.description || null,
    owner_name: parsed.data.ownerName || null,
    due_at: parsed.data.dueAt || null,
  }).select("*").maybeSingle();
  if (error || !data) return apiError("Failed to save milestone.", 500);
  return Response.json({ ok: true, milestone: data });
}
