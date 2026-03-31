import { IsString } from 'class-validator';

export class LinkResumeDto {
  @IsString()
  resumeId: string;

  @IsString()
  resumeVersionId: string;
}
