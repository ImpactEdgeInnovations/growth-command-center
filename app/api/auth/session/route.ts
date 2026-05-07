import { getSessionFromCookies } from "@/src/lib/auth/session";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return Response.json({ ok: false, session: null }, { status: 401 });
  return Response.json({ ok: true, session });
}
