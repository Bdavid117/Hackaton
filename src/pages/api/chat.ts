import type { APIRoute } from "astro";
import { answerWithGemini, GeminiIntegrationError } from "../../lib/ai/gemini";
import { getEnvConfig } from "../../lib/config/env";
import { errorJson, okJson } from "../../lib/http/response";
import { logAuditEvent } from "../../lib/observability/audit";
import { applyRateLimit, getRequestIdentity } from "../../lib/security/rateLimit";
import { getSessions } from "../../lib/store/sessionStore";

function mapGeminiError(error: GeminiIntegrationError): { status: number; code: string; message: string } {
  switch (error.code) {
    case "INVALID_QUESTION":
      return { status: 400, code: "INVALID_MESSAGE", message: "La pregunta no tiene texto util para analizar." };
    case "GEMINI_CONFIG":
      return { status: 503, code: "GEMINI_NOT_CONFIGURED", message: "Gemini no esta configurado en el servidor." };
    case "GEMINI_TIMEOUT":
      return {
        status: 504,
        code: "GEMINI_TIMEOUT",
        message: "Gemini tardo demasiado en responder. Intenta con una pregunta mas puntual.",
      };
    case "GEMINI_AUTH":
      return {
        status: 502,
        code: "GEMINI_AUTH",
        message: "Gemini rechazo la API Key. Verifica permisos y validez de la clave.",
      };
    case "GEMINI_QUOTA":
      return {
        status: 429,
        code: "GEMINI_QUOTA",
        message: "Se alcanzo el limite de cuota de Gemini. Reintenta en unos minutos.",
      };
    default:
      return {
        status: 503,
        code: "GEMINI_UNAVAILABLE",
        message: "Gemini no esta disponible temporalmente. Reintenta en breve.",
      };
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const env = getEnvConfig();
    const identity = getRequestIdentity(request);
    const rateLimit = applyRateLimit(identity, {
      maxRequests: env.chatRateLimitMax,
      windowMs: env.chatRateLimitWindowMs,
    });

    if (!rateLimit.allowed) {
      return errorJson(
        `Has alcanzado el limite de consultas. Intenta de nuevo en ${rateLimit.retryAfterSec}s.`,
        429,
        "RATE_LIMIT"
      );
    }

    const body = await request.json();
    const message = String(body?.message ?? "").trim();

    if (!message) {
      return errorJson("La pregunta no puede estar vacia.", 400, "INVALID_MESSAGE");
    }

    const { datasetId, sourceName, sessions } = await getSessions();
    if (sessions.length === 0) {
      return errorJson("Primero carga un CSV para usar el copilot.", 400, "DATASET_REQUIRED");
    }

    const result = await answerWithGemini(message, sessions, {
      datasetId,
      sourceName,
    });

    await logAuditEvent("chat_query", identity, {
      datasetId,
      sourceName,
      tool: result.tool,
      questionLength: message.length,
    });

    return okJson(
      {
        ...result,
        datasetId,
        sourceName,
      },
      200
    );
  } catch (error) {
    if (error instanceof GeminiIntegrationError) {
      const mapped = mapGeminiError(error);
      return errorJson(mapped.message, mapped.status, mapped.code);
    }

    console.error("[api/chat]", error);
    return errorJson("No se pudo procesar la consulta en este momento.", 500, "CHAT_INTERNAL_ERROR");
  }
};
