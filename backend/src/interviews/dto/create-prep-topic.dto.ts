import { IsString, IsOptional, IsBoolean, IsUrl, MaxLength } from 'class-validator';

export class CreatePrepTopicDto {
  @IsString()
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsUrl({}, { message: 'resourceUrl must be a valid URL' })
  resourceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
