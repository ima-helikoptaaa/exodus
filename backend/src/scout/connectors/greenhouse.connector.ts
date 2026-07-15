import type { RawJob } from '../scout.config.js';
import { fetchJson, parseDate, stripHtml, toRawJob } from './shared.js';

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location: { name: string };
  content?: string;
  updated_at?: string;
  metadata?: Array<{ name: string; value: string }>;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

export async function fetchGreenhouseJobs(
  slug: string,
  companyName: string,
): Promise<RawJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;
  const data = await fetchJson<GreenhouseResponse>(url, {
    label: `Greenhouse[${slug}]`,
  });
  const jobs = data?.jobs ?? [];

  return jobs.map((j) => {
    let description = j.content || '';
    if (j.metadata?.length) {
      const metaText = j.metadata
        .map((m) => `${m.name}: ${m.value}`)
        .join('\n');
      description = description + '\n\n' + metaText;
    }
    const location = j.location?.name || '';

    return toRawJob({
      title: j.title,
      company: companyName,
      url: j.absolute_url,
      description: stripHtml(description),
      location,
      postedAt: parseDate(j.updated_at),
      remote: /remote|worldwide|anywhere/i.test(location),
      source: 'greenhouse',
    });
  });
}
