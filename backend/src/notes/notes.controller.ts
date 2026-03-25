import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { NotesService } from './notes.service.js';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { UpdateNoteDto } from './dto/update-note.dto.js';

@Controller('notes')
export class NotesController {
  constructor(private notesService: NotesService) {}

  @Get()
  findAll(
    @Query('applicationId') applicationId?: string,
    @Query('interviewRoundId') interviewRoundId?: string,
  ) {
    return this.notesService.findAll(applicationId, interviewRoundId);
  }

  @Post()
  create(@Body() dto: CreateNoteDto) {
    return this.notesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNoteDto) {
    return this.notesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notesService.remove(id);
  }
}
