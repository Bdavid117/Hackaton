import type { ClaritySession } from "./loader";

export function getCommonFlows(sessions: ClaritySession[], limit = 10) {
  const pairCount = new Map<string, number>();

  for (const session of sessions) {
    const key = `${session.entryPath}=>${session.exitPath}`;
    pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
  }

  return [...pairCount.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split("=>");
      return { from, to, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
