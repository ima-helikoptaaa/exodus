import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { PrismaService } from '../prisma/prisma.service.js';
import { CustomizeResumeDto } from './dto/customize-resume.dto.js';
import {
  RESUME_SYSTEM_PROMPT,
  buildCustomizationPrompt,
} from './prompts/resume-customization.prompt.js';
import { assembleLatex } from './prompts/resume-template.js';
import type { ResumeData } from './prompts/resume-template.js';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  // Bedrock fallback config
  private readonly bedrockRegion: string;
  private readonly bedrockModel: string;
  private bedrockClient: BedrockRuntimeClient | null = null;

  constructor(private prisma: PrismaService) {
    this.baseUrl = process.env.LLM_API_BASE_URL || 'http://localhost:8000/v1';
    this.apiKey = process.env.LLM_API_KEY || '';
    this.model = process.env.LLM_MODEL || 'glm-5.2';

    this.bedrockRegion = process.env.AWS_REGION || 'us-east-1';
    // Cross-region inference profile for Claude Sonnet on Bedrock.
    // Note: the profile ID has no date/version suffix (a suffixed ID 400s).
    this.bedrockModel =
      process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-6';
  }

  /**
   * Call the primary GLM endpoint; if it's unreachable or errors, transparently
   * fall back to Claude Sonnet on Bedrock. Set BEDROCK_FALLBACK_DISABLED=true to
   * turn the fallback off (then GLM failures surface as errors).
   */
  private async callLLM(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 4096,
  ): Promise<string> {
    try {
      return await this.callGlm(systemPrompt, userPrompt, maxTokens);
    } catch (err) {
      const message = (err as Error).message;
      if (process.env.BEDROCK_FALLBACK_DISABLED === 'true') {
        throw new InternalServerErrorException(`LLM API error: ${message}`);
      }
      this.logger.warn(
        `GLM unavailable (${message}) — falling back to Bedrock Claude Sonnet`,
      );
      return this.callBedrock(systemPrompt, userPrompt, maxTokens);
    }
  }

  private async callGlm(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number,
  ): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices?.[0]?.message?.content || '';
  }

  private getBedrockClient(): BedrockRuntimeClient {
    if (!this.bedrockClient) {
      // Credentials resolved from the default AWS provider chain
      // (env vars, shared config, IAM role, SSO, …).
      this.bedrockClient = new BedrockRuntimeClient({
        region: this.bedrockRegion,
      });
    }
    return this.bedrockClient;
  }

  private async callBedrock(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number,
  ): Promise<string> {
    try {
      const command = new InvokeModelCommand({
        modelId: this.bedrockModel,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      const response = await this.getBedrockClient().send(command);
      const decoded = JSON.parse(new TextDecoder().decode(response.body)) as {
        content?: Array<{ type: string; text?: string }>;
      };
      return (
        decoded.content
          ?.filter((c) => c.type === 'text')
          .map((c) => c.text ?? '')
          .join('') || ''
      );
    } catch (err) {
      throw new InternalServerErrorException(
        `Bedrock fallback failed: ${(err as Error).message}`,
      );
    }
  }

  async customizeResume(dto: CustomizeResumeDto) {
    const profile = await this.prisma.masterProfile.findFirst();
    if (!profile) {
      throw new InternalServerErrorException(
        'Master profile not found. Please fill in your profile first.',
      );
    }

    let baseLatex: string | undefined;
    if (dto.baseResumeId) {
      const resume = await this.prisma.resume.findUnique({
        where: { id: dto.baseResumeId },
        include: { currentVersion: true },
      });
      baseLatex = resume?.currentVersion?.latexSource;
    }

    const userPrompt = buildCustomizationPrompt({
      sections: profile.sections as Record<string, string>,
      jobDescription: dto.jobDescription,
      baseLatex,
    });

    const text = await this.callLLM(RESUME_SYSTEM_PROMPT, userPrompt, 4096);

    let parsed: { reasoning: string; resume: ResumeData };
    try {
      const cleaned = text
        .replace(/^```(?:json)?\s*/m, '')
        .replace(/\s*```\s*$/m, '')
        .trim();
      parsed = JSON.parse(cleaned) as { reasoning: string; resume: ResumeData };
    } catch {
      throw new InternalServerErrorException(
        `AI returned invalid JSON. Raw response: ${text.slice(0, 500)}`,
      );
    }

    const latexSource = assembleLatex(parsed.resume);
    const reasoning = parsed.reasoning || '';

    return { latexSource, reasoning };
  }

  async scoreJob(
    title: string,
    description: string,
    companyName: string,
    softSignals: string[] = [],
  ): Promise<{ score: number; reasons: string[]; fallback: boolean }> {
    const profile = await this.prisma.masterProfile.findFirst();
    const profileSummary = profile
      ? this.extractProfileSummary(profile.sections as Record<string, string>)
      : 'Software engineer with 3 years of experience.';

    const systemPrompt =
      'You are a job match scorer. Return ONLY valid JSON — no markdown, no code fences.';

    const signalsBlock = softSignals.length
      ? `\nSIGNALS TO WEIGH (not disqualifiers — judge from the full JD):\n- ${softSignals.join('\n- ')}\n`
      : '';

    const userPrompt = `Score how well this job matches the candidate.

CANDIDATE PROFILE SUMMARY:
${profileSummary}

JOB:
Company: ${companyName}
Title: ${title}
Description (truncated): ${description.slice(0, 3000)}
${signalsBlock}
Score 0-100 based on:
- Skills overlap (40%): Does the JD ask for skills the candidate has?
- Experience level match (30%): Does it ask for 0-3 years? (candidate has ~3 YOE)
- Role fit (20%): Is it backend/fullstack/platform/infra? (not frontend-only, not management)
- Location (10%): India-based or remote-friendly for India?

Return ONLY valid JSON:
{"score": <0-100>, "reasons": ["reason1", "reason2", "reason3"]}`;

    try {
      // Reasoning models (e.g. GLM) can emit chain-of-thought before the JSON,
      // so give a generous budget and extract the JSON object rather than
      // assuming the whole response is JSON.
      const text = await this.callLLM(systemPrompt, userPrompt, 1200);
      const parsed = this.extractScoreJson(text);
      if (!parsed) {
        throw new Error(`no parseable JSON in: ${text.slice(0, 120)}`);
      }
      return {
        score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
        reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
        fallback: false,
      };
    } catch (err) {
      // Don't throw — return a flagged fallback so the caller can track per-run
      // scoring failures and detect a sustained LLM outage without aborting.
      this.logger.warn(
        `LLM scoring failed for ${companyName} — ${title}: ${(err as Error).message}`,
      );
      return {
        score: 70,
        reasons: ['LLM scoring failed — default pass'],
        fallback: true,
      };
    }
  }

  /** Pull the last balanced {...} object out of an LLM response and parse it. */
  private extractScoreJson(
    text: string,
  ): { score: number; reasons: string[] } | null {
    const stripped = text
      .replace(/```(?:json)?/gi, '')
      .replace(/```/g, '')
      .trim();
    // Try the whole thing first, then the last brace-delimited span.
    const candidates = [stripped];
    const first = stripped.indexOf('{');
    const last = stripped.lastIndexOf('}');
    if (first !== -1 && last > first) {
      candidates.push(stripped.slice(first, last + 1));
    }
    for (const c of candidates) {
      try {
        const obj = JSON.parse(c) as { score: number; reasons: string[] };
        if (typeof obj.score === 'number' || 'score' in obj) return obj;
      } catch {
        /* try next candidate */
      }
    }
    return null;
  }

  private extractProfileSummary(sections: Record<string, string>): string {
    const summary =
      sections['SUMMARY'] || sections['PROFESSIONAL_SUMMARY'] || '';
    const experience =
      sections['EXPERIENCE'] || sections['WORK_EXPERIENCE'] || '';
    const skills = sections['SKILLS'] || sections['TECHNICAL_SKILLS'] || '';

    let result = '';
    if (summary) result += summary + '\n\n';
    if (skills) result += `Skills: ${skills.slice(0, 500)}\n\n`;
    if (experience)
      result += `Experience (truncated): ${experience.slice(0, 1500)}`;
    return result || 'Software engineer, 3 years of experience.';
  }
}
