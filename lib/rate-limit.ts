/**
 * In-memory fixed-window rate limiting.
 *
 * Three layers keep the (deliberately vulnerable) app from being used to run
 * up a Bedrock bill:
 *   - per-user:   MAX_REQUESTS per WINDOW_MS for each authenticated user
 *   - global:     GLOBAL_MAX_REQUESTS per WINDOW_MS across *all* users, so
 *                 mass sign-ups can't multiply the per-user budget
 *   - per-IP:     used for unauthenticated endpoints such as sign-up
 *
 * State lives on globalThis so every route bundle in the same Node process
 * shares one store. For multi-instance deployments, move this to Redis /
 * API Gateway usage plans and set an AWS Budget alarm.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const GLOBAL_MAX_REQUESTS = Number(process.env.GLOBAL_RATE_LIMIT_PER_MINUTE ?? "120");

type Entry = {
  count: number;
  expiresAt: number;
};

const store: Map<string, Entry> = ((globalThis as Record<string, unknown>).__astralRateLimit ??=
  new Map<string, Entry>()) as Map<string, Entry>;

function hit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.expiresAt < now) {
    store.set(key, { count: 1, expiresAt: now + windowMs });
    return false;
  }

  if (existing.count >= limit) {
    return true;
  }

  existing.count += 1;
  return false;
}

/** Per-user limit plus an app-wide ceiling. Returns true when the call should be rejected. */
export function isRateLimited(key: string) {
  if (hit(`user:${key}`, MAX_REQUESTS, WINDOW_MS)) return true;
  return hit("global", GLOBAL_MAX_REQUESTS, WINDOW_MS);
}

/** Generic limiter for unauthenticated endpoints (e.g. sign-up by client IP). */
export function isKeyRateLimited(key: string, limit: number, windowMs: number) {
  return hit(key, limit, windowMs);
}

/** Best-effort client IP behind Cloudflare Tunnel / a reverse proxy. */
export function clientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}
