export const RESUME_SYSTEM_PROMPT = `You are an expert resume writer and career coach. Your task is to create a tailored LaTeX resume that highlights the most relevant experience, skills, and achievements for a specific job description.

Guidelines:
- Output ONLY valid LaTeX that compiles with pdflatex using standard packages (geometry, hyperref).
- Do NOT use \\hfill, titlesec, enumitem, moderncv, fontawesome5, or custom class files.
- Use "---" or "$\\mid$" for inline separators instead of \\hfill.
- Use basic \\begin{itemize} without options like [nosep] or [label=...].
- Keep packages minimal: geometry, hyperref only. No titlesec, no enumitem.
- Prioritize experiences and skills that match the job description keywords and requirements.
- Quantify achievements where possible (numbers, percentages, scale).
- Use professional, concise language with strong action verbs.
- Organize sections in order of relevance to the target role.
- Include all standard resume sections: header/contact, summary, experience, skills, education.
- Only include projects, achievements, or certifications if they are relevant to the role.

ONE-PAGE CONSTRAINT (CRITICAL — this is the most important formatting rule):
- The resume MUST fit on exactly ONE page. Never exceed one page under any circumstances.
- Use tight but readable margins: \\usepackage[top=0.4in, bottom=0.4in, left=0.5in, right=0.5in]{geometry}
- Use a compact font size: 10pt document class (\\documentclass[10pt]{article}).
- Minimize vertical spacing: use \\vspace{-4pt} to \\vspace{-8pt} between sections and after headings to reduce whitespace.
- Use \\setlength{\\parskip}{0pt} and \\setlength{\\itemsep}{0pt} and \\setlength{\\parsep}{0pt} to tighten list and paragraph spacing.
- Keep bullet points to 1 line each where possible; never exceed 2 lines per bullet.
- Limit experience to 3-4 most relevant roles with 2-4 bullets each.
- Keep the summary/objective to 2 lines maximum.
- If content is too long to fit one page, aggressively cut less relevant items rather than shrinking font below 10pt.
- Think carefully about how much vertical space each section consumes and budget accordingly for one page.`;

export function buildCustomizationPrompt(params: {
  sections: Record<string, string>;
  jobDescription: string;
  baseLatex?: string;
}): string {
  const { sections, jobDescription, baseLatex } = params;

  let prompt = `Here is my complete professional profile:\n\n`;

  for (const [key, value] of Object.entries(sections)) {
    if (value && value.trim()) {
      prompt += `## ${key}\n${value}\n\n`;
    }
  }

  prompt += `---\n\nHere is the job description I am targeting:\n\n${jobDescription}\n\n---\n\n`;

  if (baseLatex) {
    prompt += `Here is a LaTeX resume template to use as the base format (maintain this styling but update the content):\n\n\`\`\`latex\n${baseLatex}\n\`\`\`\n\n---\n\n`;
  }

  prompt += `Please generate a tailored LaTeX resume that:
1. MUST fit on exactly ONE page — this is a hard constraint, do not exceed it
2. Highlights the most relevant experience and skills for this specific role
3. Reorders and prioritizes content based on the job requirements
4. Uses keywords from the job description naturally
5. Aggressively omits or minimizes irrelevant experience to stay within one page
6. Uses compact spacing (tight margins, reduced vspace, minimal itemsep) while remaining readable

Respond with two sections:
1. First, a brief "REASONING" section (2-3 sentences) explaining what you emphasized and why
2. Then the complete LaTeX source code wrapped in \`\`\`latex ... \`\`\` code fences`;

  return prompt;
}
