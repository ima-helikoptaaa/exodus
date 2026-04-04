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
  private client: any;

  constructor(private prisma: PrismaService) {
    this.initClient();
  }

  private async initClient() {
    try {
      const { AnthropicBedrock } = await import(
        '@anthropic-ai/bedrock-sdk'
      );
      this.client = new AnthropicBedrock({
        awsRegion: process.env.AWS_REGION || 'us-east-1',
      });
    } catch {
      console.warn(
        'Bedrock SDK not available. AI features will be disabled.',
      );
    }
  }

  async customizeResume(dto: CustomizeResumeDto) {
    if (!this.client) {
      throw new InternalServerErrorException(
        'AI service is not configured. Ensure @anthropic-ai/bedrock-sdk is installed and AWS credentials are set.',
      );
    }

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

    const response = await this.client.messages.create({
      model: 'us.anthropic.claude-opus-4-6-v1',
      max_tokens: 4096,
      system: RESUME_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text =
      response.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('') || '';

    // Parse the JSON response
    let parsed: { reasoning: string; resume: ResumeData };
    try {
      // Strip markdown code fences if the model wrapped it anyway
      const cleaned = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new InternalServerErrorException(
        `AI returned invalid JSON. Raw response: ${text.slice(0, 500)}`,
      );
    }

    const latexSource = assembleLatex(parsed.resume);
    const reasoning = parsed.reasoning || '';

    return { latexSource, reasoning };
  }
}
