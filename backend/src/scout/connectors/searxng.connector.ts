import type { RawJob } from '../scout.config.js';
import { fetchJson, toRawJob } from './shared.js';

interface SearxResult {
  url?: string;
  title?: string;
  content?: string;
  engine?: string;
}
interface SearxResponse {
  results?: SearxResult[];
}

/**
 * Free long-tail search via a self-hosted SearXNG instance (replaces SerpApi).
 * Runs `site:` / keyword queries and treats each organic result as a candidate
 * job page. Requires SearXNG to be reachable with the JSON format enabled
 * (`search.formats: [html, json]` in settings.yml). No-ops gracefully when the
 * instance is down or JSON isn't enabled.
 *
 * Config (portals.yml options): { baseUrl?, queries: string[], location? }
 * baseUrl also reads SEARXNG_URL env (default http://localhost:8888).
 */
export async function fetchSearxngJobs(
  options: {
    baseUrl?: string;
    queries?: string[];
    location?: string;
  } = {},
): Promise<RawJob[]> {
  const baseUrl = (
    options.baseUrl ??
    process.env.SEARXNG_URL ??
    'http://localhost:8888'
  ).replace(/\/$/, '');

  const queries = options.queries ?? [];
  if (queries.length === 0) {
    console.warn('SearXNG: no queries configured — skipping');
    return [];
  }

  const jobs: RawJob[] = [];
  for (const query of queries) {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      categories: 'general',
      language: 'en',
    });
    const data = await fetchJson<SearxResponse>(
      `${baseUrl}/search?${params.toString()}`,
      { label: 'SearXNG', timeoutMs: 20_000 },
    );
    for (const r of data?.results ?? []) {
      if (!r.title || !r.url) continue;
      let company = 'Unknown';
      try {
        company = new URL(r.url).hostname.replace(/^www\.|^careers\.|^jobs\./, '');
      } catch {
        /* keep default */
      }
      jobs.push(
        toRawJob({
          title: r.title,
          company,
          url: r.url,
          description: r.content ?? '',
          location: options.location ?? 'India',
          source: 'searxng',
        }),
      );
    }
  }

  return jobs;
}
