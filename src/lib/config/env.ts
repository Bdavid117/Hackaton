import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

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

function readDotEnvMap(): Map<string, string> {
  const envPath = path.join(process.cwd(), ".env");
  const map = new Map<string, string>();
  if (!existsSync(envPath)) return map;

  const raw = readFileSync(envPath, "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    map.set(key, value);
  }
  return map;
}

function getRawEnvValue(dotEnv: Map<string, string>, key: string): string {
  const runtimeValue = process.env[key];
  if (typeof runtimeValue === "string" && runtimeValue.trim()) return runtimeValue.trim();

  const dotEnvValue = dotEnv.get(key);
  if (typeof dotEnvValue === "string" && dotEnvValue.trim()) return dotEnvValue.trim();

  const viteValue = import.meta.env[key];
  if (typeof viteValue === "string" && viteValue.trim()) return viteValue.trim();

  return "";
}

export function getEnvConfig(): EnvConfig {
  const dotEnv = readDotEnvMap();

  return {
    geminiApiKey: getRawEnvValue(dotEnv, "GEMINI_API_KEY"),
    maxUploadBytes: parsePositiveInt(getRawEnvValue(dotEnv, "MAX_UPLOAD_BYTES"), 10 * 1024 * 1024),
    chatRateLimitMax: parsePositiveInt(getRawEnvValue(dotEnv, "CHAT_RATE_LIMIT_MAX"), 20),
    chatRateLimitWindowMs: parsePositiveInt(getRawEnvValue(dotEnv, "CHAT_RATE_LIMIT_WINDOW_MS"), 60 * 1000),
    geminiTimeoutMs: parsePositiveInt(getRawEnvValue(dotEnv, "GEMINI_TIMEOUT_MS"), 20_000),
    geminiMaxRetries: parsePositiveInt(getRawEnvValue(dotEnv, "GEMINI_MAX_RETRIES"), 2),
  };
}