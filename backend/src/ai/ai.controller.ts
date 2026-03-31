import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { CustomizeResumeDto } from './dto/customize-resume.dto.js';

@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('customize-resume')
  customizeResume(@Body() dto: CustomizeResumeDto) {
    return this.aiService.customizeResume(dto);
  }
}
