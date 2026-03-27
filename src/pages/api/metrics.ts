import type { APIRoute } from "astro";
import { getSessions } from "../../lib/store/sessionStore";
import { errorJson, okJson } from "../../lib/http/response";
import {
  getAvgInteraction,
  getConversionIntent,
  getExitRate,
  getKpiSummary,
  getTopPages,
} from "../../lib/data/metrics";
import { getCommonFlows } from "../../lib/data/navigator";
import {
  getFunnelDropInsight,
  getGhostPagesInsight,
  getHighIntentSessionsInsight,
} from "../../lib/data/insights";

export const GET: APIRoute = async () => {
  try {
    const { sessions, sourceName, updatedAt } = getSessions();

    if (sessions.length === 0) {
      return errorJson("Primero carga un CSV para calcular metricas.", 400, "DATASET_REQUIRED");
    }

    return okJson(
      {
        sourceName,
        updatedAt,
        kpis: getKpiSummary(sessions),
        topPages: getTopPages(sessions),
        exitRate: getExitRate(sessions),
        avgInteraction: getAvgInteraction(sessions),
        conversionIntent: getConversionIntent(sessions),
        commonFlows: getCommonFlows(sessions),
        insights: {
          ghostPages: getGhostPagesInsight(sessions),
          highIntent: getHighIntentSessionsInsight(sessions),
          funnelDrop: getFunnelDropInsight(sessions),
        },
      },
      200
    );
  } catch (error) {
    console.error("[api/metrics]", error);
    return errorJson("No se pudieron calcular las metricas.", 500, "METRICS_INTERNAL_ERROR");
  }
};
