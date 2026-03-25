import { IsString, IsOptional, IsInt, IsEnum, IsDateString, IsUrl, Min, Max, MaxLength } from 'class-validator';
import { InterviewType, InterviewStatus } from '@prisma/client';

export class CreateInterviewRoundDto {
  @IsString()
  applicationId: string;

  @IsInt()
  @Min(1)
  roundNumber: number;

  @IsEnum(InterviewType)
  type: InterviewType;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480)
  durationMin?: number;

  @IsOptional()
  @IsEnum(InterviewStatus)
  status?: InterviewStatus;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  prepNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  reflection?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  difficulty?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  interviewerName?: string;

  @IsOptional()
  @IsUrl({}, { message: 'meetingLink must be a valid URL' })
  meetingLink?: string;
}
