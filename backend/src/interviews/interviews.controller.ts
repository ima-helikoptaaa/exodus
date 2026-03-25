import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { InterviewsService } from './interviews.service.js';
import { CreateInterviewRoundDto } from './dto/create-interview-round.dto.js';
import { UpdateInterviewRoundDto } from './dto/update-interview-round.dto.js';
import { CreatePrepTopicDto } from './dto/create-prep-topic.dto.js';
import { UpdatePrepTopicDto } from './dto/update-prep-topic.dto.js';

@Controller('interviews')
export class InterviewsController {
  constructor(private interviewsService: InterviewsService) {}

  @Get('application/:applicationId')
  findByApplication(@Param('applicationId') applicationId: string) {
    return this.interviewsService.findByApplication(applicationId);
  }

  @Get('upcoming')
  findUpcoming(@Query('days') days?: string) {
    return this.interviewsService.findUpcoming(days ? parseInt(days) : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.interviewsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateInterviewRoundDto) {
    return this.interviewsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInterviewRoundDto) {
    return this.interviewsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.interviewsService.remove(id);
  }

  @Post(':id/prep-topics')
  addPrepTopic(@Param('id') id: string, @Body() dto: CreatePrepTopicDto) {
    return this.interviewsService.addPrepTopic(id, dto);
  }

  @Patch('prep-topics/:id')
  updatePrepTopic(@Param('id') id: string, @Body() dto: UpdatePrepTopicDto) {
    return this.interviewsService.updatePrepTopic(id, dto);
  }

  @Delete('prep-topics/:id')
  removePrepTopic(@Param('id') id: string) {
    return this.interviewsService.removePrepTopic(id);
  }
}
