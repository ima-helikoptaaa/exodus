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

function buildPreamble(data: ResumeData): string {
  const name = escapeLatex(data.name);
  return `\\documentclass[10pt, letterpaper]{article}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{microtype}
\\usepackage[top=0.3in, bottom=0.3in, left=0.4in, right=0.4in]{geometry}
\\usepackage[hidelinks]{hyperref}
\\usepackage{enumitem}
\\input{glyphtounicode}
\\pdfgentounicode=1

% PDF metadata for ATS parsing
\\hypersetup{
  pdftitle={${name} - Resume},
  pdfauthor={${name}},
  pdfsubject={Resume},
  pdfkeywords={resume, curriculum vitae}
}

\\raggedright
\\setlength{\\parskip}{0pt}
\\setlength{\\parindent}{0pt}
\\setlength{\\tabcolsep}{0in}
\\setlength{\\topsep}{0pt}
\\setlength{\\partopsep}{0pt}
\\setlength{\\leftmargini}{0.15in}
\\renewcommand{\\baselinestretch}{1.0}
\\setlist[itemize]{itemsep=0pt, parsep=0pt, topsep=0pt}
\\pagestyle{empty}

% Section heading: small caps + horizontal rule
\\newcommand{\\ressection}[1]{%
  \\vspace{4pt}%
  {\\large\\scshape\\raggedright #1}\\\\[-6pt]%
  \\rule{\\textwidth}{0.4pt}\\vspace{-4pt}%
}`;
}

// ─── Shared Helpers ───

/** Two-line header: bold primary + dates on row 1, italic secondary + italic location on row 2 */
function twoLineHeader(primary: string, dates: string, secondary: string, location: string): string {
  return `\\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}
  \\textbf{${primary}} & ${dates} \\\\
  \\textit{${secondary}} & \\textit{${location}} \\\\
\\end{tabular*}`;
}

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
  ${contactParts.join(' $\\mid$ ')}
\\end{center}
\\vspace{-6pt}`;
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
      .map((b) => `  \\item ${escapeLatex(b)}`)
      .join('\n');

    const spacing = i > 0 ? '\\vspace{2pt}\n' : '';

    return `${spacing}${twoLineHeader(title, `${startDate} -- ${endDate}`, company, location)}
\\vspace{-4pt}
\\begin{itemize}
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

  return `\\ressection{Technical Skills}\n${lines}`;
}

function buildEducation(entries: EducationEntry[]): string {
  if (entries.length === 0) return '';

  const blocks = entries.map((entry) => {
    const degree = escapeLatex(entry.degree);
    const institution = escapeLatex(entry.institution);
    const location = escapeLatex(entry.location);
    const dates = escapeLatex(entry.dates);

    // Two-line format like experience: degree+dates on line 1, institution+location on line 2
    let block = twoLineHeader(degree, dates, institution, location);

    if (entry.details) {
      block += `\n\\vspace{-4pt}\n${escapeLatex(entry.details)}`;
    }

    return block;
  });

  return `\\ressection{Education}\n\n${blocks.join('\n\\vspace{2pt}\n')}`;
}

function buildAchievements(achievements?: string[]): string {
  if (!achievements || achievements.length === 0) return '';

  const items = achievements.map((a) => escapeLatex(a)).join(' $\\mid$ ');
  return `\\ressection{Achievements}\n${items}`;
}

// ─── Main Assembler ───

export function assembleLatex(data: ResumeData): string {
  const parts = [
    buildPreamble(data),
    '',
    '\\begin{document}',
    '\\small',
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
