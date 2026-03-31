import { IsString, IsOptional, MaxLength } from 'class-validator';

export class SaveVersionDto {
  @IsString()
  latexSource: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeNote?: string;
}
