import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { UpdateNoteDto } from './dto/update-note.dto.js';

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}

  findAll(applicationId?: string, interviewRoundId?: string) {
    const where: any = {};
    if (applicationId) where.applicationId = applicationId;
    if (interviewRoundId) where.interviewRoundId = interviewRoundId;
    return this.prisma.note.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateNoteDto) {
    return this.prisma.note.create({ data: dto });
  }

  update(id: string, dto: UpdateNoteDto) {
    return this.prisma.note.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.note.delete({ where: { id } });
  }
}
