import type { ClaritySession } from "./loader";
import { getTopPages } from "./metrics";

export function getGhostPagesInsight(sessions: ClaritySession[]) {
  const top = getTopPages(sessions, 5);
  const result = top.map((page) => {
    const rows = sessions.filter((s) => s.entryPath === page.page);
    const lowEngagement = rows.filter((r) => r.clicks <= 1 || r.durationSec < 20).length;
    const lowEngagementPct = Number(((lowEngagement / Math.max(rows.length, 1)) * 100).toFixed(2));
    return {
      page: page.page,
      sessions: page.uniqueSessions,
      lowEngagementPct,
    };
  });

  return result.sort((a, b) => b.lowEngagementPct - a.lowEngagementPct).slice(0, 3);
}

export function getHighIntentSessionsInsight(sessions: ClaritySession[]) {
  const keyword = ["pricing", "demo", "contact", "checkout", "request-demo"];
  const highIntent = sessions.filter((s) => {
    const combined = `${s.entryPath} ${s.exitPath}`.toLowerCase();
    const conversionPath = keyword.some((k) => combined.includes(k));
    const behaviorIntent = s.pagesCount >= 3 && s.durationSec >= 90 && s.clicks >= 2;
    return conversionPath || behaviorIntent;
  });

  return {
    highIntentSessions: highIntent.length,
    highIntentPct: Number(((highIntent.length / Math.max(sessions.length, 1)) * 100).toFixed(2)),
  };
}

export function getFunnelDropInsight(sessions: ClaritySession[]) {
  const stage1 = sessions.length;
  const stage2 = sessions.filter((s) => /pricing|cursos|aws|azure|producto/i.test(s.entryPath + s.exitPath)).length;
  const stage3 = sessions.filter((s) => /demo|contact|request-demo|checkout/i.test(s.entryPath + s.exitPath)).length;

  const drop12 = Number((((stage1 - stage2) / Math.max(stage1, 1)) * 100).toFixed(2));
  const drop23 = Number((((stage2 - stage3) / Math.max(stage2, 1)) * 100).toFixed(2));

  return {
    stageAwareness: stage1,
    stageEvaluation: stage2,
    stageConversion: stage3,
    dropAwarenessToEvaluationPct: drop12,
    dropEvaluationToConversionPct: drop23,
  };
}
