import { getSessionFromCookies } from "@/src/lib/auth/session";
import { apiError } from "@/src/lib/api/response";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { planSchema } from "@/src/lib/validators/workspace";
import { assertWorkspaceAccess, canWriteWorkspace } from "@/src/lib/workspace/access";
import { assertUsageLimit } from "@/src/lib/workspace/usage-limits";

const PLAN_UPLOAD_BUCKET = "growth-plans";
const MAX_PLAN_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["md", "markdown", "txt"]);

function cleanFileName(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 96) || "growth-plan.txt"
  );
}

function extensionFromName(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.at(-1) || "" : "";
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const formData = await request.formData().catch(() => null);
  if (!formData) return apiError("Upload a Markdown or text plan file.", 400);

  const workspaceId = String(formData.get("workspaceId") || "");
  const title = String(formData.get("title") || "");
  const upload = formData.get("file");
  if (!(upload instanceof File)) {
    return apiError("Choose a .md, .markdown, or .txt plan file.", 400);
  }

  const extension = extensionFromName(upload.name);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return apiError("Only .md, .markdown, and .txt files are supported in this safe upload phase.", 400);
  }
  if (upload.size <= 0) return apiError("The selected file is empty.", 400);
  if (upload.size > MAX_PLAN_UPLOAD_BYTES) {
    return apiError("Plan upload is too large. Keep files under 2MB for this lightweight phase.", 400);
  }

  const extractedText = await upload.text().catch(() => "");
  const sourceType = "md_upload";
  const parsed = planSchema.safeParse({ workspaceId, title, sourceType, extractedText });
  if (!parsed.success) {
    return apiError("Add a clear title and upload a plan with at least 20 characters of readable text.", 400);
  }

  const access = await assertWorkspaceAccess(parsed.data.workspaceId, session);
  if (!access.ok) return apiError("Workspace access denied.", 403, "FORBIDDEN");
  if (!canWriteWorkspace(access.role)) return apiError("View-only teammates cannot change this workspace.", 403, "READ_ONLY_ROLE");
  const limit = await assertUsageLimit(parsed.data.workspaceId, "plans");
  if (!limit.ok) return apiError(limit.error, limit.status, limit.code);

  const safeName = cleanFileName(upload.name);
  const storagePath = `${parsed.data.workspaceId}/${Date.now()}-${safeName}`;
  const supabase = createSupabaseAdminClient();
  const bytes = await upload.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(PLAN_UPLOAD_BUCKET)
    .upload(storagePath, bytes, {
      contentType: upload.type || "text/plain",
      upsert: false,
    });
  if (uploadError) {
    return apiError(
      "Private plan storage is not ready yet. Run supabase/sql/003_plan_upload_storage.sql in the Growth Supabase project.",
      500,
      "PLAN_STORAGE_NOT_READY"
    );
  }

  const { data, error } = await supabase
    .from("growth_plans")
    .insert({
      workspace_id: parsed.data.workspaceId,
      title: parsed.data.title,
      source_type: parsed.data.sourceType,
      original_file_path: storagePath,
      extracted_text: parsed.data.extractedText,
      created_by: session.userId,
    })
    .select("*")
    .maybeSingle();

  if (error || !data) return apiError("Failed to save uploaded growth plan.", 500);
  return Response.json({ ok: true, plan: data });
}
