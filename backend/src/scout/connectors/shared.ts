import type { RawJob } from '../scout.config.js';

const HTML_ENTITIES: Array<[RegExp, string]> = [
  [/&amp;/g, '&'],
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
  [/&nbsp;/g, ' '],
  [/&#39;/g, "'"],
  [/&#x27;/g, "'"],
  [/&quot;/g, '"'],
  [/&mdash;/g, '—'],
  [/&ndash;/g, '–'],
];

/** Strip HTML tags + decode the common entities, collapse whitespace. */
export function stripHtml(input: string): string {
  let out = input.replace(/<[^>]*>/g, ' ');
  for (const [re, rep] of HTML_ENTITIES) out = out.replace(re, rep);
  return out.replace(/\s+/g, ' ').trim();
}

/** GET/POST JSON with a timeout, returning null on any non-OK / network error. */
export async function fetchJson<T>(
  url: string,
  opts: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
    label?: string;
  } = {},
): Promise<T | null> {
  const { method = 'GET', headers, body, timeoutMs = 15_000, label } = opts;
  try {
    const res = await fetch(url, {
      method,
      headers: { Accept: 'application/json', ...headers },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.warn(`${label ?? url}: HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`${label ?? url}: ${(err as Error).message}`);
    return null;
  }
}

/** GET raw text (RSS/HTML feeds) with a timeout. */
export async function fetchText(
  url: string,
  opts: {
    headers?: Record<string, string>;
    timeoutMs?: number;
    label?: string;
  } = {},
): Promise<string | null> {
  const { headers, timeoutMs = 15_000, label } = opts;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'exodus-scout/1.0', ...headers },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.warn(`${label ?? url}: HTTP ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.warn(`${label ?? url}: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Aggregator feeds return everything; keep only titles that look like
 * engineering roles so we don't hand the LLM thousands of irrelevant rows.
 * Keep this LOOSE — the real filtering happens in the service.
 */
const ENGINEERING_HINT =
  /\b(engineer|developer|sde|swe|programmer|architect|infra|infrastructure|backend|frontend|full[\s-]?stack|platform|devops|sre|reliability|data|machine learning|ml|ai|software)\b/i;

export function looksLikeEngineeringRole(title: string): boolean {
  return ENGINEERING_HINT.test(title);
}

/** Best-effort parse of a date-ish value into a Date (or undefined). */
export function parseDate(value: unknown): Date | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    // seconds vs milliseconds heuristic
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? undefined : d;
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

/** Normalize a partial job into a full RawJob with safe defaults. */
export function toRawJob(
  partial: Partial<RawJob> & Pick<RawJob, 'title' | 'source'>,
): RawJob {
  return {
    title: partial.title,
    company: partial.company ?? 'Unknown',
    url: partial.url ?? '',
    description: (partial.description ?? '').slice(0, 10_000),
    location: partial.location ?? '',
    postedAt: partial.postedAt,
    source: partial.source,
    salary: partial.salary,
    remote: partial.remote,
  };
}

/**
 * Run promise-returning tasks with a concurrency cap, preserving input order
 * in the results. Used for batched LLM scoring and parallel JD enrichment.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(Math.max(limit, 1), items.length) },
    async () => {
      while (cursor < items.length) {
        const idx = cursor++;
        results[idx] = await fn(items[idx], idx);
      }
    },
  );
  await Promise.all(workers);
  return results;
}
