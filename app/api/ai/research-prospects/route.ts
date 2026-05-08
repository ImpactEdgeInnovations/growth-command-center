import { getSessionFromCookies } from "@/src/lib/auth/session";
import { apiError } from "@/src/lib/api/response";
import { researchProspects } from "@/src/lib/ai/prospect-research";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { prospectResearchSchema } from "@/src/lib/validators/workspace";
import { assertWorkspaceAccess, canWriteWorkspace } from "@/src/lib/workspace/access";
import { assertUsageLimit } from "@/src/lib/workspace/usage-limits";

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const parsed = prospectResearchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Add company, business type, and growth goal before research.", 400);

  const access = await assertWorkspaceAccess(parsed.data.workspaceId, session);
  if (!access.ok) return apiError("Workspace access denied.", 403, "FORBIDDEN");
  if (!canWriteWorkspace(access.role)) return apiError("View-only teammates cannot research for this workspace.", 403, "READ_ONLY_ROLE");

  const limit = await assertUsageLimit(parsed.data.workspaceId, "aiBriefs");
  if (!limit.ok) return apiError(limit.error, limit.status, limit.code);

  const result = await researchProspects(parsed.data);
  const supabase = createSupabaseAdminClient();
  const { data: brief } = await supabase
    .from("ai_briefs")
    .insert({
      workspace_id: parsed.data.workspaceId,
      brief_type: "research_note",
      prompt: JSON.stringify(parsed.data, null, 2),
      response: JSON.stringify(result.research, null, 2),
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
    action: "ai_prospect_research_generated",
    entity_type: "ai_brief",
    entity_id: brief?.id || null,
    details: {
      model: result.model,
      prospects: result.research.prospects.length,
      sources: result.research.sources.length,
      company: parsed.data.companyName,
    },
  });

  return Response.json({
    ok: true,
    research: result.research,
    model: result.model,
    brief,
    requiresHumanApproval: true,
  });
}
