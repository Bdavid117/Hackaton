import type { ClaritySession } from "../data/loader";
import { getAvgInteraction, getConversionIntent, getExitRate, getTopPages } from "../data/metrics";
import { getCommonFlows } from "../data/navigator";
import {
  getFunnelDropInsight,
  getGhostPagesInsight,
  getHighIntentSessionsInsight,
} from "../data/insights";

export type ToolResult = {
  toolName: string;
  payload: unknown;
};

export function selectToolByQuestion(question: string): string {
  const q = question.toLowerCase();

  if (q.includes("aband") || q.includes("exit") || q.includes("salida")) return "get_exit_rate";
  if (q.includes("flujo") || q.includes("recorrido") || q.includes("embudo")) return "get_common_flows";
  if (q.includes("convers") || q.includes("demo") || q.includes("contact")) return "get_conversion_intent";
  if (q.includes("interaccion") || q.includes("engagement") || q.includes("click")) {
    return "get_avg_interaction";
  }
  if (q.includes("fantasma") || q.includes("retienen")) return "get_ghost_pages";
  if (q.includes("alta intencion") || q.includes("high intent")) return "get_high_intent_sessions";
  return "get_top_pages";
}

export function runTool(toolName: string, sessions: ClaritySession[]): ToolResult {
  switch (toolName) {
    case "get_top_pages":
      return { toolName, payload: getTopPages(sessions) };
    case "get_exit_rate":
      return { toolName, payload: getExitRate(sessions) };
    case "get_common_flows":
      return { toolName, payload: getCommonFlows(sessions) };
    case "get_conversion_intent":
      return { toolName, payload: getConversionIntent(sessions) };
    case "get_avg_interaction":
      return { toolName, payload: getAvgInteraction(sessions) };
    case "get_ghost_pages":
      return { toolName, payload: getGhostPagesInsight(sessions) };
    case "get_high_intent_sessions":
      return { toolName, payload: getHighIntentSessionsInsight(sessions) };
    case "get_funnel_drop":
      return { toolName, payload: getFunnelDropInsight(sessions) };
    default:
      return { toolName: "get_top_pages", payload: getTopPages(sessions) };
  }
}
