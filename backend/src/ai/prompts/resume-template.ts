// ─── Types ───

export interface ResumeData {
  name: string;
  contact: string[]; // e.g. ["email@example.com", "+1-234-567-8900", "linkedin.com/in/you"]
  experience: ExperienceEntry[];
  skills: SkillCategory[];
  education: EducationEntry[];
  achievements?: string[]; // optional one-liner achievements
}

export interface ExperienceEntry {
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export interface SkillCategory {
  category: string;
  items: string;
}

export interface EducationEntry {
  degree: string;
  institution: string;
  location: string;
  dates: string;
  details?: string; // e.g. "GPA: 3.8 | Relevant coursework: ..."
}

// ─── LaTeX Escaping ───

function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    // Restore intentional LaTeX commands the AI might use
    .replace(/\\textbackslash\{\}textasciitilde\{\}/g, '\\textasciitilde{}')
    .replace(/\\textbackslash\{\}textbf/g, '\\textbf')
    .replace(/\\textbackslash\{\}textit/g, '\\textit')
    .replace(/\\textbackslash\{\}href/g, '\\href')
    .replace(/\\textbackslash\{\}textasciicircum\{\}/g, '\\textasciicircum{}');
}

// ─── Template Skeleton ───

const PREAMBLE = `\\documentclass[10pt]{article}
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

% Section heading: small caps + horizontal rule
\\newcommand{\\ressection}[1]{%
  \\vspace{2pt}%
  {\\large\\scshape\\raggedright #1}\\\\[-5pt]%
  \\rule{\\textwidth}{0.4pt}\\vspace{-7pt}%
}`;

// ─── Section Builders ───

function buildHeader(data: ResumeData): string {
  const name = escapeLatex(data.name);
  const contactParts = data.contact.map((c) => {
    const escaped = escapeLatex(c);
    // Auto-link emails
    if (c.includes('@')) {
      return `\\href{mailto:${c}}{${escaped}}`;
    }
    // Auto-link URLs
    if (c.match(/^https?:\/\//) || c.includes('linkedin.com') || c.includes('github.com') || c.includes('kaggle.com')) {
      const url = c.startsWith('http') ? c : `https://${c}`;
      return `\\href{${url}}{${escaped}}`;
    }
    return escaped;
  });

  return `\\begin{center}
  {\\LARGE\\textbf{${name}}}\\\\[2pt]
  \\small ${contactParts.join(' $\\mid$ ')}
\\end{center}
\\vspace{-4pt}`;
}

function buildExperience(entries: ExperienceEntry[]): string {
  if (entries.length === 0) return '';

  const blocks = entries.map((entry, i) => {
    const title = escapeLatex(entry.title);
    const company = escapeLatex(entry.company);
    const location = escapeLatex(entry.location);
    const startDate = escapeLatex(entry.startDate);
    const endDate = escapeLatex(entry.endDate);

    const bullets = entry.bullets
      .map((b) => `  \\item \\small ${escapeLatex(b)}`)
      .join('\n');

    const spacing = i > 0 ? '\\vspace{-2pt}\n' : '';

    return `${spacing}\\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}
  \\textbf{${title}} & ${startDate} -- ${endDate} \\\\
  \\textit{\\small ${company}} & \\textit{\\small ${location}} \\\\
\\end{tabular*}
\\vspace{-6pt}
\\begin{itemize}
  \\setlength{\\itemsep}{2pt}\\setlength{\\parsep}{0pt}\\setlength{\\topsep}{0pt}
${bullets}
\\end{itemize}`;
  });

  return `\\ressection{Experience}\n\n${blocks.join('\n\n')}`;
}

function buildSkills(categories: SkillCategory[]): string {
  if (categories.length === 0) return '';

  const lines = categories
    .map((s) => `\\textbf{${escapeLatex(s.category)}:} ${escapeLatex(s.items)}`)
    .join(' \\\\\n');

  return `\\ressection{Technical Skills}\n\\small\n${lines}`;
}

function buildEducation(entries: EducationEntry[]): string {
  if (entries.length === 0) return '';

  const blocks = entries.map((entry) => {
    const degree = escapeLatex(entry.degree);
    const institution = escapeLatex(entry.institution);
    const location = escapeLatex(entry.location);
    const dates = escapeLatex(entry.dates);

    let block = `\\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}
  \\textbf{${degree}} --- ${institution} & ${dates} \\\\
\\end{tabular*}`;

    if (entry.details) {
      block += `\n\\small ${escapeLatex(entry.details)}`;
    }

    return block;
  });

  return `\\ressection{Education}\n\n${blocks.join('\n\\vspace{-2pt}\n')}`;
}

function buildAchievements(achievements?: string[]): string {
  if (!achievements || achievements.length === 0) return '';

  const items = achievements.map((a) => escapeLatex(a)).join(' $\\mid$ ');
  return `\\ressection{Achievements}\n\\small ${items}`;
}

// ─── Main Assembler ───

export function assembleLatex(data: ResumeData): string {
  const parts = [
    PREAMBLE,
    '',
    '\\begin{document}',
    '',
    buildHeader(data),
    buildExperience(data.experience),
    buildSkills(data.skills),
    buildEducation(data.education),
    buildAchievements(data.achievements),
    '',
    '\\end{document}',
  ];

  // Filter out empty strings from optional sections, collapse double blank lines
  return parts
    .filter((s) => s !== '')
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n');
}
