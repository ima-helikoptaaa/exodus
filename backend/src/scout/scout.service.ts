import { Injectable, Logger } from '@nestjs/common';
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

const SENIOR_RE =
  /\b(4|5|6|7|8|9|10)\s*\+\s*years?\b|\bsenior\b|\bstaff\b|\bprincipal\b/i;
const JUNIOR_OK_RE =
  /\b(0|1|2|3)\s*\+?\s*years?\b|\bentry\b|\bjunior\b|\bearly career\b/i;

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
    const config = loadPortalsConfig();

    const run = await this.prisma.scoutRun.create({
      data: { status: dryRun ? 'preview' : 'running' },
    });

    const existingUrls = await this.getExistingJobUrls();
    let companiesChecked = 0;
    let jobsScanned = 0;
    let jobsAdded = 0;
    let jobsSkipped = 0;
    const preview: Array<{
      company: string;
      role: string;
      location: string;
      score: number;
      url: string;
    }> = [];

    for (const company of config.companies) {
      companiesChecked++;
      let jobs: RawJob[] = [];

      try {
        jobs = await this.fetchCompanyJobs(company);
      } catch (err) {
        this.logger.warn(
          `Error fetching ${company.name}: ${(err as Error).message}`,
        );
        continue;
      }

      if (jobs.length === 0) continue;

      for (const job of jobs) {
        jobsScanned++;

        const skip = this.applyFilters(job, config, existingUrls);
        if (skip) {
          jobsSkipped++;
          await this.logScout(run.id, job, skip.action, skip.reason);
          continue;
        }

        let score = 70;
        let reasons = ['Passed title + location + experience filters'];

        if (useLlm) {
          try {
            const result = await this.aiService.scoreJob(
              job.title,
              job.description,
              job.company,
            );
            score = result.score;
            reasons = result.reasons;
          } catch (err) {
            this.logger.warn(
              `LLM scoring failed for ${job.company} — ${job.title}: ${(err as Error).message}`,
            );
          }
        }

        if (score < 50) {
          jobsSkipped++;
          await this.logScout(
            run.id,
            job,
            'skipped_score',
            `Score: ${score}`,
            score,
          );
          continue;
        }

        const priority = score >= 85 ? 3 : score >= 70 ? 2 : 1;

        if (dryRun) {
          // Store as pending — waiting for user confirmation
          await this.logScout(run.id, job, 'pending', `Score: ${score}`, score);
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
          await this.logScout(run.id, job, 'added', `Score: ${score}`, score);
          this.logger.log(
            `Added: ${job.company} — ${job.title} (score ${score})`,
          );
        }
      }
    }

    await this.prisma.scoutRun.update({
      where: { id: run.id },
      data: {
        status: dryRun ? 'pending_confirmation' : 'completed',
        finishedAt: new Date(),
        companiesChecked,
        jobsScanned,
        jobsAdded,
        jobsSkipped,
      },
    });

    return {
      runId: run.id,
      companiesChecked,
      jobsScanned,
      jobsAdded,
      jobsSkipped,
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

    // 2. Title positive match
    const titleLower = job.title.toLowerCase();
    const hasPositive = config.title_filters.positive.some((kw) =>
      titleLower.includes(kw.toLowerCase()),
    );
    if (!hasPositive) {
      return { action: 'skipped_title', reason: 'No positive keyword match' };
    }

    // 3. Title negative match
    const hasNegative = config.title_filters.negative.some((kw) =>
      titleLower.includes(kw.toLowerCase()),
    );
    if (hasNegative) {
      return { action: 'skipped_title', reason: 'Matched negative keyword' };
    }

    // 4. Location filter — must be India or remote-worldwide
    if (!this.isIndiaOrRemote(job.location)) {
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

  private isIndiaOrRemote(location: string): boolean {
    if (!location || location.trim() === '') return true; // assume remote if unknown
    const locLower = location.toLowerCase();
    return INDIA_CITIES.some((city) => locLower.includes(city));
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
        jobDescription: job.description,
        location: job.location,
        isRemote: /remote|worldwide|anywhere/i.test(job.location),
        stage: 'WISHLIST',
        priority,
        matchScore: score,
        matchReasons: reasons.join('; '),
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
