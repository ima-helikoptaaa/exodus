import { IsObject } from 'class-validator';

export class UpdateProfileDto {
  @IsObject()
  sections: Record<string, string>;
}
