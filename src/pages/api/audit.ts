import type { APIRoute } from "astro";
import { errorJson, okJson } from "../../lib/http/response";
import { queryAuditEvents, type AuditAction } from "../../lib/observability/audit";

const VALID_ACTIONS: AuditAction[] = [
  "upload_dataset",
  "activate_dataset",
  "delete_dataset",
  "cleanup_datasets",
  "chat_query",
];

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const limitRaw = Number(url.searchParams.get("limit") ?? NaN);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : 20;
    const actionRaw = (url.searchParams.get("action") ?? "").trim();
    const actorRaw = (url.searchParams.get("actor") ?? "").trim();

    const action = VALID_ACTIONS.includes(actionRaw as AuditAction)
      ? (actionRaw as AuditAction)
      : undefined;

    const events = await queryAuditEvents({
      limit: Math.min(limit, 200),
      action,
      actorContains: actorRaw || undefined,
    });

    return okJson({
      events,
      count: events.length,
      filters: {
        action: action ?? null,
        actor: actorRaw || null,
      },
    });
  } catch (error) {
    console.error("[api/audit][GET]", error);
    return errorJson("No se pudo obtener auditoria.", 500, "AUDIT_INTERNAL_ERROR");
  }
};