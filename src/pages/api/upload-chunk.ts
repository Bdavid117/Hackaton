import type { APIRoute } from "astro";
import { loadClaritySessionsFromCsv } from "../../lib/data/loader";
import { errorJson, okJson } from "../../lib/http/response";
import { setSessions } from "../../lib/store/sessionStore";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export const POST: APIRoute = async ({ request }) => {
  try {
    const form = await request.formData();
    const uploadId = form.get("uploadId") as string;
    const chunkIndex = parseInt(form.get("chunkIndex") as string, 10);
    const totalChunks = parseInt(form.get("totalChunks") as string, 10);
    const fileName = form.get("fileName") as string;
    const fileChunk = form.get("chunk");

    if (!uploadId || isNaN(chunkIndex) || isNaN(totalChunks) || !(fileChunk instanceof File)) {
      return errorJson("Chunk data incompleta o invalida", 400, "INVALID_CHUNK");
    }

    const tmpFilePath = path.join(os.tmpdir(), `upload_${uploadId}.csv`);
    
    const arrayBuffer = await fileChunk.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (chunkIndex === 0) {
      fs.writeFileSync(tmpFilePath, buffer);
    } else {
      fs.appendFileSync(tmpFilePath, buffer);
    }

    if (chunkIndex === totalChunks - 1) {
      // It's the final chunk, read the file and process it
      const fullCsv = fs.readFileSync(tmpFilePath, "utf-8");
      
      try { fs.unlinkSync(tmpFilePath); } catch (e) { console.error(e); }
      
      const sessions = loadClaritySessionsFromCsv(fullCsv);
      if (sessions.length === 0) {
        return errorJson("No se pudieron leer filas validas del CSV.", 400, "CSV_EMPTY_OR_INVALID");
      }
      
      const saved = await setSessions(sessions, fileName);
      
      return okJson({
        completed: true,
        fileName: fileName,
        datasetId: saved.datasetId,
        sessions: sessions.length,
      }, 200);
    }

    // If more chunks pending
    return okJson({ completed: false, chunkIndex, totalChunks }, 200);
  } catch (error) {
    console.error("[api/upload-chunk]", error);
    return errorJson("No se pudo procesar el chunk.", 500, "UPLOAD_CHUNK_ERROR");
  }
};