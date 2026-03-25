import { IsEnum } from 'class-validator';
import { PipelineStage } from '@prisma/client';

export class UpdateStageDto {
  @IsEnum(PipelineStage)
  stage: PipelineStage;
}
