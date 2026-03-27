type Kpis = {
  totalSessions: number;
  avgDurationSec: number;
  quickExitPct: number;
};

type ConversionIntent = {
  totalSessions: number;
  intentSessions: number;
  intentPct: number;
};

type TopPage = {
  page: string;
  uniqueSessions: number;
  pctSessions: number;
};

type ExitRow = {
  page: string;
  exits: number;
  enters: number;
  exitRatePct: number;
};

type FunnelDrop = {
  stageAwareness: number;
  stageEvaluation: number;
  stageConversion: number;
  dropAwarenessToEvaluationPct: number;
  dropEvaluationToConversionPct: number;
};

type HighIntent = {
  highIntentSessions: number;
  highIntentPct: number;
};

export type MarketingObjective = "leads" | "retencion" | "engagement";

export type SegmentPerformance = {
  key: string;
  sessions: number;
  quickExitPct: number;
  avgDurationSec: number;
};

export type MarketingSegmentInsights = {
  topDevice: SegmentPerformance | null;
  criticalDevice: SegmentPerformance | null;
  topChannel: SegmentPerformance | null;
  criticalChannel: SegmentPerformance | null;
};

export type MarketingInterpretation = {
  objective: MarketingObjective;
  executiveSummary: string;
  strengths: string[];
  risks: string[];
  opportunities: string[];
  recommendedActions: Array<{
    action: string;
    expectedImpact: "alto" | "medio" | "bajo";
    horizon: "inmediato" | "corto_plazo" | "mediano_plazo";
  }>;
  segmentInsights: MarketingSegmentInsights;
};

function clampList(items: string[], max = 4): string[] {
  return items.filter(Boolean).slice(0, max);
}

