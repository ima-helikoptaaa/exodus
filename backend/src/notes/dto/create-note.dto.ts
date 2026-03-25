import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateNoteDto {
  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsString()
  interviewRoundId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;
}
