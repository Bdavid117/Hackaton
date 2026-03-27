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
import {
  buildMarketingInterpretation,
  type MarketingObjective,
} from "../../lib/data/marketingInterpretation";
import { getMarketingSegmentInsights } from "../../lib/data/segments";

function parseMarketingObjective(rawValue: string | null): MarketingObjective {
  if (rawValue === "retencion" || rawValue === "engagement") return rawValue;
  return "leads";
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const objective = parseMarketingObjective(url.searchParams.get("objective"));
    const { datasetId, sessions, sourceName, updatedAt } = await getSessions();

    if (sessions.length === 0) {
      return errorJson("Primero carga un CSV para calcular metricas.", 400, "DATASET_REQUIRED");
    }

    const kpis = getKpiSummary(sessions);
    const topPages = getTopPages(sessions);
    const exitRate = getExitRate(sessions);
    const avgInteraction = getAvgInteraction(sessions);
    const conversionIntent = getConversionIntent(sessions);
    const commonFlows = getCommonFlows(sessions);
    const segmentInsights = getMarketingSegmentInsights(sessions);
    const insights = {
      ghostPages: getGhostPagesInsight(sessions),
      highIntent: getHighIntentSessionsInsight(sessions),
      funnelDrop: getFunnelDropInsight(sessions),
    };

    return okJson(
      {
        sourceName,
        datasetId,
        updatedAt,
        kpis,
        topPages,
        exitRate,
        avgInteraction,
        conversionIntent,
        commonFlows,
        insights,
        marketingInterpretation: buildMarketingInterpretation({
          sourceName,
          objective,
          kpis,
          conversionIntent,
          topPages,
          exitRate,
          segmentInsights,
          insights: {
            highIntent: insights.highIntent,
            funnelDrop: insights.funnelDrop,
          },
        }),
      },
      200
    );
  } catch (error) {
    console.error("[api/metrics]", error);
    return errorJson("No se pudieron calcular las metricas.", 500, "METRICS_INTERNAL_ERROR");
  }
};
