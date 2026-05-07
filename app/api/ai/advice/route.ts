import { getSessionFromCookies } from "@/src/lib/auth/session";
import { assertWorkspaceAccess, canWriteWorkspace } from "@/src/lib/workspace/access";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { generateGrowthAdvice } from "@/src/lib/ai/advisor";
import { apiError } from "@/src/lib/api/response";
import { adviceSchema } from "@/src/lib/validators/workspace";

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");
  const parsed = adviceSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Ask a clear growth question first.", 400);

  const workspaceId = parsed.data.workspaceId;
  if (workspaceId) {
    const access = await assertWorkspaceAccess(workspaceId, session);
    if (!access.ok) return apiError("Workspace access denied.", 403, "FORBIDDEN");
    if (!canWriteWorkspace(access.role)) return apiError("View-only teammates cannot change this workspace.", 403, "READ_ONLY_ROLE");
  }

  try {
    const result = await generateGrowthAdvice({
      prompt: parsed.data.prompt,
      context: parsed.data.context,
      briefType: parsed.data.briefType,
    });

    let brief = null;
    if (workspaceId) {
      const supabase = createSupabaseAdminClient();
      const { data } = await supabase
        .from("ai_briefs")
        .insert({
          workspace_id: workspaceId,
          growth_plan_id: parsed.data.growthPlanId || null,
          brief_type: parsed.data.briefType,
          prompt: parsed.data.prompt,
          response: result.text,
          model: result.model,
          status: "draft",
          created_by: session.userId,
        })
        .select("*")
        .maybeSingle();
      brief = data || null;
    }

    return Response.json({
      ok: true,
      advice: result.text,
      model: result.model,
      brief,
      requiresHumanApproval: true,
    });
  } catch (error: any) {
    return apiError(error?.message || "AI advisor failed.", 502, "AI_PROVIDER_FAILED");
  }
}
