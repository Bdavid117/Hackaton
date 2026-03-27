type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

const buckets = new Map<string, Bucket>();

export function applyRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: Math.max(config.maxRequests - 1, 0),
      retryAfterSec: Math.ceil(config.windowMs / 1000),
    };
  }

  if (current.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
    };
  }

  current.count += 1;

  return {
    allowed: true,
    remaining: Math.max(config.maxRequests - current.count, 0),
    retryAfterSec: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
  };
}

export function getRequestIdentity(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwardedFor.split(",")[0]?.trim() || "unknown-ip";
  const ua = (request.headers.get("user-agent") ?? "unknown-ua").slice(0, 120);
  return `${ip}|${ua}`;
}