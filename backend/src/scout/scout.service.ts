import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  loadPortalsConfig,
  type PortalsConfig,
  type RawJob,
  type CompanyConfig,
} from './scout.config.js';
import { fetchGreenhouseJobs } from './connectors/greenhouse.connector.js';
import { fetchLeverJobs } from './connectors/lever.connector.js';
import { fetchAshbyJobs } from './connectors/ashby.connector.js';
import { fetchSource } from './connectors/registry.js';
import { mapWithConcurrency } from './connectors/shared.js';
import { AiService } from '../ai/ai.service.js';

const INDIA_CITIES = [
  'bangalore',
  'bengaluru',
  'mumbai',
  'delhi',
  'ncr',
  'gurgaon',
  'gurugram',
  'hyderabad',
  'pune',
  'chennai',
  'kolkata',
  'noida',
  'ahmedabad',
  'india',
  'remote',
  'worldwide',
  'global',
  'anywhere',
];

// Location strings that are ambiguous/unusual but shouldn't be hard-rejected —
// let them through to the LLM scorer (which weighs location at 10%).
const REMOTE_HINT_RE =
  /\bremote\b|hybrid|distributed|multiple|various|flexible/i;

const SENIOR_RE =
  /\b(4|5|6|7|8|9|10)\s*\+\s*years?\b|\bsenior\b|\bstaff\b|\bprincipal\b/i;
const JUNIOR_OK_RE =
  /\b(0|1|2|3)\s*\+?\s*years?\b|\bentry\b|\bjunior\b|\bearly career\b/i;

/**
 * Ambiguous title keywords: these used to be HARD rejects but killed too many
 * relevant IC roles (e.g. "Full Stack Engineer (Front End heavy)", "Solutions
 * Architect" that is really an IC). We keep them only as a note handed to the
 * scorer, which decides based on the whole JD.
 */
const SOFT_NEGATIVE_KEYWORDS = [
  'lead',
  'architect',
  'front end',
  'front-end',
  'frontend',
  'mobile',
  'solutions engineer',
];

/** Escape a keyword and match it on word boundaries (so "Lead" ≠ "Leading"). */
function keywordRegex(kw: string): RegExp {
  const escaped = kw
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  return new RegExp(`\\b${escaped}\\b`, 'i');
}

// Max concurrent LLM scoring calls. 5–8 typically yields a 5–8× speedup over
// the old sequential loop without overwhelming the GLM endpoint.
const SCORING_CONCURRENCY = Number(process.env.SCOUT_SCORING_CONCURRENCY) || 6;

// Once this many scoring calls fall back (both GLM + Bedrock failed), treat it
// as a sustained outage and stop scoring the rest — prevents silently flooding
// the wishlist with default-pass (70) jobs during an LLM outage.
const OUTAGE_THRESHOLD = Number(process.env.SCOUT_OUTAGE_THRESHOLD) || 8;

/** Normalize a string for fuzzy matching: lowercase, alphanumerics, single spaces. */
function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Stable fuzzy key for a job (company + title + location). Catches the same
 * role surfaced by two aggregators with different tracking URLs — used for
 * within-run dedup AND the persistent seen-jobs store.
 */
function jobHash(job: {
  company: string;
  title: string;
  location?: string;
}): string {
  return [
    normalizeKey(job.company),
    normalizeKey(job.title),
    normalizeKey(job.location ?? ''),
  ].join('|');
}

