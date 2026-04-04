const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

type Entry = {
  count: number;
  expiresAt: number;
};

const requests = new Map<string, Entry>();

export function isRateLimited(key: string) {
  const now = Date.now();
  const existing = requests.get(key);

  if (!existing || existing.expiresAt < now) {
    requests.set(key, { count: 1, expiresAt: now + WINDOW_MS });
    return false;
  }

  if (existing.count >= MAX_REQUESTS) {
    return true;
  }

  existing.count += 1;
  requests.set(key, existing);
  return false;
}
