import { Controller, Get, Post, Patch, Delete, Param, Body, Res, Header } from '@nestjs/common';
import type { Response } from 'express';
import { ResumesService } from './resumes.service.js';
import { CreateResumeDto } from './dto/create-resume.dto.js';
import { UpdateResumeDto } from './dto/update-resume.dto.js';
import { SaveVersionDto } from './dto/save-version.dto.js';
import { CompileResumeDto } from './dto/compile-resume.dto.js';

@Controller('resumes')
export class ResumesController {
  constructor(private resumesService: ResumesService) {}

  @Get()
  findAll() {
    return this.resumesService.findAll();
  }

  @Post('compile')
  async compile(@Body() dto: CompileResumeDto, @Res() res: Response) {
    const pdfBuffer = await this.resumesService.compile(dto.latexSource);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length.toString(),
    });
    res.send(pdfBuffer);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resumesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateResumeDto) {
    return this.resumesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateResumeDto) {
    return this.resumesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resumesService.remove(id);
  }

  @Get(':id/versions')
  findVersions(@Param('id') id: string) {
    return this.resumesService.findVersions(id);
  }

  @Get(':id/versions/:versionId')
  findVersion(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.resumesService.findVersion(id, versionId);
  }

  @Post(':id/versions')
  saveVersion(@Param('id') id: string, @Body() dto: SaveVersionDto) {
    return this.resumesService.saveVersion(id, dto);
  }

  @Patch(':id/versions/:versionId/restore')
  restoreVersion(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.resumesService.restoreVersion(id, versionId);
  }
}
