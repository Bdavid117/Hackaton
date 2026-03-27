import type { ClaritySession } from "./loader";
import type { MarketingSegmentInsights, SegmentPerformance } from "./marketingInterpretation";

type GroupAccumulator = {
  sessions: number;
  quickExit: number;
  totalDuration: number;
};

function buildPerformance(groups: Map<string, GroupAccumulator>): SegmentPerformance[] {
  return [...groups.entries()]
    .map(([key, value]) => ({
      key,
      sessions: value.sessions,
      quickExitPct: Number(((value.quickExit / Math.max(value.sessions, 1)) * 100).toFixed(2)),
      avgDurationSec: Number((value.totalDuration / Math.max(value.sessions, 1)).toFixed(2)),
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

function aggregateBy(
  sessions: ClaritySession[],
  keySelector: (session: ClaritySession) => string
): SegmentPerformance[] {
  const groups = new Map<string, GroupAccumulator>();

  for (const session of sessions) {
    const key = keySelector(session) || "(sin_dato)";
    const current = groups.get(key) ?? { sessions: 0, quickExit: 0, totalDuration: 0 };
    current.sessions += 1;
    current.totalDuration += session.durationSec;
    if (session.quickExit || (session.pagesCount <= 1 && session.durationSec < 20)) {
      current.quickExit += 1;
    }
    groups.set(key, current);
  }

  return buildPerformance(groups);
}

export function getMarketingSegmentInsights(sessions: ClaritySession[]): MarketingSegmentInsights {
  const byDevice = aggregateBy(sessions, (session) => session.device.trim() || "(sin_dispositivo)");
  const byChannel = aggregateBy(sessions, (session) => session.source.trim() || "direct/unknown");

  const topDevice = byDevice[0] ?? null;
  const topChannel = byChannel[0] ?? null;

  const criticalDevice = [...byDevice].sort((a, b) => b.quickExitPct - a.quickExitPct)[0] ?? null;
  const criticalChannel = [...byChannel].sort((a, b) => b.quickExitPct - a.quickExitPct)[0] ?? null;

  return {
    topDevice,
    criticalDevice,
    topChannel,
    criticalChannel,
  };
}