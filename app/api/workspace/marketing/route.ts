import { getSessionFromCookies } from "@/src/lib/auth/session";
import { assertWorkspaceAccess, canWriteWorkspace } from "@/src/lib/workspace/access";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { apiError } from "@/src/lib/api/response";
import { marketingSchema } from "@/src/lib/validators/workspace";

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");
  const parsed = marketingSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Add a marketing activity title and channel.", 400);
  const access = await assertWorkspaceAccess(parsed.data.workspaceId, session);
  if (!access.ok) return apiError("Workspace access denied.", 403, "FORBIDDEN");
  if (!canWriteWorkspace(access.role)) return apiError("View-only teammates cannot change this workspace.", 403, "READ_ONLY_ROLE");

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("marketing_activities")
    .insert({
      workspace_id: parsed.data.workspaceId,
      channel: parsed.data.channel,
      activity_type: parsed.data.activityType,
      title: parsed.data.title,
      owner_name: parsed.data.ownerName || null,
      metric_name: parsed.data.metricName || null,
      metric_value: parsed.data.metricValue ?? null,
      activity_date: parsed.data.activityDate || new Date().toISOString().slice(0, 10),
      notes: parsed.data.notes || null,
    })
    .select("*")
    .maybeSingle();
  if (error || !data) return apiError("Failed to save marketing activity.", 500);
  return Response.json({ ok: true, activity: data });
}