@Injectable()
export class ScoutService {
  private readonly logger = new Logger(ScoutService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async runScout(opts?: {
    useLlmScoring?: boolean;
    dryRun?: boolean;
  }): Promise<{
    runId: string;
    companiesChecked: number;
    jobsScanned: number;
    jobsAdded: number;
    jobsSkipped: number;
    scoringFailures: number;
    outage: boolean;
    preview: Array<{
      company: string;
      role: string;
      location: string;
      score: number;
      url: string;
    }>;
  }> {
    const useLlm = opts?.useLlmScoring ?? true;
    const dryRun = opts?.dryRun ?? false;

    const run = await this.prisma.scoutRun.create({
      data: { status: dryRun ? 'preview' : 'running' },
    });

    // Load config after creating the run so a bad portals.yml path fails
    // gracefully (run recorded as 'failed' + clear message) instead of an
    // unhandled ENOENT 500.
    let config: PortalsConfig;
    try {
      config = loadPortalsConfig();
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`Scout run ${run.id} aborted: ${message}`);
      await this.prisma.scoutRun.update({
        where: { id: run.id },
        data: { status: 'failed', finishedAt: new Date(), summary: message },
      });
      throw new BadRequestException(message);
    }

    const existingUrls = await this.getExistingJobUrls();
    let companiesChecked = 0;
    let jobsAdded = 0;
    let jobsSkipped = 0;
    let scoringFailures = 0;
    let outage = false;
    const preview: Array<{
      company: string;
      role: string;
      location: string;
      score: number;
      url: string;
    }> = [];

    // Gather from every source (company ATS boards + aggregators), dedup, and
    // sort freshest-first so new postings are scored before stale ones.
    const { jobs: allJobs, companiesChecked: checked } =
      await this.gatherAllJobs(config);
    companiesChecked = checked;
    const jobsScanned = allJobs.length;

    // ── Filter pass: cheap synchronous filters, collect survivors in order ──
    // Dedup across the run already happened in gatherAllJobs(), so within
    // allJobs no two jobs share a URL or company+title — safe to score all
    // survivors concurrently without re-deduping against each other.
    //
    // Cross-run dedup uses the persistent SeenJob store (by url OR fuzzy hash)
    // so rejected jobs don't reappear, and incremental mode skips postings
    // older than the last successful run's start time.
    const { seenUrls, seenHashes } = await this.getSeenJobs();
    const cutoff = await this.getLastRunCutoff();

    const survivors: Array<{
      job: RawJob;
      softSignals: string[];
      hash: string;
    }> = [];
    for (const job of allJobs) {
      const hash = jobHash(job);

      // Incremental: skip postings older than the last successful run.
      if (cutoff && job.postedAt && job.postedAt < cutoff) {
        jobsSkipped++;
        await this.logScout(
          run.id,
          job,
          'skipped_stale',
          'Posted before last run',
        );
        continue;
      }

      // Cross-run dedup against the persistent seen-jobs store.
      if (
        (job.url && seenUrls.has(job.url.toLowerCase())) ||
        seenHashes.has(hash)
      ) {
        jobsSkipped++;
        await this.logScout(
          run.id,
          job,
          'skipped_duplicate',
          'Previously seen',
        );
        continue;
      }

      const skip = this.applyFilters(job, config, existingUrls);
      if (skip) {
        jobsSkipped++;
        await this.logScout(run.id, job, skip.action, skip.reason);
        // Filtered out by rules — record as seen+rejected so it doesn't recur.
        await this.recordSeenJob(job, hash, true);
        continue;
      }
      survivors.push({
        job,
        softSignals: this.getSoftSignals(job, config),
        hash,
      });
    }

    // ── Score pass: batch LLM calls with a concurrency cap ──
    let fallbackCount = 0;
    const scoreResults = await mapWithConcurrency(
      survivors,
      SCORING_CONCURRENCY,
      async (s) => {
        // If a sustained outage was already detected, skip remaining LLM calls.
        if (outage) {
          return {
            score: 0,
            reasons: [] as string[],
            fallback: false,
            skipped: true,
          };
        }
        if (!useLlm) {
          return {
            score: 70,
            reasons: ['Passed title + location + experience filters'],
            fallback: false,
            skipped: false,
          };
        }
        const r = await this.aiService.scoreJob(
          s.job.title,
          s.job.description,
          s.job.company,
          s.softSignals,
        );
        if (r.fallback) {
          fallbackCount++;
          if (fallbackCount >= OUTAGE_THRESHOLD) outage = true;
        }
        return {
          score: r.score,
          reasons: r.reasons,
          fallback: r.fallback,
          skipped: false,
        };
      },
    );

    // ── Insert pass: preserve freshest-first order, apply score threshold ──
    for (let i = 0; i < survivors.length; i++) {
      const { job, hash } = survivors[i];
      const r = scoreResults[i];

      if (r.skipped) {
        jobsSkipped++;
        await this.logScout(
          run.id,
          job,
          'skipped_scoring_outage',
          'Skipped — LLM outage detected',
        );
        continue;
      }
      if (r.fallback) scoringFailures++;

      const score = r.score;
      const reasons = r.reasons.length
        ? r.reasons
        : ['Passed title + location + experience filters'];
      const tag = r.fallback ? ' (LLM fallback)' : '';

      if (score < 50) {
        jobsSkipped++;
        await this.logScout(
          run.id,
          job,
          'skipped_score',
          `Score: ${score}${tag}`,
          score,
        );
        // Score-rejected — record as seen+rejected so it doesn't reappear.
        await this.recordSeenJob(job, hash, true);
        continue;
      }

      const priority = score >= 85 ? 3 : score >= 70 ? 2 : 1;

      if (dryRun) {
        // Store as pending — waiting for user confirmation. Don't record as
        // seen: unconfirmed jobs should reappear in the next run.
        await this.logScout(
          run.id,
          job,
          'pending',
          `Score: ${score}${tag}`,
          score,
        );
        preview.push({
          company: job.company,
          role: job.title,
          location: job.location,
          score,
          url: job.url,
        });
        jobsAdded++;
      } else {
        await this.createApplicationFromJob(job, score, reasons, priority);
        existingUrls.add(job.url.toLowerCase());
        jobsAdded++;
        await this.recordSeenJob(job, hash, false);
        await this.logScout(
          run.id,
          job,
          'added',
          `Score: ${score}${tag}`,
          score,
        );
        this.logger.log(
          `Added: ${job.company} — ${job.title} (score ${score}${tag})`,
        );
      }
    }

    await this.prisma.scoutRun.update({
      where: { id: run.id },
      data: {
        status: dryRun
          ? 'pending_confirmation'
          : outage
            ? 'degraded'
            : 'completed',
        finishedAt: new Date(),
        companiesChecked,
        jobsScanned,
        jobsAdded,
        jobsSkipped,
        summary: outage
          ? `LLM outage detected — ${scoringFailures} scoring failure(s)`
          : scoringFailures > 0
            ? `${scoringFailures} scoring failure(s)`
            : null,
      },
    });

    if (outage) {
      this.logger.error(
        `Scout run ${run.id} degraded: LLM outage detected after ${scoringFailures} scoring failures`,
      );
    }

    return {
      runId: run.id,
      companiesChecked,
      jobsScanned,
      jobsAdded,
      jobsSkipped,
      scoringFailures,
      outage,
      preview: preview.sort((a, b) => b.score - a.score),
    };
  }

