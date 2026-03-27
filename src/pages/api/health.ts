import type { APIRoute } from "astro";
import { getEnvConfig } from "../../lib/config/env";
import { okJson } from "../../lib/http/response";

function validateAIKeyFormat(value: string): boolean {
  return value.includes("sk-"); // Validacion basica para Anthropic, OpenAI, etc.
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

async function probeAI(apiKey: string, timeoutMs: number): Promise<ProbeResult> {
  const checkedAt = new Date().toISOString();

  try {
    const contr = new AbortController();
    const res = await runWithTimeout(
      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          messages: [{ role: "user", content: "ok" }],
          max_tokens: 1
        }),
        signal: contr.signal
      }),
      timeoutMs
    );

    if (res.ok) {
      return {
        status: "ready",
        message: "IA respondio correctamente.",
        checkedAt,
      };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        status: "provider_auth_error",
        message: "IA rechazo autenticacion o permisos de la API Key.",
        checkedAt,
      };
    }

    if (res.status === 402 || res.status === 429) {
      return {
        status: "provider_quota_exceeded",
        message: "IA excedio la cuota o el rate limit de la cuenta.",
        checkedAt,
      };
    }

    const t = await res.text();
    if (res.status === 400 && t.includes("credit balance is too low")) {
      return {
        status: "provider_quota_exceeded",
        message: "IA excedio la cuota o saldo de creditos es muy bajo.",
        checkedAt,
      };
    }

    return {
      status: "provider_unreachable",
      message: `No fue posible contactar a IA en este momento. HTTP ${res.status}`,
      checkedAt,
    };

  } catch (error) {
    const raw = error instanceof Error ? error.message : "error desconocido";
    const normalized = raw.toLowerCase();

    if (normalized.includes("timeout")) {
      return {
        status: "provider_timeout",
        message: "Motor de IA no respondio dentro del tiempo esperado.",
        checkedAt,
      };
    }

    return {
      status: "provider_unreachable",
      message: "No fue posible contactar a IA en este momento.",
      checkedAt,
    };
  }
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const deep = url.searchParams.get("deep") === "1";

  const env = getEnvConfig();
  const configured = Boolean(env.aiApiKey);
  const keyFormatValid = configured ? validateAIKeyFormat(env.aiApiKey) : false;
  const maxUploadMB = Number((env.maxUploadBytes / (1024 * 1024)).toFixed(2));

  let probe: ProbeResult | null = null;

  if (configured && keyFormatValid) {
    const now = Date.now();
    const apiKeyChanged = cachedProbeApiKey !== env.aiApiKey;
    const shouldRefresh = deep || apiKeyChanged || !cachedProbe || now >= cachedProbeExpiresAt;
    if (shouldRefresh) {
      cachedProbe = await probeAI(env.aiApiKey, Math.min(env.aiTimeoutMs, 8_000));
      cachedProbeExpiresAt = now + 45_000;
      cachedProbeApiKey = env.aiApiKey;
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
    ai: {
      configured,
      keyFormatValid,
      status,
      ready: status === "ready",
      probeMessage: probe?.message ?? null,
      probeCheckedAt: probe?.checkedAt ?? null,
    },
  });
};
