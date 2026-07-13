import { readFileSync } from 'fs';
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

export interface PortalsConfig {
  title_filters: TitleFilters;
  companies: CompanyConfig[];
  job_boards: JobBoardConfig[];
}

export interface RawJob {
  title: string;
  company: string;
  url: string;
  description: string;
  location: string;
  postedAt?: Date;
  source: string;
}

let cachedConfig: PortalsConfig | null = null;

export function loadPortalsConfig(configPath?: string): PortalsConfig {
  if (cachedConfig && !configPath) return cachedConfig;

  const defaultPath = resolve(
    process.env.PORTALS_CONFIG_PATH || '../../scripts/portals.yml',
  );
  const filePath = configPath || defaultPath;

  const raw = readFileSync(filePath, 'utf-8');
  const parsed = parseYaml(raw) as PortalsConfig;

  if (!parsed.title_filters || !parsed.companies) {
    throw new Error(`Invalid portals.yml: missing required sections`);
  }

  cachedConfig = parsed;
  return parsed;
}

export function clearConfigCache() {
  cachedConfig = null;
}
