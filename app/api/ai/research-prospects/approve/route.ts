import { getSessionFromCookies } from "@/src/lib/auth/session";
import { apiError } from "@/src/lib/api/response";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { prospectResearchApproveSchema } from "@/src/lib/validators/workspace";
import { assertWorkspaceAccess, canWriteWorkspace } from "@/src/lib/workspace/access";
import { assertUsageLimit } from "@/src/lib/workspace/usage-limits";

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const parsed = prospectResearchApproveSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Choose at least one researched prospect to save.", 400, "NO_PROSPECTS_SELECTED");

  const access = await assertWorkspaceAccess(parsed.data.workspaceId, session);
  if (!access.ok) return apiError("Workspace access denied.", 403, "FORBIDDEN");
  if (!canWriteWorkspace(access.role)) return apiError("View-only teammates cannot save outreach records.", 403, "READ_ONLY_ROLE");

  const limit = await assertUsageLimit(parsed.data.workspaceId, "investors", parsed.data.prospects.length);
  if (!limit.ok) return apiError(limit.error, limit.status, limit.code);

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("investor_outreach")
    .insert(
      parsed.data.prospects.map((prospect) => ({
        workspace_id: parsed.data.workspaceId,
        investor_name: prospect.investorName,
        company_name: prospect.companyName || null,
        contact_name: prospect.contactName || null,
        contact_email: prospect.contactEmail || null,
        stage: prospect.stage,
        status: prospect.status,
        source: prospect.source || "AI web research",
        notes: prospect.notes || null,
      }))
    )
    .select("*");

  if (error) return apiError("Could not save researched prospects.", 500, "RESEARCH_SAVE_FAILED");

  if (parsed.data.briefId) {
    await supabase
      .from("ai_briefs")
      .update({
        status: "approved",
        reviewed_by: session.userId,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", parsed.data.briefId)
      .eq("workspace_id", parsed.data.workspaceId);
  }

  await supabase.from("audit_logs").insert({
    workspace_id: parsed.data.workspaceId,
    actor_user_id: session.userId,
    actor_email: session.email,
    action: "ai_prospect_research_approved",
    entity_type: "investor_outreach",
    entity_id: null,
    details: {
      brief_id: parsed.data.briefId || null,
      saved: data?.length || 0,
    },
  });

  return Response.json({ ok: true, saved: data || [] });
}
