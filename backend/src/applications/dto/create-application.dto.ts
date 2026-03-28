import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsDateString, IsUrl, Min, Max, MaxLength } from 'class-validator';
import { PipelineStage } from '@prisma/client';

export class CreateApplicationDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @IsString()
  @MaxLength(200)
  role: string;

  @IsOptional()
  @IsUrl({}, { message: 'jobUrl must be a valid URL' })
  jobUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  jobDescription?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  salaryMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  salaryMax?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  salaryCurrency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @IsOptional()
  @IsEnum(PipelineStage)
  stage?: PipelineStage;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  priority?: number;

  @IsOptional()
  @IsDateString()
  appliedDate?: string;

  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @IsOptional()
  @IsDateString()
  deadlineDate?: string;
}
