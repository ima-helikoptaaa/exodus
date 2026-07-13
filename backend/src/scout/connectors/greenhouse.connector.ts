import type { RawJob } from '../scout.config.js';

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

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    console.warn(`Greenhouse[${slug}]: HTTP ${res.status}`);
    return [];
  }

  const data = (await res.json()) as GreenhouseResponse;
  const jobs = data.jobs || [];

  return jobs.map((j) => {
    let description = j.content || '';
    if (j.metadata?.length) {
      const metaText = j.metadata
        .map((m) => `${m.name}: ${m.value}`)
        .join('\n');
      description = description + '\n\n' + metaText;
    }
    description = description
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .trim();

    return {
      title: j.title,
      company: companyName,
      url: j.absolute_url,
      description: description.slice(0, 10_000),
      location: j.location?.name || '',
      postedAt: j.updated_at ? new Date(j.updated_at) : undefined,
      source: 'greenhouse',
    };
  });
}
