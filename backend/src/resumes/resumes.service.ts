import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateResumeDto } from './dto/create-resume.dto.js';
import { UpdateResumeDto } from './dto/update-resume.dto.js';
import { SaveVersionDto } from './dto/save-version.dto.js';
import { writeFile, readFile, rm } from 'fs/promises';
import { mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFile } from 'child_process';

const DEFAULT_LATEX = `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{hyperref}

\\begin{document}

\\begin{center}
  {\\LARGE\\textbf{Your Name}}\\\\[4pt]
  your.email@example.com $\\mid$ (123) 456-7890 $\\mid$ linkedin.com/in/yourname
\\end{center}

\\section*{Summary}
Your professional summary here.

\\section*{Experience}
\\textbf{Job Title} --- \\textbf{Company Name}\\\\
\\textit{Start Date -- End Date} --- Location
\\begin{itemize}
  \\item Achievement or responsibility
\\end{itemize}

\\section*{Skills}
\\textbf{Languages:} JavaScript, TypeScript, Python\\\\
\\textbf{Frameworks:} React, Node.js, NestJS

\\section*{Education}
\\textbf{Degree} --- \\textbf{University Name}\\\\
\\textit{Year} --- Location

\\end{document}
`;

@Injectable()
export class ResumesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.resume.findMany({
      include: {
        currentVersion: true,
        _count: { select: { versions: true, applicationResumes: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
      include: {
        currentVersion: true,
        versions: { orderBy: { versionNumber: 'desc' }, take: 20 },
        applicationResumes: {
          include: { application: { include: { company: true } } },
        },
      },
    });
    if (!resume) throw new NotFoundException('Resume not found');
    return resume;
  }

  async create(dto: CreateResumeDto) {
    const latexSource = dto.latexSource || DEFAULT_LATEX;

    const resume = await this.prisma.resume.create({
      data: { name: dto.name, description: dto.description },
    });

    const version = await this.prisma.resumeVersion.create({
      data: {
        resumeId: resume.id,
        latexSource,
        versionNumber: 1,
        changeNote: 'Initial version',
      },
    });

    return this.prisma.resume.update({
      where: { id: resume.id },
      data: { currentVersionId: version.id },
      include: { currentVersion: true },
    });
  }

  async update(id: string, dto: UpdateResumeDto) {
    await this.ensureExists(id);
    return this.prisma.resume.update({
      where: { id },
      data: dto,
      include: { currentVersion: true },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    // Unset currentVersionId first to avoid FK constraint issues
    await this.prisma.resume.update({
      where: { id },
      data: { currentVersionId: null },
    });
    return this.prisma.resume.delete({ where: { id } });
  }

  async findVersions(resumeId: string) {
    await this.ensureExists(resumeId);
    return this.prisma.resumeVersion.findMany({
      where: { resumeId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async findVersion(resumeId: string, versionId: string) {
    const version = await this.prisma.resumeVersion.findFirst({
      where: { id: versionId, resumeId },
    });
    if (!version) throw new NotFoundException('Version not found');
    return version;
  }

  async saveVersion(resumeId: string, dto: SaveVersionDto) {
    await this.ensureExists(resumeId);

    const lastVersion = await this.prisma.resumeVersion.findFirst({
      where: { resumeId },
      orderBy: { versionNumber: 'desc' },
    });

    const nextNumber = (lastVersion?.versionNumber ?? 0) + 1;

    const version = await this.prisma.resumeVersion.create({
      data: {
        resumeId,
        latexSource: dto.latexSource,
        versionNumber: nextNumber,
        changeNote: dto.changeNote,
      },
    });

    await this.prisma.resume.update({
      where: { id: resumeId },
      data: { currentVersionId: version.id },
    });

    return version;
  }

  async restoreVersion(resumeId: string, versionId: string) {
    const version = await this.findVersion(resumeId, versionId);

    const restored = await this.saveVersion(resumeId, {
      latexSource: version.latexSource,
      changeNote: `Restored from v${version.versionNumber}`,
    });

    return restored;
  }

  async compile(latexSource: string): Promise<Buffer> {
    const tmpDir = await mkdtemp(join(tmpdir(), 'latex-'));
    const texPath = join(tmpDir, 'resume.tex');
    const pdfPath = join(tmpDir, 'resume.pdf');
    const logPath = join(tmpDir, 'resume.log');

    try {
      await writeFile(texPath, latexSource, 'utf-8');

      await new Promise<void>((resolve, reject) => {
        execFile(
          'pdflatex',
          ['-interaction=nonstopmode', '-halt-on-error', '-output-directory', tmpDir, texPath],
          { timeout: 30_000 },
          async (error, stdout) => {
            if (error) {
              // pdflatex writes errors to stdout and .log file, not stderr
              let errorDetail = '';

              // Try reading the .log file for detailed errors
              try {
                const log = await readFile(logPath, 'utf-8');
                const errorLines = log
                  .split('\n')
                  .filter((l) => l.startsWith('!') || l.startsWith('l.'))
                  .slice(0, 10)
                  .join('\n');
                if (errorLines) errorDetail = errorLines;
              } catch {
                // Fall back to stdout
                const errorMatch = stdout?.match(/!(.*?)(?:\n|$)/g);
                if (errorMatch) errorDetail = errorMatch.slice(0, 5).join('\n');
              }

              reject(
                new BadRequestException(
                  errorDetail
                    ? `LaTeX compilation error:\n${errorDetail}`
                    : 'pdflatex compilation failed — check that all packages are installed',
                ),
              );
            } else {
              resolve();
            }
          },
        );
      });

      return await readFile(pdfPath);
    } finally {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private async ensureExists(id: string) {
    const resume = await this.prisma.resume.findUnique({ where: { id } });
    if (!resume) throw new NotFoundException('Resume not found');
    return resume;
  }
}
