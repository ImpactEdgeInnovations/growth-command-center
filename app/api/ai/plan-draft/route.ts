import { getSessionFromCookies } from "@/src/lib/auth/session";
import { apiError } from "@/src/lib/api/response";
import { generateAiPlanDraft } from "@/src/lib/ai/plan-draft";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { planDraftRequestSchema } from "@/src/lib/validators/workspace";
import { assertWorkspaceAccess, canWriteWorkspace } from "@/src/lib/workspace/access";
import { assertUsageLimit } from "@/src/lib/workspace/usage-limits";

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const parsed = planDraftRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return apiError("Add your company, business type, and main growth goal first.", 400);
  }

  const access = await assertWorkspaceAccess(parsed.data.workspaceId, session);
  if (!access.ok) return apiError("Workspace access denied.", 403, "FORBIDDEN");
  if (!canWriteWorkspace(access.role)) return apiError("View-only teammates cannot change this workspace.", 403, "READ_ONLY_ROLE");
  const limit = await assertUsageLimit(parsed.data.workspaceId, "aiBriefs");
  if (!limit.ok) return apiError(limit.error, limit.status, limit.code);

  const result = await generateAiPlanDraft(parsed.data);
  const supabase = createSupabaseAdminClient();

  const { data: brief } = await supabase
    .from("ai_briefs")
    .insert({
      workspace_id: parsed.data.workspaceId,
      brief_type: "plan_summary",
      prompt: JSON.stringify(parsed.data, null, 2),
      response: result.draft.planText,
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
    action: "ai_plan_draft_generated",
    entity_type: "ai_brief",
    entity_id: brief?.id || null,
    details: { model: result.model, company_name: parsed.data.companyName, website: parsed.data.companyWebsite || null },
  });

  return Response.json({
    ok: true,
    title: result.draft.title,
    planText: result.draft.planText,
    model: result.model,
    brief,
    requiresHumanApproval: true,
  });
}
