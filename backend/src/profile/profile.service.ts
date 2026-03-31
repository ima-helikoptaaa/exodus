import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

const DEFAULT_SECTIONS: Record<string, string> = {
  SUMMARY: '',
  EXPERIENCE: '',
  SKILLS: '',
  PROJECTS: '',
  EDUCATION: '',
  ACHIEVEMENTS: '',
  CERTIFICATIONS: '',
};

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async get() {
    const existing = await this.prisma.masterProfile.findFirst();
    if (existing) return existing;
    return this.prisma.masterProfile.create({
      data: { sections: DEFAULT_SECTIONS },
    });
  }

  async update(dto: UpdateProfileDto) {
    const profile = await this.get();
    return this.prisma.masterProfile.update({
      where: { id: profile.id },
      data: { sections: dto.sections },
    });
  }
}
