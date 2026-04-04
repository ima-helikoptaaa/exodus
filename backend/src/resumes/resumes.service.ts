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

const DEFAULT_LATEX = `\\documentclass[10pt]{article}
\\usepackage[T1]{fontenc}
\\usepackage[top=0.3in, bottom=0.3in, left=0.4in, right=0.4in]{geometry}
\\usepackage[hidelinks]{hyperref}
\\input{glyphtounicode}
\\pdfgentounicode=1
\\raggedright
\\setlength{\\parskip}{0pt}
\\setlength{\\parindent}{0pt}
\\setlength{\\tabcolsep}{0in}
\\setlength{\\topsep}{0pt}
\\setlength{\\partopsep}{0pt}
\\setlength{\\leftmargini}{0.15in}
\\renewcommand{\\baselinestretch}{1.0}
\\pagestyle{empty}

\\newcommand{\\ressection}[1]{%
  \\vspace{2pt}%
  {\\large\\scshape\\raggedright #1}\\\\[-5pt]%
  \\rule{\\textwidth}{0.4pt}\\vspace{-7pt}%
}

\\begin{document}

\\begin{center}
  {\\LARGE\\textbf{Your Name}}\\\\[2pt]
  \\small \\href{mailto:you@email.com}{you@email.com} $\\mid$ (123) 456-7890 $\\mid$ \\href{https://linkedin.com/in/you}{linkedin.com/in/you} $\\mid$ \\href{https://github.com/you}{github.com/you}
\\end{center}
\\vspace{-4pt}

\\ressection{Experience}

\\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}
  \\textbf{Job Title} & Jan 2024 -- Present \\\\
  \\textit{\\small Company Name} & \\textit{\\small City, Country} \\\\
\\end{tabular*}
\\vspace{-6pt}
\\begin{itemize}
  \\setlength{\\itemsep}{2pt}\\setlength{\\parsep}{0pt}\\setlength{\\topsep}{0pt}
  \\item \\small Achievement or responsibility with quantified impact
\\end{itemize}

\\ressection{Technical Skills}
\\small
\\textbf{Languages:} JavaScript, TypeScript, Python \\\\
\\textbf{Frameworks:} React, Node.js, NestJS \\\\
\\textbf{Tools:} Docker, Git, AWS

\\ressection{Education}

\\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}
  \\textbf{Degree --- University Name} & 2019 -- 2023 \\\\
\\end{tabular*}

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
