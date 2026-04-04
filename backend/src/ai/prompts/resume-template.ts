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
\\usepackage{lmodern}
\\usepackage{microtype}
\\usepackage[top=0.35in, bottom=0.35in, left=0.45in, right=0.45in]{geometry}
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
\\setlist[itemize]{itemsep=1.5pt, parsep=0pt, topsep=2pt, partopsep=0pt}
\\pagestyle{empty}

% Section heading: small caps + horizontal rule
\\newcommand{\\ressection}[1]{%
  \\vspace{6pt}%
  {\\large\\scshape\\raggedright #1}\\\\[-5pt]%
  \\rule{\\textwidth}{0.4pt}\\vspace{2pt}%
}

% One-line role header: Title | Company .......... Dates
\\newcommand{\\roleheader}[3]{%
  \\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}
    \\textbf{#1} \\textbar\\ \\textit{#2} & #3 \\\\
  \\end{tabular*}\\vspace{1pt}%
}`;
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
  {\\LARGE\\textbf{${name}}}\\\\[3pt]
  ${contactParts.join('\n  $\\mid$ ')}
\\end{center}`;
}

function buildExperience(entries: ExperienceEntry[]): string {
  if (entries.length === 0) return '';

  const blocks = entries.map((entry, i) => {
    const title = escapeLatex(entry.title);
    const company = escapeLatex(entry.company);
    const startDate = escapeLatex(entry.startDate);
    const endDate = escapeLatex(entry.endDate);

    const bullets = entry.bullets
      .map((b) => `  \\item ${escapeLatex(b)}`)
      .join('\n');

    const spacing = i > 0 ? '\\vspace{5pt}\n' : '';

    return `${spacing}\\roleheader{${title}}{${company}}{${startDate} -- ${endDate}}
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
    .join(' \\\\[2pt]\n');

  return `\\ressection{Technical Skills}\n\n\\vspace{2pt}\n\\noindent\n${lines}`;
}

function buildEducation(entries: EducationEntry[]): string {
  if (entries.length === 0) return '';

  const blocks = entries.map((entry) => {
    const degree = escapeLatex(entry.degree);
    const institution = escapeLatex(entry.institution);
    const dates = escapeLatex(entry.dates);

    let block = `\\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}
  \\textbf{${degree}} & ${dates} \\\\
  \\textit{${institution}} \\\\
\\end{tabular*}`;

    if (entry.details) {
      block += `\n\\vspace{1pt}\n\\noindent ${escapeLatex(entry.details)}`;
    }

    return block;
  });

  return `\\ressection{Education}\n\n${blocks.join('\n\\vspace{2pt}\n')}`;
}

function buildAchievements(achievements?: string[]): string {
  if (!achievements || achievements.length === 0) return '';

  const items = achievements
    .map((a) => `  \\item ${escapeLatex(a)}`)
    .join('\n');
  return `\\ressection{Achievements}\n\n\\begin{itemize}\n${items}\n\\end{itemize}`;
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
