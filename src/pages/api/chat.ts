import type { APIRoute } from "astro";
import { answerWithGemini } from "../../lib/ai/gemini";
import { getEnvConfig } from "../../lib/config/env";
import { errorJson, okJson } from "../../lib/http/response";
import { applyRateLimit, getRequestIdentity } from "../../lib/security/rateLimit";
import { getSessions } from "../../lib/store/sessionStore";

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

    const { sessions } = getSessions();
    if (sessions.length === 0) {
      return errorJson("Primero carga un CSV para usar el copilot.", 400, "DATASET_REQUIRED");
    }

    const result = await answerWithGemini(message, sessions);

    return okJson(result, 200);
  } catch (error) {
    console.error("[api/chat]", error);
    return errorJson("No se pudo procesar la consulta en este momento.", 500, "CHAT_INTERNAL_ERROR");
  }
};
