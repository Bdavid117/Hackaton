import { getDom } from "./dom.js";
import { setStatus } from "./ui-utils.js";
import { syncDatasets, bindDatasetActions } from "./datasets.js";
import { refreshMetrics, bindMetricsActions } from "./metrics.js";
import { bindChatActions } from "./chat.js";
import { bindHealthActions, refreshGeminiHealth } from "./health.js";
import { disposeMarketingCharts, resizeMarketingCharts } from "./charts.js";

const dom = getDom();
const state = {
  latestMetrics: null,
  geminiReady: false,
  maxUploadBytes: null,
  maxUploadMB: null,
  hasProcessedData: false,
  sessionUploadCompleted: false,
};

const ctx = {
  dom,
  state,
  setStatus,
  syncDatasets: null,
  refreshMetrics: null,
  showDataWorkspace: null,
  hideDataWorkspace: null,
  showAdvancedDatasetControls: null,
  hideAdvancedDatasetControls: null,
};

ctx.syncDatasets = () => syncDatasets(ctx);
ctx.refreshMetrics = () => refreshMetrics(ctx);

ctx.showDataWorkspace = (tabName = "overview") => {
  ctx.state.hasProcessedData = true;
  ctx.dom.dataWorkspace?.classList.remove("is-hidden");
  const buttonMap = {
    overview: ctx.dom.tabOverviewBtn,
    insights: ctx.dom.tabInsightsBtn,
    tables: ctx.dom.tabTablesBtn,
  };
  const panelMap = {
    overview: ctx.dom.tabOverview,
    insights: ctx.dom.tabInsights,
    tables: ctx.dom.tabTables,
  };

  for (const [key, button] of Object.entries(buttonMap)) {
    if (!button) continue;
    const selected = key === tabName;
    button.setAttribute("aria-selected", selected ? "true" : "false");
    button.classList.toggle("secondary", !selected);
  }

  for (const [key, panel] of Object.entries(panelMap)) {
    if (!panel) continue;
    panel.classList.toggle("is-hidden", key !== tabName);
  }
};

ctx.hideDataWorkspace = () => {
  ctx.state.hasProcessedData = false;
  ctx.dom.dataWorkspace?.classList.add("is-hidden");
};

ctx.showAdvancedDatasetControls = () => {
  ctx.dom.advancedDatasetRow?.classList.remove("is-hidden");
  ctx.dom.refreshBtn?.classList.remove("is-hidden");
};

ctx.hideAdvancedDatasetControls = () => {
  ctx.dom.advancedDatasetRow?.classList.add("is-hidden");
  ctx.dom.refreshBtn?.classList.add("is-hidden");
};

bindDatasetActions(ctx);
bindMetricsActions(ctx);
bindChatActions(ctx);
bindHealthActions(ctx);

ctx.hideAdvancedDatasetControls();

ctx.dom.tabOverviewBtn?.addEventListener("click", () => ctx.showDataWorkspace("overview"));
ctx.dom.tabInsightsBtn?.addEventListener("click", () => ctx.showDataWorkspace("insights"));
ctx.dom.tabTablesBtn?.addEventListener("click", () => ctx.showDataWorkspace("tables"));

(async () => {
  const datasetsState = await ctx.syncDatasets();
  await refreshGeminiHealth(ctx);
  if (datasetsState?.activeDatasetId) {
    await ctx.refreshMetrics();
  } else {
    ctx.hideDataWorkspace();
  }
})();

window.addEventListener("resize", () => {
  resizeMarketingCharts();
});

window.addEventListener("beforeunload", () => {
  disposeMarketingCharts();
});
