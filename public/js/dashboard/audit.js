import { fillTable, withButtonLoading } from "./ui-utils.js";

function formatAuditDetail(event) {
  if (!event?.payload) return "-";
  if (event.action === "upload_dataset") {
    return "Dataset " + (event.payload.sourceName || "-") + " | sesiones " + (event.payload.sessions || 0);
  }
  if (event.action === "chat_query") {
    return "Tool " + (event.payload.tool || "-") + " | dataset " + (event.payload.sourceName || "-");
  }
  if (event.action === "cleanup_datasets") {
    return "Eliminados " + (event.payload.removedCount || 0) + " | conservados " + (event.payload.remainingDatasets || 0);
  }
  if (event.action === "delete_dataset") {
    return "Eliminado " + (event.payload.deletedDatasetId || "-");
  }
  if (event.action === "activate_dataset") {
    return "Activo " + (event.payload.sourceName || "-");
  }
  return JSON.stringify(event.payload);
}

export async function loadAudit(ctx) {
  const params = new URLSearchParams();
  params.set("limit", "30");
  if (ctx.dom.auditActionFilter.value) params.set("action", ctx.dom.auditActionFilter.value);
  if (ctx.dom.auditActorFilter.value.trim()) params.set("actor", ctx.dom.auditActorFilter.value.trim());

  const res = await fetch("/api/audit?" + params.toString());
  const data = await res.json();

  if (!res.ok) {
    ctx.setStatus(ctx.dom.auditStatus, data.error || "No se pudo cargar auditoria.", true);
    fillTable("auditTable", [], ["at", "action", "actor", "details"]);
    return;
  }

  const rows = (data?.events ?? []).map((event) => ({
    at: event?.at ? new Date(event.at).toLocaleString() : "-",
    action: event?.action ?? "-",
    actor: event?.actor ?? "-",
    details: formatAuditDetail(event),
  }));

  ctx.setStatus(ctx.dom.auditStatus, "Eventos cargados: " + rows.length);
  fillTable("auditTable", rows, ["at", "action", "actor", "details"]);
}

export function bindAuditActions(ctx) {
  const { dom } = ctx;

  dom.refreshAuditBtn.addEventListener("click", async () => {
    await withButtonLoading(dom.refreshAuditBtn, "Actualizando...", async () => {
      await ctx.loadAudit();
    }, dom.appMain);
  });

  dom.clearAuditFiltersBtn.addEventListener("click", async () => {
    dom.auditActionFilter.value = "";
    dom.auditActorFilter.value = "";
    await ctx.loadAudit();
  });

  dom.auditActionFilter.addEventListener("change", async () => {
    await ctx.loadAudit();
  });

  dom.auditActorFilter.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    await ctx.loadAudit();
  });
}
