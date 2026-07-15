import type { RawJob } from '../scout.config.js';
import {
  fetchJson,
  looksLikeEngineeringRole,
  parseDate,
  stripHtml,
  toRawJob,
} from './shared.js';

interface HnHit {
  objectID: string;
  title: string;
}
interface HnSearchResponse {
  hits: HnHit[];
}
interface HnComment {
  id: number;
  author?: string;
  text?: string;
  created_at?: string;
  children?: HnComment[];
}

const REMOTE_RE = /\bremote\b|worldwide|anywhere/i;
const INDIA_RE =
  /\bindia\b|bangalor|bengalur|mumbai|delhi|gurgaon|gurugram|hyderabad|pune|chennai|noida/i;

/**
 * Extract a URL from a comment body if present (companies usually paste
 * an apply link). Falls back to the HN comment permalink.
 */
function extractUrl(html: string, commentId: number): string {
  const m = html.match(/href="([^"]+)"/i);
  if (m) return m[1];
  const bare = html.match(/https?:\/\/[^\s"'<)]+/i);
  if (bare) return bare[0];
  return `https://news.ycombinator.com/item?id=${commentId}`;
}

/**
 * HN "Ask HN: Who is hiring?" — the single highest-signal free source.
 * We find the most recent monthly thread (posted by the whoishiring bot),
 * pull top-level comments, and parse the "Company | Location | Role | …"
 * convention. Only India / remote-worldwide posts are emitted.
 */
export async function fetchHnHiringJobs(
  options: { indiaOrRemoteOnly?: boolean } = {},
): Promise<RawJob[]> {
  const indiaOrRemoteOnly = options.indiaOrRemoteOnly ?? true;

  const search = await fetchJson<HnSearchResponse>(
    'https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&query=hiring&hitsPerPage=5',
    { label: 'HN/search' },
  );
  const thread = search?.hits?.find((h) => /who is hiring/i.test(h.title));
  if (!thread) {
    console.warn('HN: no "Who is hiring" thread found');
    return [];
  }

  const item = await fetchJson<HnComment>(
    `https://hn.algolia.com/api/v1/items/${thread.objectID}`,
    { label: 'HN/thread', timeoutMs: 30_000 },
  );
  const comments = item?.children ?? [];

  const jobs: RawJob[] = [];
  for (const c of comments) {
    if (!c.text) continue;
    const text = stripHtml(c.text);
    // First "line" before the body — company/location/role are pipe-delimited.
    const header = text.split(/\.|<p>|\n/)[0];
    const parts = header.split('|').map((p) => p.trim());
    if (parts.length < 2) continue;

    const company = parts[0];
    const locationField = parts.slice(1).join(' | ');
    const isRemote = REMOTE_RE.test(text);
    const isIndia = INDIA_RE.test(text);

    if (indiaOrRemoteOnly && !isRemote && !isIndia) continue;

    // Role: pick the pipe segment that reads like an engineering title,
    // else fall back to the whole header.
    const roleSegment =
      parts.find((p) => looksLikeEngineeringRole(p)) ?? header;
    if (!looksLikeEngineeringRole(text)) continue;

    jobs.push(
      toRawJob({
        title: roleSegment.slice(0, 200),
        company,
        url: extractUrl(c.text, c.id),
        description: text,
        location: isIndia ? locationField : isRemote ? 'Remote' : locationField,
        postedAt: parseDate(c.created_at),
        remote: isRemote,
        source: 'hn_hiring',
      }),
    );
  }

  return jobs;
}
