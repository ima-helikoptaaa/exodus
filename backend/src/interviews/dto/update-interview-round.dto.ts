import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateInterviewRoundDto } from './create-interview-round.dto.js';

export class UpdateInterviewRoundDto extends PartialType(
  OmitType(CreateInterviewRoundDto, ['applicationId'] as const),
) {}