  async confirmPreview(runId: string): Promise<{
    runId: string;
    jobsAdded: number;
  }> {
    const run = await this.prisma.scoutRun.findUnique({
      where: { id: runId },
    });
    if (!run) {
      throw new Error('Preview run not found');
    }
    if (run.status !== 'pending_confirmation') {
      throw new Error(
        `Run is not pending confirmation (status: ${run.status})`,
      );
    }

    const pendingLogs = await this.prisma.scoutLog.findMany({
      where: { scoutRunId: runId, action: 'pending' },
    });

    let jobsAdded = 0;
    const existingUrls = await this.getExistingJobUrls();

    for (const log of pendingLogs) {
      if (log.jobUrl && existingUrls.has(log.jobUrl.toLowerCase())) {
        await this.prisma.scoutLog.update({
          where: { id: log.id },
          data: { action: 'skipped_duplicate', reason: 'Added by another run' },
        });
        continue;
      }

      const job: RawJob = {
        title: log.role,
        company: log.companyName,
        url: log.jobUrl || '',
        description: '',
        location: log.location || '',
        source: 'scout',
      };

      const score = log.matchScore ?? 70;
      const priority = score >= 85 ? 3 : score >= 70 ? 2 : 1;
      const reasons = [`Scout score: ${score}`];

      await this.createApplicationFromJob(job, score, reasons, priority);
      existingUrls.add(job.url.toLowerCase());
      jobsAdded++;

      await this.prisma.scoutLog.update({
        where: { id: log.id },
        data: { action: 'added', reason: `Confirmed by user` },
      });
    }

    await this.prisma.scoutRun.update({
      where: { id: runId },
      data: { status: 'completed', jobsAdded },
    });

    return { runId, jobsAdded };
  }

