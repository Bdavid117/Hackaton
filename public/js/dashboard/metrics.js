import { csvEscape, fillTable, withButtonLoading } from "./ui-utils.js";
import { renderMarketingCharts, resizeMarketingCharts } from "./charts.js";
import { renderInsights } from "./insights.js";

function buildMarketingSummaryCsv(data) {
  const interpretation = data?.marketingInterpretation ?? {};
  const rows = [
    ["campo", "valor"],
    ["dataset", data?.sourceName ?? ""],
    ["dataset_id", data?.datasetId ?? ""],
    ["objetivo", interpretation?.objective ?? ""],
    ["sesiones", data?.kpis?.totalSessions ?? ""],
    ["abandono_rapido_pct", data?.kpis?.quickExitPct ?? ""],
    ["intent_pct", data?.conversionIntent?.intentPct ?? ""],
    ["resumen_ejecutivo", interpretation?.executiveSummary ?? ""],
  ];

  (interpretation?.recommendedActions ?? []).forEach((item, index) => {
    rows.push(["accion_" + (index + 1), item.action]);
    rows.push(["accion_" + (index + 1) + "_impacto", item.expectedImpact]);
    rows.push(["accion_" + (index + 1) + "_horizonte", item.horizon]);
  });

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function downloadMarketingSummaryCsv(data) {
  const csv = buildMarketingSummaryCsv(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const datasetName = (data?.sourceName || "dataset").replace(/[^a-zA-Z0-9_-]+/g, "_");
  link.href = url;
  link.download = "marketing_summary_" + datasetName + ".csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderMetrics(ctx, data) {
  ctx.state.latestMetrics = data;
  ctx.showDataWorkspace?.("overview");
  document.getElementById("kpiSessions").textContent = data?.kpis?.totalSessions ?? "-";
  document.getElementById("kpiDuration").textContent = data?.kpis?.avgDurationSec ?? "-";
  document.getElementById("kpiQuickExit").textContent = data?.kpis?.quickExitPct ?? "-";
  document.getElementById("kpiIntentPct").textContent = data?.conversionIntent?.intentPct ?? "-";
  document.getElementById("kpiHighIntentPct").textContent = data?.insights?.highIntent?.highIntentPct ?? "-";

  fillTable("topPagesTable", data?.topPages ?? [], ["page", "uniqueSessions", "pctSessions"]);
  const normalizedExitRate = (data?.exitRate ?? []).map((item) => ({
    ...item,
    exitRatePct: Number(item.exitRatePct).toFixed(2),
  }));
  fillTable("exitRateTable", normalizedExitRate, ["page", "exits", "exitRatePct"]);
  fillTable("flowsTable", data?.commonFlows ?? [], ["from", "to", "count"]);
  renderMarketingCharts(data);
  resizeMarketingCharts();
  renderInsights(data);
}

function clearMetricsUI() {
  document.getElementById("kpiSessions").textContent = "-";
  document.getElementById("kpiDuration").textContent = "-";
  document.getElementById("kpiQuickExit").textContent = "-";
  document.getElementById("kpiIntentPct").textContent = "-";
  document.getElementById("kpiHighIntentPct").textContent = "-";
  fillTable("topPagesTable", [], ["page", "uniqueSessions", "pctSessions"]);
  fillTable("exitRateTable", [], ["page", "exits", "exitRatePct"]);
  fillTable("flowsTable", [], ["from", "to", "count"]);
  renderMarketingCharts(null);
  const insights = document.getElementById("insights");
  if (insights) insights.innerHTML = '<p class="status">Carga y activa un dataset para ver insights de marketing.</p>';
}

export async function refreshMetrics(ctx) {
  const objective = ctx.dom.objectiveSelect.value || "leads";
  const res = await fetch("/api/metrics?objective=" + encodeURIComponent(objective));
  const data = await res.json();

  if (!res.ok) {
    if (data?.code === "DATASET_REQUIRED") {
      clearMetricsUI();
      ctx.hideDataWorkspace?.();
      ctx.state.latestMetrics = null;
      ctx.dom.chatDataset.textContent = "Dataset activo para chat: -";
      ctx.setStatus(ctx.dom.uploadStatus, "No hay dataset activo. Sube un CSV y activalo para iniciar el analisis.");
      return;
    }
    ctx.setStatus(ctx.dom.uploadStatus, data.error || "No fue posible cargar metricas.", true);
    return;
  }

  ctx.setStatus(
    ctx.dom.uploadStatus,
    "Dataset: " + data.sourceName + " | Actualizado: " + new Date(data.updatedAt).toLocaleTimeString()
  );
  if (data?.datasetId && ctx.dom.datasetSelect.value !== data.datasetId) {
    ctx.dom.datasetSelect.value = data.datasetId;
  }
  ctx.dom.chatDataset.textContent = "Dataset activo para chat: " + (data.sourceName || "-");
  renderMetrics(ctx, data);
}

export function bindMetricsActions(ctx) {
  ctx.dom.objectiveSelect.addEventListener("change", async () => {
    await ctx.refreshMetrics();
  });

  ctx.dom.exportSummaryBtn.addEventListener("click", async () => {
    if (!ctx.state.latestMetrics) {
      ctx.setStatus(ctx.dom.uploadStatus, "Primero carga metricas para exportar resumen.", true);
      return;
    }

    await withButtonLoading(ctx.dom.exportSummaryBtn, "Exportando...", async () => {
      downloadMarketingSummaryCsv(ctx.state.latestMetrics);
    }, ctx.dom.appMain);
  });
}
