import type { APIRoute } from "astro";
import { getEnvConfig } from "../../lib/config/env";
import { loadClaritySessionsFromCsv } from "../../lib/data/loader";
import { errorJson, okJson } from "../../lib/http/response";
import { logAuditEvent } from "../../lib/observability/audit";
import { getRequestIdentity } from "../../lib/security/rateLimit";
import { setSessions } from "../../lib/store/sessionStore";

export const POST: APIRoute = async ({ request }) => {
  try {
    const env = getEnvConfig();
    const actor = getRequestIdentity(request);
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return errorJson("Debes adjuntar un archivo CSV.", 400, "FILE_REQUIRED");
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return errorJson("El archivo debe tener extension .csv.", 400, "INVALID_FILE_TYPE");
    }

    if (file.size > env.maxUploadBytes) {
      const maxMB = Number((env.maxUploadBytes / (1024 * 1024)).toFixed(2));
      const fileMB = Number((file.size / (1024 * 1024)).toFixed(2));
      return errorJson(
        `El archivo pesa ${fileMB}MB y excede el limite permitido de ${maxMB}MB.`,
        413,
        "FILE_TOO_LARGE"
      );
    }

    const text = await file.text();
    const sessions = loadClaritySessionsFromCsv(text);

    if (sessions.length === 0) {
      return errorJson("No se pudieron leer filas validas del CSV.", 400, "CSV_EMPTY_OR_INVALID");
    }

    const saved = await setSessions(sessions, file.name);

    await logAuditEvent("upload_dataset", actor, {
      datasetId: saved.datasetId,
      sourceName: file.name,
      sessions: sessions.length,
      fileSize: file.size,
    });

    return okJson(
      {
        fileName: file.name,
        datasetId: saved.datasetId,
        sessions: sessions.length,
      },
      200
    );
  } catch (error) {
    console.error("[api/upload]", error);
    return errorJson("No se pudo procesar el CSV.", 500, "UPLOAD_INTERNAL_ERROR");
  }
};
