import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateInterviewRoundDto } from './dto/create-interview-round.dto.js';
import { UpdateInterviewRoundDto } from './dto/update-interview-round.dto.js';
import { CreatePrepTopicDto } from './dto/create-prep-topic.dto.js';
import { UpdatePrepTopicDto } from './dto/update-prep-topic.dto.js';

@Injectable()
export class InterviewsService {
  constructor(private prisma: PrismaService) {}

  findByApplication(applicationId: string) {
    return this.prisma.interviewRound.findMany({
      where: { applicationId },
      include: { prepTopics: true },
      orderBy: { roundNumber: 'asc' },
    });
  }

  findUpcoming(days = 7) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return this.prisma.interviewRound.findMany({
      where: {
        status: 'UPCOMING',
        scheduledAt: { gte: now, lte: future },
      },
      include: {
        application: { include: { company: true } },
        prepTopics: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.interviewRound.findUniqueOrThrow({
      where: { id },
      include: { prepTopics: true, application: { include: { company: true } } },
    });
  }

  create(dto: CreateInterviewRoundDto) {
    const { scheduledAt, ...rest } = dto;
    return this.prisma.interviewRound.create({
      data: {
        ...rest,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      },
      include: { prepTopics: true },
    });
  }

  update(id: string, dto: UpdateInterviewRoundDto) {
    const { scheduledAt, ...rest } = dto as any;
    const data: any = { ...rest };
    if (scheduledAt) data.scheduledAt = new Date(scheduledAt);

    return this.prisma.interviewRound.update({
      where: { id },
      data,
      include: { prepTopics: true },
    });
  }

  remove(id: string) {
    return this.prisma.interviewRound.delete({ where: { id } });
  }

  addPrepTopic(interviewRoundId: string, dto: CreatePrepTopicDto) {
    return this.prisma.prepTopic.create({
      data: { ...dto, interviewRoundId },
    });
  }

  updatePrepTopic(id: string, dto: UpdatePrepTopicDto) {
    return this.prisma.prepTopic.update({ where: { id }, data: dto });
  }

  removePrepTopic(id: string) {
    return this.prisma.prepTopic.delete({ where: { id } });
  }
}
