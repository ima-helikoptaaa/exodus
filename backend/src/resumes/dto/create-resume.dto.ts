import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateResumeDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  latexSource?: string;
}
