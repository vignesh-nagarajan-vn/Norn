// In-memory TTL cache for external fetches. This lives for the lifetime of a
// warm serverless instance, so repeated lookups of the same variant within a
// session are cheap. It is intentionally simple: no eviction beyond TTL and no
// persistence. Cold starts begin with an empty cache, which is fine.

interface Entry<T> {
  value: T;
  expires: number;
}

const store = new Map<string, Entry<unknown>>();
const MAX_ENTRIES = 500;

export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) {
    return hit.value as T;
  }
  const value = await fn();
  if (store.size >= MAX_ENTRIES) {
    // Drop the oldest inserted key to keep memory bounded.
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, expires: now + ttlMs });
  return value;
}

export function clearCache(): void {
  store.clear();
}
