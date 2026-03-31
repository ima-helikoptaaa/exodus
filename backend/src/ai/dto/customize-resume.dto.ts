import { IsString, IsOptional } from 'class-validator';

export class CustomizeResumeDto {
  @IsString()
  jobDescription: string;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsString()
  baseResumeId?: string;
}
