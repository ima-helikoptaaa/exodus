import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parse as parseYaml } from 'yaml';

export interface TitleFilters {
  positive: string[];
  negative: string[];
}

export interface CompanyConfig {
  name: string;
  careers_url?: string;
  greenhouse_slug?: string;
  ashby_slug?: string;
  lever_slug?: string;
  notes?: string;
}

export interface JobBoardConfig {
  name: string;
  search_url?: string;
  queries: string[];
}

/**
 * Aggregator / feed sources (HN, RemoteOK, Reddit, SerpApi, scrapers …).
 * Each entry toggles a connector and passes it source-specific options.
 * Anything requiring credentials reads them from env, not from here.
 */
export interface SourceConfig {
  /** Connector key — must match a registered connector id */
  type:
    | 'hn_hiring'
    | 'remoteok'
    | 'weworkremotely'
    | 'remotive'
    | 'workatastartup'
    | 'reddit_hiring'
    | 'serpapi'
    | 'searxng'
    | 'linkedin'
    | 'wellfound'
    | 'naukri';
  name?: string;
  enabled?: boolean;
  /** Free-form per-connector options (queries, subreddits, feed urls, …) */
  options?: Record<string, unknown>;
}

export interface PortalsConfig {
  title_filters: TitleFilters;
  /** Keywords that hint the role is a strong fit — used as soft scoring signal */
  soft_negative?: string[];
  companies: CompanyConfig[];
  job_boards: JobBoardConfig[];
  sources?: SourceConfig[];
}

export interface RawJob {
  title: string;
  company: string;
  url: string;
  description: string;
  location: string;
  postedAt?: Date;
  source: string;
  /** Raw salary/comp string if the source exposes one */
  salary?: string;
  /** True when the source explicitly marks the role remote */
  remote?: boolean;
}

let cachedConfig: PortalsConfig | null = null;

export function loadPortalsConfig(configPath?: string): PortalsConfig {
  if (cachedConfig && !configPath) return cachedConfig;

  // Resolve the config file. An explicit path (arg or env) is used as-is;
  // otherwise probe a few cwd-relative candidates so the scout works whether
  // the backend is run from backend/, the repo root, or backend/src/.
  const explicit = configPath || process.env.PORTALS_CONFIG_PATH;
  const candidates = explicit
    ? [resolve(explicit)]
    : [
        resolve('../scripts/portals.yml'), // run from backend/
        resolve('scripts/portals.yml'), // run from repo root
        resolve('../../scripts/portals.yml'), // run from backend/src
      ];

  const filePath = candidates.find((p) => existsSync(p));
  if (!filePath) {
    throw new Error(
      `portals.yml not found. Tried:\n${candidates.map((c) => `  - ${c}`).join('\n')}\nSet PORTALS_CONFIG_PATH to your portals.yml location.`,
    );
  }

  let parsed: PortalsConfig;
  try {
    const raw = readFileSync(filePath, 'utf-8');
    parsed = parseYaml(raw) as PortalsConfig;
  } catch (err) {
    throw new Error(
      `Failed to read/parse portals.yml (${filePath}): ${(err as Error).message}`,
    );
  }

  if (!parsed.title_filters || !parsed.companies) {
    throw new Error(
      `Invalid portals.yml (${filePath}): missing required sections (title_filters, companies)`,
    );
  }

  cachedConfig = parsed;
  return parsed;
}

export function clearConfigCache() {
  cachedConfig = null;
}
