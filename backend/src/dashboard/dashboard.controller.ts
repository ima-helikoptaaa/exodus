import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('daily')
  getDaily(@Query('days') days?: string) {
    return this.dashboardService.getDailyApplications(days ? parseInt(days) : undefined);
  }

  @Get('upcoming-interviews')
  getUpcomingInterviews(@Query('days') days?: string) {
    return this.dashboardService.getUpcomingInterviews(days ? parseInt(days) : undefined);
  }

  @Get('follow-ups')
  getFollowUps() {
    return this.dashboardService.getFollowUps();
  }

  @Get('activity-heatmap')
  getActivityHeatmap(@Query('months') months?: string) {
    return this.dashboardService.getActivityHeatmap(months ? parseInt(months) : undefined);
  }

  @Get('interview-insights')
  getInterviewInsights() {
    return this.dashboardService.getRecentInterviewInsights();
  }
}
