import { getSessionFromCookies } from "@/src/lib/auth/session";
import { assertWorkspaceAccess, canWriteWorkspace } from "@/src/lib/workspace/access";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { apiError } from "@/src/lib/api/response";
import { targetSchema } from "@/src/lib/validators/workspace";

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");
  const parsed = targetSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Add a target label and value.", 400);
  const access = await assertWorkspaceAccess(parsed.data.workspaceId, session);
  if (!access.ok) return apiError("Workspace access denied.", 403, "FORBIDDEN");
  if (!canWriteWorkspace(access.role)) return apiError("View-only teammates cannot change this workspace.", 403, "READ_ONLY_ROLE");
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("growth_targets").insert({
    workspace_id: parsed.data.workspaceId,
    growth_plan_id: parsed.data.growthPlanId || null,
    label: parsed.data.label,
    metric_key: parsed.data.metricKey || null,
    target_value: parsed.data.targetValue,
    current_value: parsed.data.currentValue,
    owner_name: parsed.data.ownerName || null,
    notes: parsed.data.notes || null,
  }).select("*").maybeSingle();
  if (error || !data) return apiError("Failed to save target.", 500);
  return Response.json({ ok: true, target: data });
}
