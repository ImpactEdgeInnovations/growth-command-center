import { applicationSchema } from "@/src/lib/validators/public";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { apiError, isSchemaMissingError } from "@/src/lib/api/response";

export async function POST(request: Request) {
  const parsed = applicationSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Please complete the company access request.", 400);

  const data = parsed.data;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("workspace_applications").insert({
    company_name: data.companyName,
    contact_name: data.contactName,
    contact_email: data.contactEmail.toLowerCase(),
    contact_phone: data.contactPhone || null,
    website: data.website || null,
    use_case: data.useCase,
    expected_team_size: data.expectedTeamSize || null,
    status: "pending",
  });

  if (error) {
    if (isSchemaMissingError(error)) return apiError("Growth Command Center SQL is not installed yet.", 409, "SCHEMA_MISSING");
    return apiError("Failed to submit company access request.", 500);
  }

  return Response.json({ ok: true, message: "Access request received. Super admin will review it before login is enabled." });
}
