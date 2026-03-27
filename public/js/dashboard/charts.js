const charts = new Map();

function getEcharts() {
  return window.echarts;
}

function clearAndDispose(id) {
  const instance = charts.get(id);
  if (instance) {
    instance.dispose();
    charts.delete(id);
  }
}

function initChart(id) {
  const element = document.getElementById(id);
  const echarts = getEcharts();
  if (!element || !echarts) return null;
  clearAndDispose(id);
  const instance = echarts.init(element);
  charts.set(id, instance);
  return instance;
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

  const chart = initChart("topPagesChart");
  if (!chart) return;

  const items = topPages.slice(0, 7).reverse();
  chart.setOption({
    backgroundColor: "transparent",
    grid: { left: 120, right: 20, top: 16, bottom: 18 },
    xAxis: {
      type: "value",
      axisLabel: { formatter: "{value}%" },
      splitLine: { lineStyle: { color: "#d7e3f6" } },
    },
    yAxis: {
      type: "category",
      data: items.map((item) => item.page),
      axisLabel: { color: "#35506f", fontSize: 11 },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value) => Number(value).toFixed(2) + "%",
    },
    series: [
      {
        type: "bar",
        data: items.map((item) => safePct(item.pctSessions)),
        barWidth: 18,
        itemStyle: {
          color: "#1659d3",
          borderRadius: [0, 8, 8, 0],
        },
        label: {
          show: true,
          position: "right",
          formatter: ({ value }) => Number(value).toFixed(1) + "%",
          color: "#223d59",
        },
      },
    ],
  });
}

function renderExitRateChart(exitRate) {
  if (!Array.isArray(exitRate) || exitRate.length === 0) {
    renderEmptyChartState("exitRateChart", "Sin datos de exit rate para este dataset.");
    return;
  }

  const chart = initChart("exitRateChart");
  if (!chart) return;

  const items = exitRate.slice(0, 6);
  chart.setOption({
    backgroundColor: "transparent",
    legend: {
      top: 0,
      textStyle: { color: "#35506f" },
      data: ["Exit Rate"],
    },
    grid: { left: 32, right: 16, top: 34, bottom: 26 },
    xAxis: {
      type: "category",
      data: items.map((item) => item.page),
      axisLabel: { rotate: 22, color: "#35506f", fontSize: 11 },
      axisLine: { lineStyle: { color: "#c5d6ee" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { formatter: "{value}%" },
      splitLine: { lineStyle: { color: "#d7e3f6" } },
    },
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => Number(value).toFixed(2) + "%",
    },
    series: [
      {
        name: "Exit Rate",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        lineStyle: { width: 3, color: "#f97316" },
        itemStyle: { color: "#f97316" },
        areaStyle: { color: "rgba(249, 115, 22, 0.16)" },
        data: items.map((item) => safePct(item.exitRatePct)),
      },
    ],
  });
}

function renderFunnelChart(funnelDrop) {
  if (!funnelDrop) {
    renderEmptyChartState("funnelChart", "Sin datos de embudo para este dataset.");
    return;
  }

  const chart = initChart("funnelChart");
  if (!chart) return;

  const awareness = Number(funnelDrop.stageAwareness || 0);
  const evaluation = Number(funnelDrop.stageEvaluation || 0);
  const conversion = Number(funnelDrop.stageConversion || 0);

  chart.setOption({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      formatter: (params) => params.name + ": " + Number(params.value).toLocaleString("es-CO"),
    },
    legend: {
      top: 0,
      textStyle: { color: "#35506f" },
    },
    series: [
      {
        name: "Embudo",
        type: "funnel",
        left: "10%",
        top: 28,
        bottom: 8,
        width: "80%",
        min: 0,
        max: Math.max(awareness, evaluation, conversion, 1),
        minSize: "30%",
        maxSize: "100%",
        sort: "descending",
        gap: 6,
        label: {
          show: true,
          formatter: ({ name, value }) => name + "\n" + Number(value).toLocaleString("es-CO"),
          color: "#0f2a44",
          fontWeight: 600,
        },
        itemStyle: {
          borderColor: "#ffffff",
          borderWidth: 2,
        },
        data: [
          { value: awareness, name: "Awareness" },
          { value: evaluation, name: "Evaluation" },
          { value: conversion, name: "Conversion" },
        ],
      },
    ],
  });
}

export function renderMarketingCharts(data) {
  if (!getEcharts()) {
    renderEmptyChartState("topPagesChart", "No se pudo cargar la libreria de graficas.");
    renderEmptyChartState("exitRateChart", "No se pudo cargar la libreria de graficas.");
    renderEmptyChartState("funnelChart", "No se pudo cargar la libreria de graficas.");
    return;
  }

  renderTopPagesChart(data?.topPages ?? []);
  renderExitRateChart(data?.exitRate ?? []);
  renderFunnelChart(data?.insights?.funnelDrop ?? null);
}

export function resizeMarketingCharts() {
  charts.forEach((instance) => {
    instance.resize();
  });
}

export function disposeMarketingCharts() {
  charts.forEach((instance) => instance.dispose());
  charts.clear();
}