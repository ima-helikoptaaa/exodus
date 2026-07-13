import { Module } from '@nestjs/common';
import { ScoutService } from './scout.service.js';
import { ScoutController } from './scout.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AiModule } from '../ai/ai.module.js';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [ScoutController],
  providers: [ScoutService],
})
export class ScoutModule {}
