import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

export type AuditAction =
  | "upload_dataset"
  | "activate_dataset"
  | "delete_dataset"
  | "cleanup_datasets"
  | "chat_query";

type AuditEvent = {
  at: string;
  action: AuditAction;
  actor: string;
  payload: Record<string, unknown>;
};

type AuditQuery = {
  limit?: number;
  action?: AuditAction;
  actorContains?: string;
};

const AUDIT_FILE_PATH = path.join(process.cwd(), "data", "runtime", "audit", "events.jsonl");

export async function logAuditEvent(
  action: AuditAction,
  actor: string,
  payload: Record<string, unknown>
): Promise<void> {
  const event: AuditEvent = {
    at: new Date().toISOString(),
    action,
    actor,
    payload,
  };

  try {
    await mkdir(path.dirname(AUDIT_FILE_PATH), { recursive: true });
    await appendFile(AUDIT_FILE_PATH, `${JSON.stringify(event)}\n`, "utf-8");
  } catch {
    // El log de auditoria nunca debe romper el flujo de negocio.
  }
}

export async function getRecentAuditEvents(limit = 50): Promise<AuditEvent[]> {
  try {
    const raw = await readFile(AUDIT_FILE_PATH, "utf-8");
    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    return lines
      .slice(-Math.max(limit, 1))
      .map((line) => JSON.parse(line) as AuditEvent)
      .reverse();
  } catch {
    return [];
  }
}

export async function queryAuditEvents(query: AuditQuery): Promise<AuditEvent[]> {
  const limit = Math.max(query.limit ?? 50, 1);
  const actorFilter = (query.actorContains ?? "").trim().toLowerCase();

  const events = await getRecentAuditEvents(Math.min(limit * 4, 400));

  const filtered = events.filter((event) => {
    const byAction = query.action ? event.action === query.action : true;
    const byActor = actorFilter ? event.actor.toLowerCase().includes(actorFilter) : true;
    return byAction && byActor;
  });

  return filtered.slice(0, limit);
}