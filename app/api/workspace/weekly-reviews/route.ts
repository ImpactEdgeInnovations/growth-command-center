import { getSessionFromCookies } from "@/src/lib/auth/session";
import { assertWorkspaceAccess } from "@/src/lib/workspace/access";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { apiError } from "@/src/lib/api/response";
import { weeklyReviewSchema } from "@/src/lib/validators/workspace";

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const parsed = weeklyReviewSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Add the week and at least one review note.", 400);

  const access = await assertWorkspaceAccess(parsed.data.workspaceId, session);
  if (!access.ok) return apiError("Workspace access denied.", 403, "FORBIDDEN");

  const hasReviewBody = [
    parsed.data.headline,
    parsed.data.wins,
    parsed.data.blockers,
    parsed.data.numbers,
    parsed.data.nextFocus,
    parsed.data.founderNote,
  ].some((value) => String(value || "").trim().length > 0);
  if (!hasReviewBody) return apiError("Add at least one weekly review note.", 400);

  const nowIso = new Date().toISOString();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("weekly_reviews")
    .upsert(
      {
        workspace_id: parsed.data.workspaceId,
        week_start: parsed.data.weekStart,
        week_end: parsed.data.weekEnd,
        headline: parsed.data.headline || null,
        wins: parsed.data.wins || null,
        blockers: parsed.data.blockers || null,
        numbers: parsed.data.numbers || null,
        next_focus: parsed.data.nextFocus || null,
        founder_note: parsed.data.founderNote || null,
        status: parsed.data.status,
        created_by: session.userId,
        updated_at: nowIso,
      },
      { onConflict: "workspace_id,week_start" }
    )
    .select("*")
    .maybeSingle();

  if (error || !data) return apiError("Failed to save weekly review.", 500);
  return Response.json({ ok: true, review: data });
}
