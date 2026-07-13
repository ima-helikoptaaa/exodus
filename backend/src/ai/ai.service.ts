import { Injectable, InternalServerErrorException } from '@nestjs/common';
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
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private prisma: PrismaService) {
    this.baseUrl = process.env.LLM_API_BASE_URL || 'http://localhost:8000/v1';
    this.apiKey = process.env.LLM_API_KEY || '';
    this.model = process.env.LLM_MODEL || 'glm-5.2';
  }

  private async callLLM(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 4096,
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
      throw new InternalServerErrorException(
        `LLM API error ${res.status}: ${body.slice(0, 300)}`,
      );
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices?.[0]?.message?.content || '';
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
  ): Promise<{ score: number; reasons: string[] }> {
    const profile = await this.prisma.masterProfile.findFirst();
    const profileSummary = profile
      ? this.extractProfileSummary(profile.sections as Record<string, string>)
      : 'Software engineer with 3 years of experience.';

    const systemPrompt =
      'You are a job match scorer. Return ONLY valid JSON — no markdown, no code fences.';

    const userPrompt = `Score how well this job matches the candidate.

CANDIDATE PROFILE SUMMARY:
${profileSummary}

JOB:
Company: ${companyName}
Title: ${title}
Description (truncated): ${description.slice(0, 3000)}

Score 0-100 based on:
- Skills overlap (40%): Does the JD ask for skills the candidate has?
- Experience level match (30%): Does it ask for 0-3 years? (candidate has ~3 YOE)
- Role fit (20%): Is it backend/fullstack/platform/infra? (not frontend-only, not management)
- Location (10%): India-based or remote-friendly for India?

Return ONLY valid JSON:
{"score": <0-100>, "reasons": ["reason1", "reason2", "reason3"]}`;

    try {
      const text = await this.callLLM(systemPrompt, userPrompt, 500);
      const cleaned = text
        .replace(/^```(?:json)?\s*/m, '')
        .replace(/\s*```\s*$/m, '')
        .trim();
      const parsed = JSON.parse(cleaned) as {
        score: number;
        reasons: string[];
      };
      return {
        score: Math.max(0, Math.min(100, parsed.score)),
        reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
      };
    } catch (err) {
      console.warn('LLM scoring failed:', (err as Error).message);
      return { score: 70, reasons: ['LLM scoring failed — default pass'] };
    }
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
