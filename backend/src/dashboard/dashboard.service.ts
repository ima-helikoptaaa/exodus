import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const total = await this.prisma.application.count();
    const byStage = await this.prisma.application.groupBy({
      by: ['stage'],
      _count: true,
    });

    const applied = byStage
      .filter((s) => s.stage !== 'WISHLIST')
      .reduce((sum, s) => sum + s._count, 0);
    const responded = byStage
      .filter((s) =>
        !['WISHLIST', 'APPLIED'].includes(s.stage),
      )
      .reduce((sum, s) => sum + s._count, 0);

    const responseRate = applied > 0 ? Math.round((responded / applied) * 100) : 0;
    const offers = byStage.find((s) => s.stage === 'OFFER')?._count ?? 0;

    return { total, byStage, responseRate, offers };
  }

  async getDailyApplications(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const grouped: { date: Date; count: bigint }[] = await this.prisma.$queryRaw`
      SELECT DATE("appliedDate") as date, COUNT(*)::bigint as count
      FROM applications
      WHERE "appliedDate" >= ${since}
      GROUP BY DATE("appliedDate")
      ORDER BY date
    `;

    const dayMap = new Map<string, number>();
    for (const row of grouped) {
      dayMap.set(new Date(row.date).toISOString().slice(0, 10), Number(row.count));
    }

    const result: { date: string; count: number }[] = [];
    const current = new Date(since);
    const today = new Date();
    while (current <= today) {
      const key = current.toISOString().slice(0, 10);
      result.push({ date: key, count: dayMap.get(key) ?? 0 });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  async getUpcomingInterviews(days = 7) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return this.prisma.interviewRound.findMany({
      where: {
        status: 'UPCOMING',
        scheduledAt: { gte: now, lte: future },
      },
      include: { application: { include: { company: true } } },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async getFollowUps() {
    const now = new Date();
    return this.prisma.application.findMany({
      where: {
        followUpDate: { lte: now },
        stage: { notIn: ['REJECTED', 'WITHDRAWN', 'OFFER'] },
      },
      include: { company: true },
      orderBy: { followUpDate: 'asc' },
    });
  }

  async getActivityHeatmap(months = 6) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    since.setDate(1);

    const grouped: { date: Date; count: bigint }[] = await this.prisma.$queryRaw`
      SELECT DATE("appliedDate") as date, COUNT(*)::bigint as count
      FROM applications
      WHERE "appliedDate" >= ${since}
      GROUP BY DATE("appliedDate")
      ORDER BY date
    `;

    const dayMap = new Map<string, number>();
    for (const row of grouped) {
      dayMap.set(new Date(row.date).toISOString().slice(0, 10), Number(row.count));
    }

    const result: { date: string; count: number }[] = [];
    const current = new Date(since);
    const today = new Date();
    while (current <= today) {
      const key = current.toISOString().slice(0, 10);
      result.push({ date: key, count: dayMap.get(key) ?? 0 });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  async getRecentInterviewInsights() {
    const rounds = await this.prisma.interviewRound.findMany({
      where: {
        status: 'COMPLETED',
        reflection: { not: null },
      },
      include: {
        application: { include: { company: true } },
        prepTopics: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    return rounds.map((r) => ({
      id: r.id,
      companyName: r.application?.company?.name,
      applicationId: r.applicationId,
      role: r.application?.role,
      type: r.type,
      roundNumber: r.roundNumber,
      difficulty: r.difficulty,
      reflection: r.reflection,
      scheduledAt: r.scheduledAt,
      prepTopics: r.prepTopics.map((t) => ({
        title: t.title,
        completed: t.completed,
      })),
    }));
  }
}
