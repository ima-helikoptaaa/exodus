import type { Browser, BrowserContext } from 'playwright';

/**
 * Lazy Playwright loader. Playwright is a heavy, optional dependency — we only
 * import it when a scraper actually runs, so the rest of scout works even if
 * the browser binaries aren't installed.
 */
let browserPromise: Promise<Browser> | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = (async () => {
      const { chromium } = await import('playwright');
      return chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      });
    })();
  }
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise.catch(() => null);
    await b?.close().catch(() => {});
    browserPromise = null;
  }
}

/** Build a context, optionally injecting cookies from a "name=value; name2=value2" env string. */
export async function newContext(
  browser: Browser,
  opts: { cookieString?: string; cookieDomain?: string } = {},
): Promise<BrowserContext> {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });

  if (opts.cookieString && opts.cookieDomain) {
    const cookies = opts.cookieString
      .split(';')
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const eq = pair.indexOf('=');
        return {
          name: pair.slice(0, eq).trim(),
          value: pair.slice(eq + 1).trim(),
          domain: opts.cookieDomain!,
          path: '/',
        };
      });
    await context.addCookies(cookies);
  }

  return context;
}
