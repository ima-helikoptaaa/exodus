import { IsString } from 'class-validator';

export class CompileResumeDto {
  @IsString()
  latexSource: string;
}
