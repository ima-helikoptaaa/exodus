import type { RawJob } from '../scout.config.js';
import { fetchText, stripHtml, toRawJob } from './shared.js';
import { getBrowser, newContext } from './browser.js';

/**
 * LinkedIn Jobs.
 *
 * Two strategies:
 *  1. Guest "voyager" HTML endpoint — no auth, returns a paginated list of job
 *     cards. Works for most searches, gets rate-limited if hammered.
 *  2. Playwright + LI_AT cookie — used when LINKEDIN_LI_AT is set, for
 *     authenticated searches / when the guest endpoint is blocked.
 *
 * Configure searches via portals.yml `sources` options.queries (array of
 * { keywords, location }).
 */

interface LinkedInQuery {
  keywords: string;
  location?: string;
  /** seconds; e.g. 86400 = past 24h, 604800 = past week */
  freshnessSeconds?: number;
  remote?: boolean;
}

const GUEST_BASE =
  'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';

function parseGuestCards(html: string): RawJob[] {
  const jobs: RawJob[] = [];
  const cards = html.split('<li>').slice(1);
  for (const card of cards) {
    const title = stripHtml(
      card.match(/base-search-card__title[^>]*>([\s\S]*?)<\/[a-z]/i)?.[1] ?? '',
    );
    const company = stripHtml(
      card.match(/base-search-card__subtitle[^>]*>([\s\S]*?)<\/[a-z]/i)?.[1] ??
        '',
    );
    const location = stripHtml(
      card.match(/job-search-card__location[^>]*>([\s\S]*?)<\/span>/i)?.[1] ??
        '',
    );
    const url =
      card.match(
        /href="(https:\/\/[a-z.]*linkedin\.com\/jobs\/view\/[^"?]+)/i,
      )?.[1] ?? '';
    const datetime = card.match(/datetime="([^"]+)"/i)?.[1];

    if (!title || !url) continue;
    jobs.push(
      toRawJob({
        title,
        company: company || 'Unknown',
        url,
        description: '', // guest cards have no JD; scored on title until enriched
        location,
        postedAt: datetime ? new Date(datetime) : undefined,
        remote: /remote/i.test(location),
        source: 'linkedin',
      }),
    );
  }
  return jobs;
}

async function fetchGuest(q: LinkedInQuery, pages: number): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  // The guest endpoint returns a variable batch (~10) per request. Advance
  // `start` by the number of cards actually returned so we neither skip nor
  // re-fetch rows — a fixed stride (e.g. 25) silently drops jobs 10–24.
  let start = 0;
  for (let page = 0; page < pages; page++) {
    const params = new URLSearchParams({
      keywords: q.keywords,
      start: String(start),
    });
    if (q.location) params.set('location', q.location);
    if (q.freshnessSeconds) params.set('f_TPR', `r${q.freshnessSeconds}`);
    if (q.remote) params.set('f_WT', '2');

    const html = await fetchText(`${GUEST_BASE}?${params.toString()}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0 Safari/537.36',
        Accept: 'text/html',
      },
      label: 'LinkedIn/guest',
    });
    if (!html) break;
    const pageJobs = parseGuestCards(html);
    if (pageJobs.length === 0) break;
    jobs.push(...pageJobs);
    start += pageJobs.length;
  }
  return jobs;
}

async function fetchAuthed(q: LinkedInQuery, liAt: string): Promise<RawJob[]> {
  const browser = await getBrowser();
  const context = await newContext(browser, {
    cookieString: `li_at=${liAt}`,
    cookieDomain: '.linkedin.com',
  });
  const page = await context.newPage();
  const jobs: RawJob[] = [];

  try {
    const params = new URLSearchParams({ keywords: q.keywords });
    if (q.location) params.set('location', q.location);
    if (q.freshnessSeconds) params.set('f_TPR', `r${q.freshnessSeconds}`);
    if (q.remote) params.set('f_WT', '2');

    await page.goto(
      `https://www.linkedin.com/jobs/search/?${params.toString()}`,
      {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      },
    );
    await page.waitForTimeout(2500);

    const cards = await page.$$eval(
      'div.job-card-container, li.jobs-search-results__list-item',
      (els) =>
        els.map((el) => ({
          title:
            el
              .querySelector(
                'a.job-card-list__title, a.job-card-container__link',
              )
              ?.textContent?.trim() ?? '',
          company:
            el
              .querySelector(
                '.job-card-container__primary-description, .artdeco-entity-lockup__subtitle',
              )
              ?.textContent?.trim() ?? '',
          location:
            el
              .querySelector('.job-card-container__metadata-item')
              ?.textContent?.trim() ?? '',
          url:
            el.querySelector<HTMLAnchorElement>(
              'a.job-card-list__title, a.job-card-container__link',
            )?.href ?? '',
        })),
    );

    for (const c of cards) {
      if (!c.title || !c.url) continue;
      jobs.push(
        toRawJob({
          title: c.title,
          company: c.company || 'Unknown',
          url: c.url.split('?')[0],
          description: '',
          location: c.location,
          remote: /remote/i.test(c.location),
          source: 'linkedin',
        }),
      );
    }
  } catch (err) {
    console.warn(`LinkedIn/authed: ${(err as Error).message}`);
  } finally {
    await context.close();
  }
  return jobs;
}

export async function fetchLinkedInJobs(
  options: { queries?: LinkedInQuery[]; pages?: number } = {},
): Promise<RawJob[]> {
  const queries = options.queries ?? [
    {
      keywords: 'backend engineer',
      location: 'India',
      freshnessSeconds: 604800,
    },
  ];
  const pages = options.pages ?? 2;
  const liAt = process.env.LINKEDIN_LI_AT;

  const all: RawJob[] = [];
  for (const q of queries) {
    const jobs = liAt ? await fetchAuthed(q, liAt) : await fetchGuest(q, pages);
    all.push(...jobs);
  }
  return all;
}
