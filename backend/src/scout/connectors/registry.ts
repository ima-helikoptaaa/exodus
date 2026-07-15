import type { RawJob, SourceConfig } from '../scout.config.js';
import { fetchHnHiringJobs } from './hn.connector.js';
import {
  fetchRemoteOkJobs,
  fetchRemotiveJobs,
  fetchWeWorkRemotelyJobs,
  fetchWorkAtAStartupJobs,
} from './remote-boards.connector.js';
import { fetchRedditHiringJobs } from './reddit.connector.js';
import { fetchSerpApiJobs } from './serpapi.connector.js';
import { fetchSearxngJobs } from './searxng.connector.js';
import { fetchLinkedInJobs } from './linkedin.connector.js';
import {
  fetchWellfoundJobs,
  fetchNaukriJobs,
} from './wellfound-naukri.connector.js';

type Opts = Record<string, unknown>;

/**
 * Maps a source `type` to a fetch fn. Each fn receives the source's `options`
 * blob from portals.yml and returns normalized jobs. Unknown/failed sources
 * yield [] rather than throwing so one bad source never aborts a run.
 */
const REGISTRY: Record<
  SourceConfig['type'],
  (options: Opts) => Promise<RawJob[]>
> = {
  hn_hiring: (o) => fetchHnHiringJobs(o),
  remoteok: () => fetchRemoteOkJobs(),
  weworkremotely: (o) => fetchWeWorkRemotelyJobs(o),
  remotive: (o) => fetchRemotiveJobs(o),
  workatastartup: (o) => fetchWorkAtAStartupJobs(o),
  reddit_hiring: (o) => fetchRedditHiringJobs(o),
  serpapi: (o) => fetchSerpApiJobs(o),
  searxng: (o) => fetchSearxngJobs(o),
  linkedin: (o) => fetchLinkedInJobs(o),
  wellfound: (o) => fetchWellfoundJobs(o),
  naukri: (o) => fetchNaukriJobs(o),
};

export async function fetchSource(source: SourceConfig): Promise<RawJob[]> {
  const fn = REGISTRY[source.type];
  if (!fn) {
    console.warn(`Unknown source type: ${source.type}`);
    return [];
  }
  try {
    return await fn(source.options ?? {});
  } catch (err) {
    console.warn(`Source ${source.type} failed: ${(err as Error).message}`);
    return [];
  }
}