  async getPendingPreview(): Promise<{
    runId: string;
    startedAt: Date;
    jobsFound: number;
    companiesChecked: number;
    preview: Array<{
      companyName: string;
      role: string;
      location: string | null;
      matchScore: number | null;
      jobUrl: string | null;
    }>;
  } | null> {
    const run = await this.prisma.scoutRun.findFirst({
      where: { status: 'pending_confirmation' },
      orderBy: { startedAt: 'desc' },
    });

    if (!run) return null;

    const pendingLogs = await this.prisma.scoutLog.findMany({
      where: { scoutRunId: run.id, action: 'pending' },
      orderBy: { matchScore: 'desc' },
    });

    return {
      runId: run.id,
      startedAt: run.startedAt,
      jobsFound: pendingLogs.length,
      companiesChecked: run.companiesChecked,
      preview: pendingLogs.map((l) => ({
        companyName: l.companyName,
        role: l.role,
        location: l.location,
        matchScore: l.matchScore,
        jobUrl: l.jobUrl,
      })),
    };
  }

  async getRunHistory(limit = 20) {
    return this.prisma.scoutRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: { _count: { select: { logs: true } } },
    });
  }

  async getRunLogs(runId: string, action?: string) {
    return this.prisma.scoutLog.findMany({
      where: { scoutRunId: runId, ...(action ? { action } : {}) },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });
  }

  async getLastRun() {
    return this.prisma.scoutRun.findFirst({
      orderBy: { startedAt: 'desc' },
    });
  }

  // ── Private helpers ──────────────────────────────────────────────

  private async fetchCompanyJobs(company: CompanyConfig): Promise<RawJob[]> {
    if (company.greenhouse_slug) {
      return fetchGreenhouseJobs(company.greenhouse_slug, company.name);
    }
    if (company.ashby_slug) {
      return fetchAshbyJobs(company.ashby_slug, company.name);
    }
    if (company.lever_slug) {
      return fetchLeverJobs(company.lever_slug, company.name);
    }
    return [];
  }

  /**
   * Fetch from every configured source — company ATS boards (Greenhouse/
   * Lever/Ashby) AND aggregator sources (HN, RemoteOK, Reddit, SerpApi,
   * scrapers). Companies with only a `careers_url` are covered by the
   * SerpApi long-tail source rather than skipped. Results are deduped across
   * sources and sorted freshest-first.
   */
  private async gatherAllJobs(config: PortalsConfig): Promise<{
    jobs: RawJob[];
    companiesChecked: number;
  }> {
    const collected: RawJob[] = [];
    let companiesChecked = 0;

    // 1. Company ATS boards (run concurrently — each is independent).
    const companyResults = await Promise.allSettled(
      config.companies.map((c) => this.fetchCompanyJobs(c)),
    );
    for (let i = 0; i < companyResults.length; i++) {
      companiesChecked++;
      const r = companyResults[i];
      if (r.status === 'fulfilled') {
        collected.push(...r.value);
      } else {
        this.logger.warn(
          `Error fetching ${config.companies[i].name}: ${String(r.reason)}`,
        );
      }
    }

    // 2. Aggregator sources (opt-in via portals.yml `sources`).
    const enabledSources = (config.sources ?? []).filter(
      (s) => s.enabled !== false,
    );
    const sourceResults = await Promise.allSettled(
      enabledSources.map((s) => fetchSource(s)),
    );
    for (let i = 0; i < sourceResults.length; i++) {
      const r = sourceResults[i];
      if (r.status === 'fulfilled') {
        this.logger.log(
          `Source ${enabledSources[i].type}: ${r.value.length} jobs`,
        );
        collected.push(...r.value);
      } else {
        this.logger.warn(
          `Source ${enabledSources[i].type} failed: ${String(r.reason)}`,
        );
      }
    }

    return { jobs: this.dedupeAndSort(collected), companiesChecked };
  }

  /**
   * Dedup across sources by URL (primary) then by a fuzzy company+title+
   * location hash (catches the same role from two aggregators with different
   * tracking URLs), then sort by postedAt descending so fresh postings score
   * first.
   */
  private dedupeAndSort(jobs: RawJob[]): RawJob[] {
    const seenUrls = new Set<string>();
    const seenKeys = new Set<string>();
    const out: RawJob[] = [];

    for (const job of jobs) {
      const url = job.url?.toLowerCase().trim();
      const key = jobHash(job);
      if (url && seenUrls.has(url)) continue;
      if (seenKeys.has(key)) continue;
      if (url) seenUrls.add(url);
      seenKeys.add(key);
      out.push(job);
    }

    out.sort((a, b) => {
      const at = a.postedAt?.getTime() ?? 0;
      const bt = b.postedAt?.getTime() ?? 0;
      return bt - at;
    });
    return out;
  }

  private applyFilters(
    job: RawJob,
    config: PortalsConfig,
    existingUrls: Set<string>,
  ): { action: string; reason: string } | null {
    // 1. Duplicate check
    if (job.url && existingUrls.has(job.url.toLowerCase())) {
      return {
        action: 'skipped_duplicate',
        reason: 'Already in tracker or previously seen',
      };
    }

    // 2. Title positive match (substring — positive keywords are multi-word).
    const titleLower = job.title.toLowerCase();
    const hasPositive = config.title_filters.positive.some((kw) =>
      titleLower.includes(kw.toLowerCase()),
    );
    if (!hasPositive) {
      return { action: 'skipped_title', reason: 'No positive keyword match' };
    }

    // 3. Title HARD negative match — word-boundary so "Lead" ≠ "Leading" and
    //    "Manager" ≠ "management platform". Ambiguous keywords (Lead, Architect,
    //    Frontend, Mobile …) are NOT hard-rejected — they become soft signals.
    const hardNegatives = this.getHardNegatives(config);
    const hitNegative = hardNegatives.find((kw) =>
      keywordRegex(kw).test(job.title),
    );
    if (hitNegative) {
      return {
        action: 'skipped_title',
        reason: `Matched negative keyword: ${hitNegative}`,
      };
    }

    // 4. Location filter — India, remote-worldwide, or ambiguous. Odd location
    //    strings pass through to the LLM scorer instead of being hard-dropped.
    if (!this.isIndiaOrRemote(job.location, job.remote)) {
      return {
        action: 'skipped_location',
        reason: `Location: ${job.location}`,
      };
    }

    // 5. Experience filter — reject 4+ years required
    if (this.isSeniorRole(job.title, job.description)) {
      return {
        action: 'skipped_experience',
        reason: 'Requires 4+ years or senior-level',
      };
    }

    return null;
  }

  /** Config negatives minus the ambiguous ones we downgraded to soft signals. */
  private getHardNegatives(config: PortalsConfig): string[] {
    const soft = new Set(
      (config.soft_negative ?? SOFT_NEGATIVE_KEYWORDS).map((s) =>
        s.toLowerCase(),
      ),
    );
    return config.title_filters.negative.filter(
      (kw) => !soft.has(kw.toLowerCase()),
    );
  }

  /**
   * Soft signals handed to the scorer as context (not hard rejects): ambiguous
   * title keywords + remote/salary hints. Lets the LLM weigh the full JD.
   */
  private getSoftSignals(job: RawJob, config: PortalsConfig): string[] {
    const notes: string[] = [];
    const soft = config.soft_negative ?? SOFT_NEGATIVE_KEYWORDS;
    for (const kw of soft) {
      if (keywordRegex(kw).test(job.title)) {
        notes.push(
          `Title contains ambiguous term "${kw}" — verify it's an IC role`,
        );
      }
    }
    if (job.salary) notes.push(`Listed comp: ${job.salary}`);
    if (job.remote) notes.push('Marked remote by source');
    return notes;
  }

  private isIndiaOrRemote(location: string, remoteFlag?: boolean): boolean {
    if (remoteFlag) return true;
    if (!location || location.trim() === '') return true; // assume remote if unknown
    const locLower = location.toLowerCase();
    if (INDIA_CITIES.some((city) => locLower.includes(city))) return true;
    // Ambiguous/hybrid/multi-location strings: let the scorer decide.
    return REMOTE_HINT_RE.test(locLower);
  }

  private isSeniorRole(title: string, description: string): boolean {
    if (SENIOR_RE.test(title)) return true;
    // Only check first 2000 chars of description for experience requirements
    const descSlice = description.slice(0, 2000);
    if (SENIOR_RE.test(descSlice)) {
      // But don't reject if the JD also mentions junior/entry-level
      if (JUNIOR_OK_RE.test(descSlice)) return false;
      return true;
    }
    return false;
  }

  private async getExistingJobUrls(): Promise<Set<string>> {
    const apps = await this.prisma.application.findMany({
      where: { jobUrl: { not: null } },
      select: { jobUrl: true },
    });
    return new Set(apps.map((a) => (a.jobUrl || '').toLowerCase()));
  }

  /** Load the persistent seen-jobs store: url set + fuzzy hash set. */
  private async getSeenJobs(): Promise<{
    seenUrls: Set<string>;
    seenHashes: Set<string>;
  }> {
    const rows = await this.prisma.seenJob.findMany({
      select: { url: true, jobHash: true },
    });
    const seenUrls = new Set<string>();
    const seenHashes = new Set<string>();
    for (const r of rows) {
      if (r.url) seenUrls.add(r.url.toLowerCase());
      if (r.jobHash) seenHashes.add(r.jobHash);
    }
    return { seenUrls, seenHashes };
  }

  /** Start time of the last completed/degraded run — the incremental cutoff. */
  private async getLastRunCutoff(): Promise<Date | null> {
    const last = await this.prisma.scoutRun.findFirst({
      where: { status: { in: ['completed', 'degraded'] } },
      orderBy: { startedAt: 'desc' },
    });
    return last?.startedAt ?? null;
  }

  /** Upsert a job into the persistent seen-jobs store. */
  private async recordSeenJob(
    job: RawJob,
    hash: string,
    rejected: boolean,
  ): Promise<void> {
    if (!job.url) return;
    try {
      await this.prisma.seenJob.upsert({
        where: { url: job.url },
        create: {
          url: job.url,
          company: job.company,
          title: job.title,
          location: job.location || null,
          source: job.source || null,
          jobHash: hash,
          rejected,
          rejectedAt: rejected ? new Date() : null,
        },
        update: rejected ? { rejected: true, rejectedAt: new Date() } : {},
      });
    } catch (err) {
      this.logger.warn(
        `Failed to record seen job ${job.url}: ${(err as Error).message}`,
      );
    }
  }

  private async createApplicationFromJob(
    job: RawJob,
    score: number,
    reasons: string[],
    priority: number,
  ) {
    let company = await this.prisma.company.findFirst({
      where: { name: { equals: job.company, mode: 'insensitive' } },
    });
    if (!company) {
      company = await this.prisma.company.create({
        data: { name: job.company },
      });
    }

    return this.prisma.application.create({
      data: {
        companyId: company.id,
        role: job.title,
        jobUrl: job.url,
        source: job.source || null,
        jobDescription: job.description,
        location: job.location,
        isRemote: /remote|worldwide|anywhere/i.test(job.location),
        stage: 'WISHLIST',
        priority,
        matchScore: score,
        matchReasons: reasons.join('; '),
        postedAt: job.postedAt ?? null,
      },
    });
  }

  private async logScout(
    runId: string,
    job: RawJob,
    action: string,
    reason?: string,
    matchScore?: number,
  ) {
    return this.prisma.scoutLog.create({
      data: {
        scoutRunId: runId,
        companyName: job.company,
        role: job.title,
        jobUrl: job.url,
        location: job.location,
        action,
        reason,
        matchScore,
      },
    });
  }
}
