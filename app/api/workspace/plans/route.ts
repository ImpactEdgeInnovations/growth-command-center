import { getSessionFromCookies } from "@/src/lib/auth/session";
import { assertWorkspaceAccess, canWriteWorkspace } from "@/src/lib/workspace/access";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { apiError } from "@/src/lib/api/response";
import { planSchema } from "@/src/lib/validators/workspace";

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");
  const parsed = planSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Add a title and plan text before saving.", 400);
  const access = await assertWorkspaceAccess(parsed.data.workspaceId, session);
  if (!access.ok) return apiError("Workspace access denied.", 403, "FORBIDDEN");
  if (!canWriteWorkspace(access.role)) return apiError("View-only teammates cannot change this workspace.", 403, "READ_ONLY_ROLE");

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("growth_plans")
    .insert({
      workspace_id: parsed.data.workspaceId,
      title: parsed.data.title,
      source_type: parsed.data.sourceType,
      extracted_text: parsed.data.extractedText,
      created_by: session.userId,
    })
    .select("*")
    .maybeSingle();
  if (error || !data) return apiError("Failed to save growth plan.", 500);
  return Response.json({ ok: true, plan: data });
}
