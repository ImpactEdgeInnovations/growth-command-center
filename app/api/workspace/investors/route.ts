import { getSessionFromCookies } from "@/src/lib/auth/session";
import { assertWorkspaceAccess, canWriteWorkspace } from "@/src/lib/workspace/access";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { apiError } from "@/src/lib/api/response";
import { investorSchema } from "@/src/lib/validators/workspace";

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");
  const parsed = investorSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Add an investor or fund name.", 400);
  const access = await assertWorkspaceAccess(parsed.data.workspaceId, session);
  if (!access.ok) return apiError("Workspace access denied.", 403, "FORBIDDEN");
  if (!canWriteWorkspace(access.role)) return apiError("View-only teammates cannot change this workspace.", 403, "READ_ONLY_ROLE");

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("investor_outreach")
    .insert({
      workspace_id: parsed.data.workspaceId,
      investor_name: parsed.data.investorName,
      company_name: parsed.data.companyName || null,
      contact_name: parsed.data.contactName || null,
      contact_email: parsed.data.contactEmail || null,
      stage: parsed.data.stage,
      status: parsed.data.status,
      source: parsed.data.source || null,
      last_response: parsed.data.lastResponse || null,
      next_follow_up_at: parsed.data.nextFollowUpAt || null,
      notes: parsed.data.notes || null,
    })
    .select("*")
    .maybeSingle();
  if (error || !data) return apiError("Failed to save investor outreach.", 500);
  return Response.json({ ok: true, investor: data });
}
