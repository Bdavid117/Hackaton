import Papa from "papaparse";

export type ClaritySession = {
  sessionId: string;
  timestamp: string;
  entryUrl: string;
  exitUrl: string;
  entryPath: string;
  exitPath: string;
  source: string;
  device: string;
  os: string;
  country: string;
  pagesCount: number;
  clicks: number;
  durationSec: number;
  clickPerPage: number;
  timePerPage: number;
  totalInteraction: number;
  frustrationFlag: number;
  quickExit: boolean;
};

type CsvRow = Record<string, string | number | boolean | null | undefined>;

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toLowerCase()
    .trim();
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const normalized = value.replace(/,/g, ".").trim();
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function parseBool(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value !== "string") return false;
  return ["1", "true", "si", "yes"].includes(value.toLowerCase().trim());
}

function safePath(url: string) {
  if (!url) return "(sin_url)";
  try {
    return new URL(url).pathname || "/";
  } catch {
    const withoutQuery = url.split("?")[0]?.split("#")[0]?.trim();
    return withoutQuery || "(sin_url)";
  }
}

function findValue(row: CsvRow, candidates: string[]) {
  const entries = Object.entries(row);
  for (const candidate of candidates) {
    const target = normalizeKey(candidate);
    const found = entries.find(([key]) => normalizeKey(key) === target);
    if (found) return found[1];
  }
  return undefined;
}

function buildTimestamp(row: CsvRow) {
  const iso = findValue(row, ["timestamp", "datetime", "fecha_hora"]);
  if (typeof iso === "string" && iso.trim()) return iso;

  const fecha = findValue(row, ["fecha", "date"]);
  const hora = findValue(row, ["hora", "time"]);

  if (typeof fecha === "string" && typeof hora === "string") {
    return `${fecha.trim()} ${hora.trim()}`;
  }

  if (typeof fecha === "string") return fecha.trim();
  return "";
}

export function loadClaritySessionsFromCsv(csvText: string) {
  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0];
    throw new Error(`Error parseando CSV: ${firstError.message}`);
  }

  const sessions: ClaritySession[] = parsed.data.map((row, index) => {
    const sessionIdRaw =
      findValue(row, ["session_id", "id_usuario_clarity", "user_id", "userid"]) ??
      `session-${index + 1}`;

    const entryUrl = String(
      findValue(row, ["direccion_url_entrada", "entry_url", "landing_page", "page", "url"]) ?? ""
    ).trim();

    const exitUrl = String(
      findValue(row, ["direccion_url_salida", "exit_url", "exit_page", "last_page"]) ?? entryUrl
    ).trim();

    const pagesCount = toNumber(findValue(row, ["recuento_paginas", "pages_count", "pages_per_session"]));
    const clicks = toNumber(findValue(row, ["clics_sesion", "clicks", "click_count"]));
    const durationSec = toNumber(
      findValue(row, ["duracion_sesion_segundos", "session_duration_seconds", "duration_seconds"])
    );

    return {
      sessionId: String(sessionIdRaw).trim() || `session-${index + 1}`,
      timestamp: buildTimestamp(row),
      entryUrl,
      exitUrl,
      entryPath: safePath(entryUrl),
      exitPath: safePath(exitUrl),
      source: String(findValue(row, ["referente", "referer", "referrer", "trafico_externo"]) ?? "").trim(),
      device: String(findValue(row, ["dispositivo", "device"]) ?? "").trim(),
      os: String(findValue(row, ["sistema_operativo", "os"]) ?? "").trim(),
      country: String(findValue(row, ["pais", "country"]) ?? "").trim(),
      pagesCount,
      clicks,
      durationSec,
      clickPerPage: toNumber(findValue(row, ["clicks_por_pagina", "clicks_per_page"])),
      timePerPage: toNumber(findValue(row, ["tiempo_por_pagina", "time_per_page"])),
      totalInteraction: toNumber(findValue(row, ["interaccion_total", "total_interaction"])),
      frustrationFlag: toNumber(findValue(row, ["posible_frustracion", "frustration"])),
      quickExit: parseBool(findValue(row, ["abandono_rapido", "quick_exit"])),
    };
  });

  return sessions.filter((row) => row.entryPath !== "(sin_url)");
}
