import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateResumeDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
