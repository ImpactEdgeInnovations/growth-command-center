import { getSessionFromCookies } from "@/src/lib/auth/session";
import { apiError } from "@/src/lib/api/response";
import { generatePlanSuggestions } from "@/src/lib/ai/plan-suggestions";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { planSuggestionRequestSchema } from "@/src/lib/validators/workspace";
import { assertWorkspaceAccess } from "@/src/lib/workspace/access";

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const parsed = planSuggestionRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Choose a saved growth plan first.", 400);

  const access = await assertWorkspaceAccess(parsed.data.workspaceId, session);
  if (!access.ok) return apiError("Workspace access denied.", 403, "FORBIDDEN");

  const supabase = createSupabaseAdminClient();
  const { data: plan, error: planError } = await supabase
    .from("growth_plans")
    .select("id,title,extracted_text")
    .eq("id", parsed.data.growthPlanId)
    .eq("workspace_id", parsed.data.workspaceId)
    .maybeSingle();
  if (planError || !plan?.extracted_text) {
    return apiError("This plan has no readable text for AI suggestions.", 400, "PLAN_TEXT_MISSING");
  }

  await supabase
    .from("growth_plans")
    .update({ ai_status: "requested", updated_at: new Date().toISOString() })
    .eq("id", plan.id);

  const result = await generatePlanSuggestions({
    title: plan.title,
    planText: plan.extracted_text,
  });

  const { data: brief } = await supabase
    .from("ai_briefs")
    .insert({
      workspace_id: parsed.data.workspaceId,
      growth_plan_id: parsed.data.growthPlanId,
      brief_type: "task_suggestions",
      prompt: "Turn this growth plan into draft targets, milestones, and team tasks.",
      response: JSON.stringify(result.suggestions, null, 2),
      model: result.model,
      status: "draft",
      created_by: session.userId,
    })
    .select("*")
    .maybeSingle();

  await supabase
    .from("growth_plans")
    .update({
      ai_status: "draft_ready",
      summary: result.suggestions.summary,
      updated_at: new Date().toISOString(),
    })
    .eq("id", plan.id);

  await supabase.from("audit_logs").insert({
    workspace_id: parsed.data.workspaceId,
    actor_user_id: session.userId,
    actor_email: session.email,
    action: "ai_plan_suggestions_generated",
    entity_type: "growth_plan",
    entity_id: parsed.data.growthPlanId,
    details: { model: result.model, brief_id: brief?.id || null },
  });

  return Response.json({
    ok: true,
    suggestions: result.suggestions,
    model: result.model,
    brief,
    requiresHumanApproval: true,
  });
}