export function buildMarketingInterpretation(input: {
  sourceName: string;
  objective: MarketingObjective;
  kpis: Kpis;
  conversionIntent: ConversionIntent;
  topPages: TopPage[];
  exitRate: ExitRow[];
  segmentInsights: MarketingSegmentInsights;
  insights: {
    highIntent: HighIntent;
    funnelDrop: FunnelDrop;
  };
}): MarketingInterpretation {
  const { sourceName, objective, kpis, conversionIntent, topPages, exitRate, insights, segmentInsights } = input;
  const strengths: string[] = [];
  const risks: string[] = [];
  const opportunities: string[] = [];
  const recommendedActions: MarketingInterpretation["recommendedActions"] = [];

  const primaryPage = topPages[0];
  const highestExit = exitRate[0];

  if (kpis.quickExitPct <= 35) {
    strengths.push(`Abandono rapido controlado (${kpis.quickExitPct}%), lo que sugiere mejor alineacion entre expectativa y contenido.`);
  } else {
    risks.push(`Abandono rapido elevado (${kpis.quickExitPct}%), indicando friccion en primeras interacciones.`);
    recommendedActions.push({
      action: "Optimizar propuesta de valor above-the-fold y claridad de CTA en landing principal.",
      expectedImpact: "alto",
      horizon: "inmediato",
    });
  }

  if (conversionIntent.intentPct >= 20 || insights.highIntent.highIntentPct >= 20) {
    strengths.push(
      `Base de usuarios con intencion comercial relevante (intent ${conversionIntent.intentPct}% / high-intent ${insights.highIntent.highIntentPct}%).`
    );
  } else {
    opportunities.push(
      `Intencion de conversion moderada-baja (${conversionIntent.intentPct}%). Hay espacio para mejorar mensajes de oferta y prueba.`
    );
    recommendedActions.push({
      action: "Crear bloques de prueba social y casos de uso por segmento (K12, Higher Ed, corporativo).",
      expectedImpact: "medio",
      horizon: "corto_plazo",
    });
  }

  if (insights.funnelDrop.dropAwarenessToEvaluationPct > 70) {
    risks.push(
      `Caida alta en etapa Awareness -> Evaluation (${insights.funnelDrop.dropAwarenessToEvaluationPct}%).`
    );
    recommendedActions.push({
      action: "Agregar CTA intermedios hacia contenidos de evaluacion (pricing, demo, comparativos) en paginas de entrada.",
      expectedImpact: "alto",
      horizon: "inmediato",
    });
  }

  if (insights.funnelDrop.dropEvaluationToConversionPct > 55) {
    risks.push(
      `Fuga relevante en Evaluation -> Conversion (${insights.funnelDrop.dropEvaluationToConversionPct}%).`
    );
    recommendedActions.push({
      action: "Reducir friccion del formulario de contacto/demo y reforzar CTA de cierre en paginas de evaluacion.",
      expectedImpact: "alto",
      horizon: "corto_plazo",
    });
  }

  if (primaryPage && primaryPage.pctSessions >= 25) {
    opportunities.push(
      `Alta concentracion de trafico en ${primaryPage.page} (${primaryPage.pctSessions}%). Conviene usarla como hub de conversion.`
    );
    recommendedActions.push({
      action: `Implementar experimento A/B de CTA primario en ${primaryPage.page} para aumentar paso a paginas de evaluacion.`,
      expectedImpact: "medio",
      horizon: "corto_plazo",
    });
  }

  if (highestExit && highestExit.exitRatePct >= 60) {
    risks.push(
      `La pagina ${highestExit.page} muestra salida alta (${highestExit.exitRatePct}%), probable punto de quiebre del journey.`
    );
    recommendedActions.push({
      action: `Auditar UX y copy de ${highestExit.page} para reducir abandono y aumentar siguiente paso de funnel.`,
      expectedImpact: "alto",
      horizon: "inmediato",
    });
  }

  if (kpis.avgDurationSec >= 90) {
    strengths.push(`Tiempo medio saludable (${kpis.avgDurationSec}s), indicando consumo activo de contenido.`);
  } else {
    opportunities.push(`Tiempo medio bajo (${kpis.avgDurationSec}s); se recomienda mejorar gancho inicial y jerarquia de contenido.`);
  }

  if (recommendedActions.length === 0) {
    recommendedActions.push({
      action: "Mantener monitoreo semanal de funnel y ejecutar un experimento de conversion incremental por sprint.",
      expectedImpact: "medio",
      horizon: "mediano_plazo",
    });
  }

  if (segmentInsights.topDevice) {
    strengths.push(
      `Dispositivo con mejor rendimiento: ${segmentInsights.topDevice.key} (quick-exit ${segmentInsights.topDevice.quickExitPct}%, duracion ${segmentInsights.topDevice.avgDurationSec}s).`
    );
  }

  if (segmentInsights.criticalDevice) {
    risks.push(
      `Dispositivo con mayor friccion: ${segmentInsights.criticalDevice.key} (quick-exit ${segmentInsights.criticalDevice.quickExitPct}%).`
    );
  }

  if (segmentInsights.topChannel) {
    opportunities.push(
      `Canal con mayor calidad de trafico: ${segmentInsights.topChannel.key}. Conviene ampliar inversion en este origen.`
    );
  }

  if (segmentInsights.criticalChannel) {
    risks.push(
      `Canal con mayor salida temprana: ${segmentInsights.criticalChannel.key}. Requiere ajuste de mensaje o segmentacion.`
    );
  }

  if (objective === "leads") {
    recommendedActions.unshift({
      action: "Priorizar CTA de demo/contacto en las 3 paginas de mayor trafico y medir CVR por canal.",
      expectedImpact: "alto",
      horizon: "inmediato",
    });
  }

  if (objective === "retencion") {
    recommendedActions.unshift({
      action: "Reducir abandono inicial con mejoras de onboarding y contenido de valor en primera visita.",
      expectedImpact: "alto",
      horizon: "inmediato",
    });
  }

  if (objective === "engagement") {
    recommendedActions.unshift({
      action: "Incrementar profundidad de navegacion con modulos recomendados y enlaces contextuales internos.",
      expectedImpact: "medio",
      horizon: "corto_plazo",
    });
  }

  const objectiveLabel =
    objective === "leads"
      ? "generacion de leads"
      : objective === "retencion"
        ? "retencion"
        : "engagement";

  const executiveSummary = [
    `Dataset analizado: ${sourceName || "dataset_actual"}.`,
    `Objetivo estrategico activo: ${objectiveLabel}.`,
    `Sesiones: ${kpis.totalSessions}, intencion de conversion: ${conversionIntent.intentPct}%, abandono rapido: ${kpis.quickExitPct}%.`,
    `Principal palanca: mejorar transicion de etapas del funnel y reforzar CTAs en paginas con mayor trafico/salida.`,
  ].join(" ");

  return {
    objective,
    executiveSummary,
    strengths: clampList(strengths),
    risks: clampList(risks),
    opportunities: clampList(opportunities),
    recommendedActions: recommendedActions.slice(0, 5),
    segmentInsights,
  };
}