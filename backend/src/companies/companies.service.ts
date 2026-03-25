import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  findAll(search?: string) {
    return this.prisma.company.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      include: { _count: { select: { applications: true } } },
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.company.findUniqueOrThrow({
      where: { id },
      include: { applications: true },
    });
  }

  create(dto: CreateCompanyDto) {
    return this.prisma.company.create({ data: dto });
  }

  update(id: string, dto: UpdateCompanyDto) {
    return this.prisma.company.update({ where: { id }, data: dto });
  }

  findOrCreate(name: string) {
    return this.prisma.company.upsert({
      where: { id: 'none' },
      update: {},
      create: { name },
    });
  }
}
