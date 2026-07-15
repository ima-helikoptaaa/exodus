import type { RawJob } from '../scout.config.js';
import { fetchJson, parseDate, stripHtml, toRawJob } from './shared.js';

interface RedditListing<T> {
  data?: { children?: Array<{ data?: T }> };
}
interface RedditPost {
  id: string;
  title: string;
  permalink: string;
  created_utc: number;
  selftext?: string;
  num_comments?: number;
}
interface RedditComment {
  id: string;
  body?: string;
  permalink?: string;
  created_utc?: number;
}

const ENG_RE =
  /\b(engineer|developer|sde|swe|backend|frontend|full[\s-]?stack|devops|sre|platform|data|ml|ai|software)\b/i;
const REMOTE_RE = /\bremote\b|wfh|work from home|anywhere/i;

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * If Reddit app creds are present we use OAuth (higher rate limit); otherwise
 * we fall back to the public .json endpoints. Token cached in-process.
 */
async function getToken(nowMs: number): Promise<string | null> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (cachedToken && cachedToken.expiresAt > nowMs) return cachedToken.token;

  try {
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'exodus-scout/1.0',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) return null;
    cachedToken = {
      token: data.access_token,
      expiresAt: nowMs + (data.expires_in ?? 3600) * 1000 - 60_000,
    };
    return cachedToken.token;
  } catch {
    return null;
  }
}

function baseUrl(token: string | null): string {
  return token ? 'https://oauth.reddit.com' : 'https://www.reddit.com';
}
function authHeaders(token: string | null): Record<string, string> {
  return token
    ? { Authorization: `Bearer ${token}`, 'User-Agent': 'exodus-scout/1.0' }
    : { 'User-Agent': 'exodus-scout/1.0' };
}

/**
 * r/developersIndia (and similar) run monthly "who's hiring" / "monthly hiring"
 * threads. We search each subreddit for the newest such thread, then mine its
 * comments for engineering roles.
 */
export async function fetchRedditHiringJobs(
  options: {
    subreddits?: string[];
    searchTerms?: string[];
    nowMs?: number;
  } = {},
): Promise<RawJob[]> {
  const subreddits = options.subreddits ?? [
    'developersIndia',
    'cscareerquestionsIndia',
  ];
  const searchTerms = options.searchTerms ?? [
    'hiring',
    'monthly hiring',
    'who is hiring',
  ];
  const nowMs = options.nowMs ?? Date.parse('2026-07-14T00:00:00Z');

  const token = await getToken(nowMs);
  const headers = authHeaders(token);
  const base = baseUrl(token);
  const jobs: RawJob[] = [];

  for (const sub of subreddits) {
    // Find the most recent hiring thread.
    const q = encodeURIComponent(searchTerms.join(' OR '));
    const search = await fetchJson<RedditListing<RedditPost>>(
      `${base}/r/${sub}/search.json?q=${q}&restrict_sr=1&sort=new&limit=10`,
      { headers, label: `Reddit[${sub}]/search` },
    );
    const posts = (search?.data?.children ?? [])
      .map((c) => c.data)
      .filter((p): p is RedditPost => !!p && /hiring/i.test(p.title));
    const thread = posts[0];
    if (!thread) continue;

    const comments = await fetchJson<[unknown, RedditListing<RedditComment>]>(
      `${base}/r/${sub}/comments/${thread.id}.json?limit=500`,
      { headers, label: `Reddit[${sub}]/comments`, timeoutMs: 30_000 },
    );
    const children = comments?.[1]?.data?.children ?? [];

    for (const c of children) {
      const body = c.data?.body;
      if (!body || !ENG_RE.test(body)) continue;
      const text = stripHtml(body);
      // Heuristic title: first non-empty line.
      const firstLine = text.split(/\n|\.\s/)[0].slice(0, 200);

      jobs.push(
        toRawJob({
          title: firstLine,
          company: `via r/${sub}`,
          url: c.data?.permalink
            ? `https://reddit.com${c.data.permalink}`
            : `https://reddit.com${thread.permalink}`,
          description: text,
          location: REMOTE_RE.test(text) ? 'Remote / India' : 'India',
          postedAt: parseDate(c.data?.created_utc),
          remote: REMOTE_RE.test(text),
          source: 'reddit_hiring',
        }),
      );
    }
  }

  return jobs;
}
