import type { RawJob } from '../scout.config.js';
import { fetchText, parseDate, stripHtml, toRawJob } from './shared.js';
import { getBrowser, newContext } from './browser.js';

// ── Wellfound (AngelList) ────────────────────────────────────────────────────
/**
 * Wellfound gates its JSON behind auth/anti-bot, so we drive a headless browser
 * over the public role search pages. Optionally injects a session cookie
 * (WELLFOUND_COOKIE) for logged-in results.
 */
export async function fetchWellfoundJobs(
  options: { roles?: string[]; location?: string } = {},
): Promise<RawJob[]> {
  const roles = options.roles ?? ['software-engineer', 'backend-engineer'];
  const locationSlug = (options.location ?? 'india')
    .toLowerCase()
    .replace(/\s+/g, '-');

  const browser = await getBrowser();
  const context = await newContext(browser, {
    cookieString: process.env.WELLFOUND_COOKIE,
    cookieDomain: '.wellfound.com',
  });
  const page = await context.newPage();
  const jobs: RawJob[] = [];

  try {
    for (const role of roles) {
      const url = `https://wellfound.com/role/l/${role}/${locationSlug}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(3000);

      const cards = await page.$$eval(
        '[data-test="JobSearchResults"] [data-test="StartupResult"], .styles_component__job',
        (els) =>
          els.flatMap((startup) => {
            const company =
              startup
                .querySelector('h2, [class*="startupName"]')
                ?.textContent?.trim() ?? 'Unknown';
            const listings = Array.from(
              startup.querySelectorAll<HTMLAnchorElement>('a[href*="/jobs/"]'),
            );
            return listings.map((a) => ({
              company,
              title: a.textContent?.trim() ?? '',
              url: a.href,
            }));
          }),
      );

      for (const c of cards) {
        if (!c.title || !c.url) continue;
        jobs.push(
          toRawJob({
            title: c.title,
            company: c.company,
            url: c.url.split('?')[0],
            description: '',
            location: options.location ?? 'India',
            source: 'wellfound',
          }),
        );
      }
    }
  } catch (err) {
    console.warn(`Wellfound: ${(err as Error).message}`);
  } finally {
    await context.close();
  }
  return jobs;
}

// ── Naukri ──────────────────────────────────────────────────────────────────
/**
 * Naukri.
 *  - Preferred: create a saved search on naukri.com, grab its RSS URL, and list
 *    them in NAUKRI_RSS_FEEDS (comma-separated) or the source options.feeds.
 *  - Fallback: headless scrape of a keyword/location search page.
 */
export async function fetchNaukriJobs(
  options: { feeds?: string[]; keyword?: string; location?: string } = {},
): Promise<RawJob[]> {
  const feeds =
    options.feeds ??
    (process.env.NAUKRI_RSS_FEEDS
      ? process.env.NAUKRI_RSS_FEEDS.split(',').map((s) => s.trim())
      : []);

  if (feeds.length > 0) {
    return fetchNaukriRss(feeds);
  }
  return fetchNaukriScrape(
    options.keyword ?? 'software engineer',
    options.location ?? 'bengaluru',
  );
}

async function fetchNaukriRss(feeds: string[]): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  for (const feed of feeds) {
    const xml = await fetchText(feed, {
      headers: { 'User-Agent': 'exodus-scout/1.0' },
      label: 'Naukri/rss',
    });
    if (!xml) continue;
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    for (const block of items) {
      const title = stripHtml(
        block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '',
      ).replace(/<!\[CDATA\[|\]\]>/g, '');
      const link = (block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ?? '').trim();
      const desc = stripHtml(
        block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] ?? '',
      );
      if (!title || !link) continue;
      jobs.push(
        toRawJob({
          title,
          company: 'via Naukri',
          url: link,
          description: desc,
          location: 'India',
          postedAt: parseDate(
            block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1],
          ),
          source: 'naukri',
        }),
      );
    }
  }
  return jobs;
}

async function fetchNaukriScrape(
  keyword: string,
  location: string,
): Promise<RawJob[]> {
  const browser = await getBrowser();
  const context = await newContext(browser);
  const page = await context.newPage();
  const jobs: RawJob[] = [];

  try {
    const kw = keyword.toLowerCase().replace(/\s+/g, '-');
    const url = `https://www.naukri.com/${kw}-jobs-in-${location.toLowerCase()}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);

    const cards = await page.$$eval(
      'article.jobTuple, div.srp-jobtuple-wrapper',
      (els) =>
        els.map((el) => ({
          title: el.querySelector('a.title')?.textContent?.trim() ?? '',
          company:
            el.querySelector('a.subTitle, a.comp-name')?.textContent?.trim() ??
            '',
          location:
            el.querySelector('.locWdth, .loc span')?.textContent?.trim() ?? '',
          url: el.querySelector<HTMLAnchorElement>('a.title')?.href ?? '',
        })),
    );

    for (const c of cards) {
      if (!c.title || !c.url) continue;
      jobs.push(
        toRawJob({
          title: c.title,
          company: c.company || 'via Naukri',
          url: c.url.split('?')[0],
          description: '',
          location: c.location || 'India',
          source: 'naukri',
        }),
      );
    }
  } catch (err) {
    console.warn(`Naukri/scrape: ${(err as Error).message}`);
  } finally {
    await context.close();
  }
  return jobs;
}
