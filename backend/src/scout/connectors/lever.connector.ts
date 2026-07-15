import type { RawJob } from '../scout.config.js';
import { fetchJson, parseDate, stripHtml, toRawJob } from './shared.js';

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
  workplaceType?: string;
  createdAt?: number;
  descriptionPlain?: string;
  description?: string;
}

export async function fetchLeverJobs(
  slug: string,
  companyName: string,
): Promise<RawJob[]> {
  const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;
  const data = await fetchJson<LeverPosting[]>(url, {
    label: `Lever[${slug}]`,
  });
  if (!Array.isArray(data)) return [];

  return data.map((p) => {
    const description = stripHtml(
      p.descriptionPlain || p.description || p.text || '',
    );
    const location = p.categories?.location || '';

    return toRawJob({
      title: p.text,
      company: companyName,
      url: p.hostedUrl || p.applyUrl || '',
      description,
      location,
      postedAt: parseDate(p.createdAt),
      remote:
        p.workplaceType?.toLowerCase() === 'remote' ||
        /remote|worldwide|anywhere/i.test(location),
      source: 'lever',
    });
  });
}
