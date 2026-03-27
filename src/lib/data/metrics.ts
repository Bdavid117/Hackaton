import type { ClaritySession } from "./loader";

export function getTopPages(sessions: ClaritySession[], limit = 8) {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    counts.set(session.entryPath, (counts.get(session.entryPath) ?? 0) + 1);
  }

  const total = sessions.length || 1;
  return [...counts.entries()]
    .map(([page, uniqueSessions]) => ({
      page,
      uniqueSessions,
      pctSessions: Number(((uniqueSessions / total) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.uniqueSessions - a.uniqueSessions)
    .slice(0, limit);
}

export function getExitRate(sessions: ClaritySession[], limit = 8) {
  const exits = new Map<string, number>();
  const entries = new Map<string, number>();

  for (const session of sessions) {
    exits.set(session.exitPath, (exits.get(session.exitPath) ?? 0) + 1);
    entries.set(session.entryPath, (entries.get(session.entryPath) ?? 0) + 1);
  }

  return [...exits.entries()]
    .map(([page, exitsCount]) => {
      const enters = entries.get(page) ?? sessions.length;
      const exitRatePct = Number(((exitsCount / Math.max(enters, 1)) * 100).toFixed(2));
      return { page, exits: exitsCount, enters, exitRatePct };
    })
    .sort((a, b) => b.exitRatePct - a.exitRatePct)
    .slice(0, limit);
}

export function getAvgInteraction(sessions: ClaritySession[]) {
  const total = sessions.length || 1;
  const sumClicks = sessions.reduce((acc, s) => acc + s.clicks, 0);
  const sumPages = sessions.reduce((acc, s) => acc + s.pagesCount, 0);
  const sumDuration = sessions.reduce((acc, s) => acc + s.durationSec, 0);
  const avgClicks = Number((sumClicks / total).toFixed(2));
  const avgPages = Number((sumPages / total).toFixed(2));
  const avgDurationSec = Number((sumDuration / total).toFixed(2));

  return {
    avgClicks,
    avgPages,
    avgDurationSec,
    avgDurationMin: Number((avgDurationSec / 60).toFixed(2)),
  };
}

export function getConversionIntent(sessions: ClaritySession[]) {
  const intentKeywords = ["pricing", "contact", "demo", "request-demo", "checkout", "buy"];
  const hasIntent = (value: string) => {
    const v = value.toLowerCase();
    return intentKeywords.some((k) => v.includes(k));
  };

  const intentSessions = sessions.filter((s) => hasIntent(s.entryPath) || hasIntent(s.exitPath));

  return {
    totalSessions: sessions.length,
    intentSessions: intentSessions.length,
    intentPct: Number(((intentSessions.length / Math.max(sessions.length, 1)) * 100).toFixed(2)),
  };
}

export function getKpiSummary(sessions: ClaritySession[]) {
  const total = sessions.length;
  const avgDurationSec = Number(
    (sessions.reduce((acc, s) => acc + s.durationSec, 0) / Math.max(total, 1)).toFixed(2)
  );

  const quickExit = sessions.filter((s) => s.quickExit || (s.pagesCount <= 1 && s.durationSec < 20)).length;

  return {
    totalSessions: total,
    avgDurationSec,
    quickExitPct: Number(((quickExit / Math.max(total, 1)) * 100).toFixed(2)),
  };
}
