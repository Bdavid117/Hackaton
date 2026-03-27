export function renderInsights(data) {
  const root = document.getElementById("insights");
  const ghost = data?.insights?.ghostPages?.[0];
  const highIntent = data?.insights?.highIntent;
  const funnel = data?.insights?.funnelDrop;
  const interpretation = data?.marketingInterpretation;

  const strengths = (interpretation?.strengths ?? []).map((item) => "<li>" + item + "</li>").join("");
  const risks = (interpretation?.risks ?? []).map((item) => "<li>" + item + "</li>").join("");
  const opportunities = (interpretation?.opportunities ?? []).map((item) => "<li>" + item + "</li>").join("");
  const actions = (interpretation?.recommendedActions ?? [])
    .map((item) => "<li><strong>" + item.action + "</strong><br/>Impacto: " + item.expectedImpact + " | Horizonte: " + item.horizon.replace("_", " ") + "</li>")
    .join("");
  const segment = interpretation?.segmentInsights;

  root.innerHTML = "\n    <div class=\"interpretation\">\n      <div class=\"block\">\n        <h3>Resumen Ejecutivo de Marketing</h3>\n        <p><strong>Objetivo:</strong> " + (interpretation?.objective || "leads").replace("_", " ") + "</p>\n        <p>" + (interpretation?.executiveSummary ?? "Sin resumen disponible.") + "</p>\n      </div>\n      <div class=\"block\">\n        <h3>Fortalezas</h3>\n        <ul>" + (strengths || "<li>Sin fortalezas destacadas.</li>") + "</ul>\n      </div>\n      <div class=\"block\">\n        <h3>Riesgos</h3>\n        <ul>" + (risks || "<li>Sin riesgos criticos detectados.</li>") + "</ul>\n      </div>\n      <div class=\"block\">\n        <h3>Oportunidades</h3>\n        <ul>" + (opportunities || "<li>Sin oportunidades priorizadas.</li>") + "</ul>\n      </div>\n      <div class=\"block\">\n        <h3>Acciones Recomendadas</h3>\n        <ul>" + (actions || "<li>Sin acciones recomendadas.</li>") + "</ul>\n      </div>\n      <div class=\"block\">\n        <h3>Segmentacion Clave</h3>\n        <p><strong>Top dispositivo:</strong> " + (segment?.topDevice ? segment.topDevice.key + " (" + segment.topDevice.sessions + " sesiones)" : "-") + "</p>\n        <p><strong>Dispositivo critico:</strong> " + (segment?.criticalDevice ? segment.criticalDevice.key + " (" + segment.criticalDevice.quickExitPct + "% quick-exit)" : "-") + "</p>\n        <p><strong>Top canal:</strong> " + (segment?.topChannel ? segment.topChannel.key + " (" + segment.topChannel.sessions + " sesiones)" : "-") + "</p>\n        <p><strong>Canal critico:</strong> " + (segment?.criticalChannel ? segment.criticalChannel.key + " (" + segment.criticalChannel.quickExitPct + "% quick-exit)" : "-") + "</p>\n      </div>\n      <div class=\"block\">\n        <h3>Senales Rapidas</h3>\n        <p><strong>Pagina fantasma principal:</strong> " + (ghost ? ghost.page + " (" + ghost.lowEngagementPct + "%)" : "-") + "</p>\n        <p><strong>Sesiones de alta intencion:</strong> " + (highIntent ? highIntent.highIntentSessions + " (" + highIntent.highIntentPct + "%)" : "-") + "</p>\n        <p><strong>Caida Awareness -> Evaluation:</strong> " + (funnel ? funnel.dropAwarenessToEvaluationPct + "%" : "-") + "</p>\n        <p><strong>Caida Evaluation -> Conversion:</strong> " + (funnel ? funnel.dropEvaluationToConversionPct + "%" : "-") + "</p>\n      </div>\n    </div>\n  ";
}
