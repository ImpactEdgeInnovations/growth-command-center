import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import type { SessionInfo } from "@/src/lib/auth/session";

export const WORKSPACE_MANAGE_ROLES = new Set(["super_admin", "owner", "admin"]);
export const WORKSPACE_WRITE_ROLES = new Set(["super_admin", "owner", "admin", "member"]);

export function canManageWorkspace(role: string | null | undefined) {
  return WORKSPACE_MANAGE_ROLES.has(role || "");
}

export function canWriteWorkspace(role: string | null | undefined) {
  return WORKSPACE_WRITE_ROLES.has(role || "");
}

export async function assertWorkspaceAccess(workspaceId: string, session: SessionInfo) {
  if (session.role === "super_admin") return { ok: true, role: "super_admin" };
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role,status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", session.userId)
    .maybeSingle();
  if (error || !data || data.status !== "active") return { ok: false, role: null };
  return { ok: true, role: data.role as string };
}
