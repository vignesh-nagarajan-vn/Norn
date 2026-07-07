// Small fetch wrapper with timeout, bounded retries, and clear errors.
// Every external call in Norn goes through this so a slow or flaky source
// degrades gracefully instead of hanging the whole request.

export class SourceError extends Error {
  constructor(
    public source: string,
    message: string,
  ) {
    super(message);
    this.name = "SourceError";
  }
}

interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  source: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  opts: FetchOptions,
): Promise<Response> {
  const { timeoutMs = 9000, retries = 2, source, ...init } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      // Retry on transient server errors and rate limiting.
      if (res.status >= 500 || res.status === 429) {
        lastError = new SourceError(source, `${source} returned ${res.status}`);
        if (attempt < retries) {
          await sleep(300 * (attempt + 1));
          continue;
        }
        throw lastError;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      const aborted = err instanceof Error && err.name === "AbortError";
      if (attempt < retries) {
        await sleep(300 * (attempt + 1));
        continue;
      }
      throw new SourceError(
        source,
        aborted
          ? `${source} timed out after ${timeoutMs}ms`
          : `${source} request failed: ${(err as Error).message}`,
      );
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new SourceError(source, `${source} request failed`);
}

export async function fetchJson<T = unknown>(
  url: string,
  opts: FetchOptions,
): Promise<T> {
  const res = await fetchWithRetry(url, opts);
  if (!res.ok) {
    throw new SourceError(opts.source, `${opts.source} returned ${res.status}`);
  }
  try {
    return (await res.json()) as T;
  } catch (err) {
    throw new SourceError(
      opts.source,
      `${opts.source} returned invalid JSON: ${(err as Error).message}`,
    );
  }
}
