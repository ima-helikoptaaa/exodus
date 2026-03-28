import { IsString, IsOptional, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class CreateNoteDto {
  @ValidateIf((o) => !o.interviewRoundId)
  @IsString({ message: 'Either applicationId or interviewRoundId is required' })
  applicationId?: string;

  @ValidateIf((o) => !o.applicationId)
  @IsString({ message: 'Either applicationId or interviewRoundId is required' })
  interviewRoundId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;
}
