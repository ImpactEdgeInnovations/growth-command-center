import { requireSuperAdmin } from "@/src/lib/auth/session";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { apiError } from "@/src/lib/api/response";
import { slugify } from "@/src/lib/slug";

export async function PATCH(request: Request) {
  const session = await requireSuperAdmin();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  const action = String(body.action || "").toLowerCase();
  const subscriptionEnabled = Boolean(body.subscriptionEnabled);
  const plan = String(body.plan || "trial");
  const adminNote = String(body.adminNote || "").trim();
  if (!id || !["approve", "reject"].includes(action)) return apiError("Invalid application review.", 400);

  const supabase = createSupabaseAdminClient();
  const { data: application, error: loadError } = await supabase
    .from("workspace_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (loadError || !application) return apiError("Application not found.", 404);
  if (application.status !== "pending") return apiError("Only pending applications can be reviewed.", 400);

  const nowIso = new Date().toISOString();
  let workspaceId: string | null = null;
  if (action === "approve") {
    const baseSlug = slugify(application.company_name);
    let slug = baseSlug;
    for (let suffix = 1; suffix <= 8; suffix += 1) {
      const { data: existing } = await supabase.from("workspaces").select("id").eq("slug", slug).maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${suffix + 1}`;
    }

    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .insert({
        company_name: application.company_name,
        slug,
        website: application.website,
        owner_email: application.contact_email,
        owner_phone: application.contact_phone,
        status: "approved",
        plan,
        subscription_enabled: subscriptionEnabled,
        subscription_status: subscriptionEnabled ? "trial" : "off",
        approved_at: nowIso,
        approved_by: session.userId,
        settings: { source_application_id: id, ai_requires_human_approval: true },
      })
      .select("id")
      .maybeSingle();
    if (workspaceError || !workspace) return apiError("Failed to create workspace.", 500);
    workspaceId = workspace.id;

    await supabase.from("workspace_members").insert({
      workspace_id: workspaceId,
      email: application.contact_email.toLowerCase(),
      full_name: application.contact_name,
      role: "owner",
      status: "invited",
    });
  }

  const { error } = await supabase
    .from("workspace_applications")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      workspace_id: workspaceId,
      reviewed_at: nowIso,
      reviewed_by: session.userId,
      admin_note: adminNote || null,
      updated_at: nowIso,
    })
    .eq("id", id);
  if (error) return apiError("Failed to update application.", 500);

  await supabase.from("audit_logs").insert({
    actor_user_id: session.userId,
    actor_email: session.email,
    action: `workspace_application_${action}`,
    entity_type: "workspace_application",
    entity_id: id,
    workspace_id: workspaceId,
    details: { companyName: application.company_name, plan, subscriptionEnabled, adminNote },
  });

  return Response.json({ ok: true, workspaceId });
}
