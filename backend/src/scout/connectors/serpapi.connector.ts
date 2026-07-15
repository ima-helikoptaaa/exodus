import type { RawJob } from '../scout.config.js';
import { fetchJson, toRawJob } from './shared.js';

interface SerpOrganicResult {
  title?: string;
  link?: string;
  snippet?: string;
  source?: string;
}
interface SerpResponse {
  organic_results?: SerpOrganicResult[];
  error?: string;
}

/**
 * Long-tail coverage for companies that don't expose a Greenhouse/Lever/Ashby
 * board (Razorpay, CRED, Flipkart, FAANG India, quant shops, …). We run
 * programmatic `site:careers.x.com "software engineer"` style Google queries
 * through SerpApi and treat each result as a candidate job page.
 *
 * Requires SERPAPI_KEY. Each query costs one SerpApi search credit, so the
 * query list is intentionally curated (in portals.yml `sources`), not per-company.
 */
export async function fetchSerpApiJobs(
  options: {
    queries?: string[];
    location?: string;
    apiKey?: string;
  } = {},
): Promise<RawJob[]> {
  const apiKey = options.apiKey ?? process.env.SERPAPI_KEY;
  if (!apiKey) {
    console.warn('SerpApi: SERPAPI_KEY not set — skipping');
    return [];
  }

  const queries = options.queries ?? [];
  if (queries.length === 0) {
    console.warn('SerpApi: no queries configured — skipping');
    return [];
  }

  const jobs: RawJob[] = [];
  for (const query of queries) {
    const params = new URLSearchParams({
      engine: 'google',
      q: query,
      api_key: apiKey,
      num: '20',
      google_domain: 'google.co.in',
      gl: 'in',
    });
    if (options.location) params.set('location', options.location);

    const data = await fetchJson<SerpResponse>(
      `https://serpapi.com/search.json?${params.toString()}`,
      { label: 'SerpApi', timeoutMs: 25_000 },
    );
    if (data?.error) {
      console.warn(`SerpApi: ${data.error}`);
      continue;
    }

    for (const r of data?.organic_results ?? []) {
      if (!r.title || !r.link) continue;
      // Derive a company name from the result source/domain.
      const company =
        r.source ??
        (() => {
          try {
            return new URL(r.link).hostname.replace(
              /^www\.|^careers\.|^jobs\./,
              '',
            );
          } catch {
            return 'Unknown';
          }
        })();

      jobs.push(
        toRawJob({
          title: r.title,
          company,
          url: r.link,
          description: r.snippet ?? '',
          location: options.location ?? 'India',
          source: 'serpapi',
        }),
      );
    }
  }

  return jobs;
}
