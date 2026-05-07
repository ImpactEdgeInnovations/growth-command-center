export function apiError(message: string, status = 400, code = "BAD_REQUEST") {
  return Response.json({ ok: false, error: message, code }, { status });
}

export function isSchemaMissingError(error: any) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST204" ||
    /relation .* does not exist/i.test(message) ||
    /column .* does not exist/i.test(message) ||
    /schema cache/i.test(message)
  );
}
