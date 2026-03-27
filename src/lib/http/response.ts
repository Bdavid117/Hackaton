type JsonRecord = Record<string, unknown>;

export function okJson(payload: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, ...payload }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function errorJson(error: string, status = 400, code?: string): Response {
  return new Response(JSON.stringify({ ok: false, error, code }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}