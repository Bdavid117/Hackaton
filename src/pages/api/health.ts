import type { APIRoute } from "astro";
import { GoogleGenAI } from "@google/genai";
import { getEnvConfig } from "../../lib/config/env";
import { okJson } from "../../lib/http/response";

function validateGeminiKeyFormat(value: string): boolean {
  return /^AIza[0-9A-Za-z_-]{20,}$/.test(value);
}

type ProbeResult = {
  status:
    | "ready"
    | "provider_auth_error"
    | "provider_timeout"
    | "provider_quota_exceeded"
    | "provider_unreachable";
  message: string;
  checkedAt: string;
};

let cachedProbe: ProbeResult | null = null;
let cachedProbeExpiresAt = 0;
let cachedProbeApiKey = "";

async function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), timeoutMs);
    }),
  ]);
}

async function probeGemini(apiKey: string, timeoutMs: number): Promise<ProbeResult> {
  const checkedAt = new Date().toISOString();

  try {
    const ai = new GoogleGenAI({ apiKey });
    await runWithTimeout(
      ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: "Responde exactamente: ok",
      }),
      timeoutMs
    );

    return {
      status: "ready",
      message: "Gemini respondio correctamente.",
      checkedAt,
    };
  } catch (error) {
    const raw = error instanceof Error ? error.message : "error desconocido";
    const normalized = raw.toLowerCase();

    if (normalized.includes("401") || normalized.includes("403") || normalized.includes("permission")) {
      return {
        status: "provider_auth_error",
        message: "Gemini rechazo autenticacion o permisos de la API Key.",
        checkedAt,
      };
    }

    if (normalized.includes("429") || normalized.includes("quota") || normalized.includes("rate")) {
      return {
        status: "provider_quota_exceeded",
        message: "Gemini excedio la cuota o el rate limit de la cuenta.",
        checkedAt,
      };
    }

    if (normalized.includes("timeout")) {
      return {
        status: "provider_timeout",
        message: "Gemini no respondio dentro del tiempo esperado.",
        checkedAt,
      };
    }

    return {
      status: "provider_unreachable",
      message: "No fue posible contactar a Gemini en este momento.",
      checkedAt,
    };
  }
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const deep = url.searchParams.get("deep") === "1";

  const env = getEnvConfig();
  const configured = Boolean(env.geminiApiKey);
  const keyFormatValid = configured ? validateGeminiKeyFormat(env.geminiApiKey) : false;
  const maxUploadMB = Number((env.maxUploadBytes / (1024 * 1024)).toFixed(2));

  let probe: ProbeResult | null = null;

  if (configured && keyFormatValid) {
    const now = Date.now();
    const apiKeyChanged = cachedProbeApiKey !== env.geminiApiKey;
    const shouldRefresh = deep || apiKeyChanged || !cachedProbe || now >= cachedProbeExpiresAt;
    if (shouldRefresh) {
      cachedProbe = await probeGemini(env.geminiApiKey, Math.min(env.geminiTimeoutMs, 8_000));
      cachedProbeExpiresAt = now + 45_000;
      cachedProbeApiKey = env.geminiApiKey;
    }
    probe = cachedProbe;
  }

  const status = !configured
    ? "missing_key"
    : !keyFormatValid
      ? "invalid_key_format"
      : (probe?.status ?? "provider_unreachable");

  return okJson({
    app: "marketing-copilot",
    serverTime: new Date().toISOString(),
    limits: {
      maxUploadBytes: env.maxUploadBytes,
      maxUploadMB,
    },
    gemini: {
      configured,
      keyFormatValid,
      status,
      ready: status === "ready",
      probeMessage: probe?.message ?? null,
      probeCheckedAt: probe?.checkedAt ?? null,
    },
  });
};
