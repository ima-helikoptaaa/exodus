import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { UpdateContactDto } from './dto/update-contact.dto.js';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  findAll(applicationId?: string, search?: string) {
    const where: any = {};
    if (applicationId) where.applicationId = applicationId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.contact.findMany({
      where,
      include: { application: { include: { company: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.contact.findUniqueOrThrow({
      where: { id },
      include: { application: { include: { company: true } } },
    });
  }

  create(dto: CreateContactDto) {
    const { lastContactedAt, ...rest } = dto;
    return this.prisma.contact.create({
      data: {
        ...rest,
        lastContactedAt: lastContactedAt ? new Date(lastContactedAt) : undefined,
      },
    });
  }

  update(id: string, dto: UpdateContactDto) {
    const { lastContactedAt, ...rest } = dto as any;
    const data: any = { ...rest };
    if (lastContactedAt) data.lastContactedAt = new Date(lastContactedAt);
    return this.prisma.contact.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.contact.delete({ where: { id } });
  }
}
