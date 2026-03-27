const charts = new Map();

function getPlotly() {
  return window.Plotly;
}

function clearAndDispose(id) {
  const container = document.getElementById(id);
  if (container && charts.has(id)) {
    getPlotly()?.purge(container);
    charts.delete(id);
  }
}

function safePct(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, num));
}

function renderEmptyChartState(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '<p class="status">' + message + "</p>";
  }
}

function renderTopPagesChart(topPages) {
  if (!Array.isArray(topPages) || topPages.length === 0) {
    renderEmptyChartState("topPagesChart", "Sin datos de top pages para este dataset.");
    return;
  }

  const id = "topPagesChart";
  const container = document.getElementById(id);
  if (!container || !getPlotly()) return;
  clearAndDispose(id);

  const items = topPages.slice(0, 7).reverse();
  const xData = items.map((item) => safePct(item.pctSessions));
  const yData = items.map((item) => item.page);

  const data = [{
    type: "bar",
    x: xData,
    y: yData,
    orientation: 'h',
    marker: {
      color: "#1659d3",
      line: {
        color: '#0e3a8c',
        width: 1
      }
    },
    hoverinfo: "x+y",
  }];

  const layout = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    margin: { l: 150, r: 20, t: 20, b: 40 },
    xaxis: {
      title: "Sesiones (%)",
      ticksuffix: "%",
      gridcolor: "#d7e3f6"
    },
    yaxis: {
      title: "",
      tickfont: { size: 10, color: "#35506f" },
      automargin: true
    },
  };

  getPlotly().newPlot(container, data, layout, { responsive: true, displayModeBar: false });
  charts.set(id, true);
}

function renderExitRateChart(exitRate) {
  if (!Array.isArray(exitRate) || exitRate.length === 0) {
    renderEmptyChartState("exitRateChart", "Sin datos de exit rate para este dataset.");
    return;
  }

  const id = "exitRateChart";
  const container = document.getElementById(id);
  if (!container || !getPlotly()) return;
  clearAndDispose(id);

  const items = exitRate.slice(0, 6);
  const xData = items.map((item) => item.page);
  const yData = items.map((item) => safePct(item.exitRatePct));

  const data = [{
    x: xData,
    y: yData,
    type: "scatter",
    mode: "lines+markers",
    marker: { size: 8, color: "#f97316" },
    line: { width: 3, color: "#f97316", shape: "spline" },
    fill: "tozeroy",
    fillcolor: "rgba(249, 115, 22, 0.16)",
    hoverinfo: "y+x"
  }];

  const layout = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    margin: { l: 50, r: 20, t: 20, b: 80 },
    xaxis: {
      tickangle: 25,
      tickfont: { size: 10, color: "#35506f" }
    },
    yaxis: {
      ticksuffix: "%",
      gridcolor: "#d7e3f6"
    }
  };

  getPlotly().newPlot(container, data, layout, { responsive: true, displayModeBar: false });
  charts.set(id, true);
}

function renderFunnelChart(funnelDrop) {
  if (!funnelDrop) {
    renderEmptyChartState("funnelChart", "Sin datos de embudo para este dataset.");
    return;
  }

  const id = "funnelChart";
  const container = document.getElementById(id);
  if (!container || !getPlotly()) return;
  clearAndDispose(id);

  const awareness = Number(funnelDrop.stageAwareness || 0);
  const evaluation = Number(funnelDrop.stageEvaluation || 0);
  const conversion = Number(funnelDrop.stageConversion || 0);

  const data = [{
    type: "funnel",
    y: ["Awareness", "Evaluation", "Conversion"],
    x: [awareness, evaluation, conversion],
    hoverinfo: "x+percent initial+percent previous",
    marker: {
      color: ["#3b82f6", "#f59e0b", "#10b981"]
    }
  }];

  const layout = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    margin: { l: 100, r: 20, t: 20, b: 20 }
  };

  getPlotly().newPlot(container, data, layout, { responsive: true, displayModeBar: false });
  charts.set(id, true);
}

export function renderMarketingCharts(data) {
  if (!getPlotly()) {
    renderEmptyChartState("topPagesChart", "No se pudo cargar la libreria Plotly.");
    renderEmptyChartState("exitRateChart", "No se pudo cargar la libreria Plotly.");
    renderEmptyChartState("funnelChart", "No se pudo cargar la libreria Plotly.");
    return;
  }

  renderTopPagesChart(data?.topPages ?? []);
  renderExitRateChart(data?.exitRate ?? []);
  renderFunnelChart(data?.insights?.funnelDrop ?? null);
}

export function resizeMarketingCharts() {
  if (getPlotly()) {
    charts.forEach((_, id) => {
      const container = document.getElementById(id);
      if (container) {
        getPlotly().Plots.resize(container);
      }
    });
  }
}

export function disposeMarketingCharts() {
  if (getPlotly()) {
    charts.forEach((_, id) => {
      const container = document.getElementById(id);
      if (container) {
        getPlotly().purge(container);
      }
    });
  }
  charts.clear();
}
