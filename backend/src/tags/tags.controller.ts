import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { TagsService } from './tags.service.js';
import { CreateTagDto } from './dto/create-tag.dto.js';
import { AssignTagDto } from './dto/assign-tag.dto.js';

@Controller('tags')
export class TagsController {
  constructor(private tagsService: TagsService) {}

  @Get()
  findAll(@Query('category') category?: string) {
    return this.tagsService.findAll(category);
  }

  @Post()
  create(@Body() dto: CreateTagDto) {
    return this.tagsService.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tagsService.remove(id);
  }

  @Post('assign')
  assign(@Body() dto: AssignTagDto) {
    return this.tagsService.assign(dto.applicationId, dto.tagId);
  }

  @Delete('assign/:applicationId/:tagId')
  unassign(@Param('applicationId') applicationId: string, @Param('tagId') tagId: string) {
    return this.tagsService.unassign(applicationId, tagId);
  }
}
