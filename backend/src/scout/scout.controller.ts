import { Controller, Post, Get, Param, Query, Logger } from '@nestjs/common';
import { ScoutService } from './scout.service.js';

@Controller('scout')
export class ScoutController {
  private readonly logger = new Logger(ScoutController.name);

  constructor(private scoutService: ScoutService) {}

  /** Full run — fetch, filter, score, and insert immediately */
  @Post('run')
  async runScout(@Query('useLlm') useLlm?: string) {
    this.logger.log('Scout run triggered via API');
    const result = await this.scoutService.runScout({
      useLlmScoring: useLlm !== 'false',
      dryRun: false,
    });
    return result;
  }

  /** Preview run — fetch, filter, score, but DON'T insert. Stores pending logs. */
  @Post('preview')
  async previewScout(@Query('useLlm') useLlm?: string) {
    this.logger.log('Scout preview triggered via API');
    const result = await this.scoutService.runScout({
      useLlmScoring: useLlm !== 'false',
      dryRun: true,
    });
    return result;
  }

  /** Confirm a pending preview — inserts all pending jobs into the tracker */
  @Post('runs/:id/confirm')
  async confirmPreview(@Param('id') id: string) {
    this.logger.log(`Confirming preview run ${id}`);
    return this.scoutService.confirmPreview(id);
  }

  /** Get the current pending preview (if any) */
  @Get('pending-preview')
  getPendingPreview() {
    return this.scoutService.getPendingPreview();
  }

  @Get('runs')
  getRuns(@Query('limit') limit?: string) {
    return this.scoutService.getRunHistory(limit ? parseInt(limit) : 20);
  }

  @Get('runs/:id/logs')
  getRunLogs(@Param('id') id: string, @Query('action') action?: string) {
    return this.scoutService.getRunLogs(id, action);
  }

  @Get('last-run')
  getLastRun() {
    return this.scoutService.getLastRun();
  }
}
