/**
 * Shared HTTP client for every fetcher.
 *
 * Upstreams here have hard, non-negotiable etiquette rules that are easy to get
 * wrong once and then get blocked for: SEC returns 403 without a declared
 * User-Agent carrying a contact address and asks for <=10 req/s, and Yahoo
 * returns 429 to a bare client. Centralising that here means a new fetcher
 * cannot forget it.
 */

export interface HostPolicy {
  /** Minimum gap between requests to this host, in ms. */
  minIntervalMs: number;
  /** User-Agent override for this host. */
  userAgent?: string;
}

const DEFAULT_UA =
  'ai-ecosystem-dashboard/0.1 (+https://github.com/jobdewilde95/ai-ecosystem)';

/**
 * SEC mandates a User-Agent carrying a real contact address, and its automated
 * gate returns 403 unless the string actually contains an email address — a
 * repo URL is not accepted. Read from the environment rather than committed so
 * a personal address never lands in git.
 */
function secUserAgent(): string {
  const configured = process.env.SEC_USER_AGENT?.trim();
  if (configured && /\S+@\S+\.\S+/.test(configured)) return configured;
  if (configured) {
    console.warn(
      'SEC_USER_AGENT must contain an email address or SEC returns 403; falling back.',
    );
  }
  return 'ai-ecosystem-dashboard/0.1 (contact@example.com)';
}

const POLICIES: Array<[RegExp, HostPolicy]> = [
  [/(^|\.)sec\.gov$/, { minIntervalMs: 120, get userAgent() { return secUserAgent(); } } as HostPolicy],
  [/(^|\.)yahoo\.com$/, { minIntervalMs: 900 }],
  [/(^|\.)epoch\.ai$/, { minIntervalMs: 500 }],
  [/(^|\.)openrouter\.ai$/, { minIntervalMs: 250 }],
  [/(^|\.)huggingface\.co$/, { minIntervalMs: 250 }],
  [/(^|\.)artificialanalysis\.ai$/, { minIntervalMs: 500 }],
];

function policyFor(url: string): HostPolicy {
  const host = new URL(url).hostname;
  for (const [pattern, policy] of POLICIES) {
    if (pattern.test(host)) return policy;
  }
  return { minIntervalMs: 200 };
}

/** Last request time per host, so throttling survives across fetchers. */
const lastRequestAt = new Map<string, number>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function throttle(url: string, policy: HostPolicy): Promise<void> {
  const host = new URL(url).hostname;
  const last = lastRequestAt.get(host) ?? 0;
  const wait = last + policy.minIntervalMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt.set(host, Date.now());
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    readonly body: string,
  ) {
    super(`HTTP ${status} for ${url}`);
    this.name = 'HttpError';
  }
}

export interface FetchOptions {
  headers?: Record<string, string>;
  /** Total attempts including the first. */
  retries?: number;
  timeoutMs?: number;
  /** Treat these statuses as fatal immediately, skipping retries. */
  noRetryStatuses?: number[];
}

/** Statuses where retrying is pointless: the answer will not change. */
const PERMANENT = new Set([400, 401, 403, 404, 405, 422]);

export async function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
  const { headers = {}, retries = 4, timeoutMs = 60_000 } = options;
  const noRetry = new Set([...PERMANENT, ...(options.noRetryStatuses ?? [])]);
  const policy = policyFor(url);

  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    await throttle(url, policy);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        headers: {
          'user-agent': policy.userAgent ?? DEFAULT_UA,
          accept: 'application/json, text/csv, text/plain, */*',
          ...headers,
        },
        signal: controller.signal,
      });

      if (response.ok) return await response.text();

      const body = (await response.text().catch(() => '')).slice(0, 500);
      const error = new HttpError(response.status, url, body);
      if (noRetry.has(response.status)) throw error;
      lastError = error;
    } catch (error) {
      if (error instanceof HttpError && noRetry.has(error.status)) throw error;
      lastError = error;
    } finally {
      clearTimeout(timer);
    }

    if (attempt < retries) {
      // 2s, 4s, 8s — long enough for a rate-limit window to reopen.
      await sleep(2 ** attempt * 1000);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`);
}

export async function fetchJson<T = unknown>(url: string, options?: FetchOptions): Promise<T> {
  const text = await fetchText(url, options);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 200)}`);
  }
}
