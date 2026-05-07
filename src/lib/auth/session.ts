import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export type SessionInfo = {
  id: string;
  userId: string;
  email: string;
  role: string;
};

export async function getSessionFromCookies(): Promise<SessionInfo | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("gcc_session")?.value;
  if (!sessionId) return null;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("platform_sessions")
    .select("id,user_id,email,role,expires_at")
    .eq("id", sessionId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    email: data.email,
    role: data.role,
  };
}

export async function requireSuperAdmin() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "super_admin") return null;
  return session;
}
