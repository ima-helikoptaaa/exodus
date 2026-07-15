import type { RawJob } from '../scout.config.js';
import {
  fetchJson,
  fetchText,
  looksLikeEngineeringRole,
  parseDate,
  stripHtml,
  toRawJob,
} from './shared.js';

// ── RemoteOK ────────────────────────────────────────────────────────────────
interface RemoteOkJob {
  slug?: string;
  id?: string;
  epoch?: number;
  company?: string;
  position?: string;
  tags?: string[];
  description?: string;
  location?: string;
  url?: string;
  apply_url?: string;
  salary_min?: number;
  salary_max?: number;
}

export async function fetchRemoteOkJobs(): Promise<RawJob[]> {
  const data = await fetchJson<RemoteOkJob[]>('https://remoteok.com/api', {
    headers: { 'User-Agent': 'exodus-scout/1.0' },
    label: 'RemoteOK',
  });
  if (!Array.isArray(data)) return [];

  // First element is a legal/notice object with no `position`.
  return data
    .filter((j) => j.position && looksLikeEngineeringRole(j.position))
    .map((j) => {
      const salary =
        j.salary_min && j.salary_max
          ? `$${j.salary_min}–$${j.salary_max}`
          : undefined;
      return toRawJob({
        title: j.position!,
        company: j.company ?? 'Unknown',
        url: j.url ?? j.apply_url ?? '',
        description: stripHtml(j.description ?? ''),
        location: j.location || 'Remote',
        postedAt: parseDate(j.epoch),
        remote: true,
        salary,
        source: 'remoteok',
      });
    });
}

// ── Remotive ──────────────────────────────────────────────────────────────
interface RemotiveJob {
  url?: string;
  title?: string;
  company_name?: string;
  candidate_required_location?: string;
  publication_date?: string;
  salary?: string;
  description?: string;
}
interface RemotiveResponse {
  jobs?: RemotiveJob[];
}

export async function fetchRemotiveJobs(
  options: { search?: string; searches?: string[] } = {},
): Promise<RawJob[]> {
  // Accept a single `search` or a list; each is one API call (max 100 each).
  const searches = options.searches ?? [options.search ?? 'software'];
  const jobs: RawJob[] = [];

  for (const search of searches) {
    const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(
      search,
    )}&limit=100`;
    const data = await fetchJson<RemotiveResponse>(url, { label: 'Remotive' });
    for (const j of data?.jobs ?? []) {
      if (!j.title || !looksLikeEngineeringRole(j.title)) continue;
      jobs.push(
        toRawJob({
          title: j.title,
          company: j.company_name ?? 'Unknown',
          url: j.url ?? '',
          description: stripHtml(j.description ?? ''),
          location: j.candidate_required_location || 'Remote',
          postedAt: parseDate(j.publication_date),
          remote: true,
          salary: j.salary || undefined,
          source: 'remotive',
        }),
      );
    }
  }

  return jobs;
}

// ── We Work Remotely (RSS) ──────────────────────────────────────────────────
const WWR_DEFAULT_FEEDS = [
  'https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss',
  'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss',
  'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss',
];

function tag(block: string, name: string): string {
  const m = block.match(
    new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'),
  );
  if (!m) return '';
  // Handle CDATA wrappers.
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

export async function fetchWeWorkRemotelyJobs(
  options: { feeds?: string[] } = {},
): Promise<RawJob[]> {
  const feeds = options.feeds ?? WWR_DEFAULT_FEEDS;
  const jobs: RawJob[] = [];

  for (const feed of feeds) {
    const xml = await fetchText(feed, {
      headers: { 'User-Agent': 'exodus-scout/1.0' },
      label: 'WeWorkRemotely',
    });
    if (!xml) continue;

    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    for (const block of items) {
      const rawTitle = tag(block, 'title'); // "Company: Role"
      if (!rawTitle) continue;
      const [company, ...roleParts] = rawTitle.split(':');
      const role = roleParts.join(':').trim() || rawTitle;
      if (!looksLikeEngineeringRole(role)) continue;

      const region = tag(block, 'region') || 'Remote';
      jobs.push(
        toRawJob({
          title: role,
          company: company.trim(),
          url: tag(block, 'link'),
          description: stripHtml(tag(block, 'description')),
          location: region,
          postedAt: parseDate(tag(block, 'pubDate')),
          remote: true,
          source: 'weworkremotely',
        }),
      );
    }
  }

  return jobs;
}

// ── YC Work at a Startup ────────────────────────────────────────────────────
interface WaasHit {
  title?: string;
  company_name?: string;
  locations?: string[];
  url?: string;
  description?: string;
  remote?: boolean;
}

/**
 * YC "Work at a Startup" exposes an Algolia-backed public search.
 * The public index/key are shipped in their front-end bundle; if YC rotates
 * them this connector degrades gracefully to an empty list.
 */
export async function fetchWorkAtAStartupJobs(
  options: {
    appId?: string;
    apiKey?: string;
    index?: string;
    query?: string;
  } = {},
): Promise<RawJob[]> {
  const appId = options.appId ?? process.env.WAAS_ALGOLIA_APP_ID;
  const apiKey = options.apiKey ?? process.env.WAAS_ALGOLIA_API_KEY;
  const index = options.index ?? 'WaaSPublicJob_production';
  if (!appId || !apiKey) {
    console.warn(
      'WorkAtAStartup: WAAS_ALGOLIA_APP_ID/API_KEY not set — skipping',
    );
    return [];
  }

  const url = `https://${appId.toLowerCase()}-dsn.algolia.net/1/indexes/${index}/query`;
  const data = await fetchJson<{ hits?: WaasHit[] }>(url, {
    method: 'POST',
    headers: {
      'X-Algolia-Application-Id': appId,
      'X-Algolia-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: options.query ?? 'engineer',
      hitsPerPage: 100,
    }),
    label: 'WorkAtAStartup',
  });
  const hits = data?.hits ?? [];

  return hits
    .filter((h) => h.title && looksLikeEngineeringRole(h.title))
    .map((h) =>
      toRawJob({
        title: h.title!,
        company: h.company_name ?? 'Unknown',
        url: h.url ?? '',
        description: stripHtml(h.description ?? ''),
        location: h.locations?.join(', ') || (h.remote ? 'Remote' : ''),
        remote: h.remote,
        source: 'workatastartup',
      }),
    );
}
