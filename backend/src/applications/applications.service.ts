import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PipelineStage } from '@prisma/client';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationDto } from './dto/update-application.dto.js';

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    stage?: PipelineStage;
    search?: string;
    tagIds?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { stage, search, tagIds, sortBy = 'updatedAt', sortOrder = 'desc' } = params;

    const where: any = {};
    if (stage) where.stage = stage;
    if (search) {
      where.OR = [
        { role: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (tagIds?.length) {
      where.tags = { some: { tagId: { in: tagIds } } };
    }

    return this.prisma.application.findMany({
      where,
      include: {
        company: true,
        tags: { include: { tag: true } },
        interviewRounds: { orderBy: { scheduledAt: 'asc' }, where: { status: 'UPCOMING' }, take: 1 },
        _count: { select: { interviewRounds: true, notes: true, contacts: true } },
      },
      orderBy: { [sortBy]: sortOrder },
    });
  }

  async findOne(id: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: {
        company: true,
        tags: { include: { tag: true } },
        interviewRounds: {
          orderBy: { roundNumber: 'asc' },
          include: { prepTopics: true },
        },
        contacts: true,
        notes: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async create(dto: CreateApplicationDto) {
    const { companyId, companyName, appliedDate, followUpDate, deadlineDate, ...rest } = dto;

    let resolvedCompanyId = companyId;
    if (!resolvedCompanyId && companyName) {
      const existing = await this.prisma.company.findFirst({
        where: { name: { equals: companyName, mode: 'insensitive' } },
      });
      if (existing) {
        resolvedCompanyId = existing.id;
      } else {
        const created = await this.prisma.company.create({ data: { name: companyName } });
        resolvedCompanyId = created.id;
      }
    }

    if (!resolvedCompanyId) {
      throw new NotFoundException('Either companyId or companyName is required');
    }

    return this.prisma.application.create({
      data: {
        ...rest,
        companyId: resolvedCompanyId,
        appliedDate: appliedDate ? new Date(appliedDate) : undefined,
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
        deadlineDate: deadlineDate ? new Date(deadlineDate) : undefined,
      },
      include: { company: true, tags: { include: { tag: true } } },
    });
  }

  async update(id: string, dto: UpdateApplicationDto) {
    const { companyId, companyName, appliedDate, followUpDate, deadlineDate, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };

    if (companyName) {
      const existing = await this.prisma.company.findFirst({
        where: { name: { equals: companyName, mode: 'insensitive' } },
      });
      data.companyId = existing
        ? existing.id
        : (await this.prisma.company.create({ data: { name: companyName } })).id;
    } else if (companyId) {
      data.companyId = companyId;
    }

    if (appliedDate !== undefined) data.appliedDate = appliedDate ? new Date(appliedDate) : null;
    if (followUpDate !== undefined) data.followUpDate = followUpDate ? new Date(followUpDate) : null;
    if (deadlineDate !== undefined) data.deadlineDate = deadlineDate ? new Date(deadlineDate) : null;

    return this.prisma.application.update({
      where: { id },
      data,
      include: { company: true, tags: { include: { tag: true } } },
    });
  }

  async updateStage(id: string, stage: PipelineStage) {
    const data: Record<string, unknown> = { stage };
    if (stage === PipelineStage.APPLIED) {
      const app = await this.prisma.application.findUnique({ where: { id } });
      if (app && !app.appliedDate) {
        data.appliedDate = new Date();
      }
    }
    return this.prisma.application.update({
      where: { id },
      data,
      include: { company: true, tags: { include: { tag: true } } },
    });
  }

  async remove(id: string) {
    return this.prisma.application.delete({ where: { id } });
  }
}
