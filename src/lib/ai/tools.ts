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

export type MultiToolResult = {
  primaryTool: string;
  toolNames: string[];
  payloadByTool: Record<string, unknown>;
};

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function includesAny(question: string, terms: string[]): boolean {
  return terms.some((term) => question.includes(term));
}

export function selectToolsByQuestion(question: string): string[] {
  const q = question.toLowerCase();

  const asksForGlobalAnalysis = includesAny(q, [
    "resumen",
    "analiza",
    "analisis",
    "diagnostico",
    "prioriza",
    "oportunidad",
    "estrategia",
    "marketing",
    "rendimiento general",
    "que debo hacer",
  ]);

  if (asksForGlobalAnalysis) {
    return [
      "get_conversion_intent",
      "get_funnel_drop",
      "get_exit_rate",
      "get_top_pages",
      "get_high_intent_sessions",
    ];
  }

  const selected: string[] = [];

  if (includesAny(q, ["aband", "exit", "salida", "rebote"])) selected.push("get_exit_rate");
  if (includesAny(q, ["flujo", "recorrido", "embudo", "funnel"])) {
    selected.push("get_common_flows", "get_funnel_drop");
  }
  if (includesAny(q, ["convers", "demo", "contact", "lead"])) selected.push("get_conversion_intent");
  if (includesAny(q, ["interaccion", "engagement", "click"])) selected.push("get_avg_interaction");
  if (includesAny(q, ["fantasma", "retienen", "ghost"])) selected.push("get_ghost_pages");
  if (includesAny(q, ["alta intencion", "high intent"])) selected.push("get_high_intent_sessions");

  return unique(selected.length > 0 ? selected : ["get_top_pages"]);
}

export function selectToolByQuestion(question: string): string {
  return selectToolsByQuestion(question)[0] ?? "get_top_pages";
}

export function runTools(toolNames: string[], sessions: ClaritySession[]): MultiToolResult {
  const normalized = unique(toolNames.length > 0 ? toolNames : ["get_top_pages"]);
  const payloadByTool: Record<string, unknown> = {};
  for (const toolName of normalized) {
    payloadByTool[toolName] = runTool(toolName, sessions).payload;
  }

  return {
    primaryTool: normalized[0],
    toolNames: normalized,
    payloadByTool,
  };
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
