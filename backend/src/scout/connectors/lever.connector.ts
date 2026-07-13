import type { RawJob } from '../scout.config.js';

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  categories: {
    location?: string;
    team?: string;
    commitment?: string;
  };
  createdAt?: number;
  descriptionPlain?: string;
  description?: string;
}

export async function fetchLeverJobs(
  slug: string,
  companyName: string,
): Promise<RawJob[]> {
  const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    console.warn(`Lever[${slug}]: HTTP ${res.status}`);
    return [];
  }

  const data = (await res.json()) as LeverPosting[];
  if (!Array.isArray(data)) return [];

  return data.map((p) => {
    let description = p.descriptionPlain || p.description || p.text || '';
    description = description.replace(/<[^>]*>/g, ' ').trim();

    return {
      title: p.text,
      company: companyName,
      url: p.hostedUrl || p.applyUrl || '',
      description: description.slice(0, 10_000),
      location: p.categories?.location || '',
      postedAt: p.createdAt ? new Date(p.createdAt) : undefined,
      source: 'lever',
    };
  });
}
