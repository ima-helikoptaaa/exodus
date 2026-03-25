import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTagDto } from './dto/create-tag.dto.js';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  findAll(category?: string) {
    return this.prisma.tag.findMany({
      where: category ? { category } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  create(dto: CreateTagDto) {
    return this.prisma.tag.create({ data: dto });
  }

  remove(id: string) {
    return this.prisma.tag.delete({ where: { id } });
  }

  assign(applicationId: string, tagId: string) {
    return this.prisma.tagsOnApplications.create({
      data: { applicationId, tagId },
    });
  }

  unassign(applicationId: string, tagId: string) {
    return this.prisma.tagsOnApplications.delete({
      where: { applicationId_tagId: { applicationId, tagId } },
    });
  }
}
