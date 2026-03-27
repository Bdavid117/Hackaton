type EnvConfig = {
  geminiApiKey: string;
  maxUploadBytes: number;
  chatRateLimitMax: number;
  chatRateLimitWindowMs: number;
  geminiTimeoutMs: number;
  geminiMaxRetries: number;
};

function parsePositiveInt(rawValue: string | undefined, fallback: number): number {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

let cachedConfig: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (cachedConfig) return cachedConfig;

  const geminiApiKey = String(import.meta.env.GEMINI_API_KEY ?? "").trim();
  if (!geminiApiKey) {
    throw new Error("Falta la variable GEMINI_API_KEY en el entorno del servidor.");
  }

  cachedConfig = {
    geminiApiKey,
    maxUploadBytes: parsePositiveInt(import.meta.env.MAX_UPLOAD_BYTES, 10 * 1024 * 1024),
    chatRateLimitMax: parsePositiveInt(import.meta.env.CHAT_RATE_LIMIT_MAX, 20),
    chatRateLimitWindowMs: parsePositiveInt(import.meta.env.CHAT_RATE_LIMIT_WINDOW_MS, 60 * 1000),
    geminiTimeoutMs: parsePositiveInt(import.meta.env.GEMINI_TIMEOUT_MS, 20_000),
    geminiMaxRetries: parsePositiveInt(import.meta.env.GEMINI_MAX_RETRIES, 2),
  };

  return cachedConfig;
}