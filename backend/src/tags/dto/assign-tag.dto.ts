import { IsString } from 'class-validator';

export class AssignTagDto {
  @IsString()
  applicationId: string;

  @IsString()
  tagId: string;
}
