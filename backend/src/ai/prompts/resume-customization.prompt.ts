export const RESUME_SYSTEM_PROMPT = `You are an expert resume writer and career coach. Your task is to create a tailored LaTeX resume that highlights the most relevant experience, skills, and achievements for a specific job description.

Guidelines:
- Output ONLY valid LaTeX that compiles with pdflatex using standard packages (geometry, enumitem, hyperref, titlesec).
- Do NOT use exotic packages like moderncv, fontawesome5, or custom class files.
- Prioritize experiences and skills that match the job description keywords and requirements.
- Quantify achievements where possible (numbers, percentages, scale).
- Keep the resume to 1 page unless there is extensive relevant experience.
- Use professional, concise language with strong action verbs.
- Organize sections in order of relevance to the target role.
- Include all standard resume sections: header/contact, summary, experience, skills, education.
- Only include projects, achievements, or certifications if they are relevant to the role.`;

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
1. Highlights the most relevant experience and skills for this specific role
2. Reorders and prioritizes content based on the job requirements
3. Uses keywords from the job description naturally
4. Omits or minimizes irrelevant experience

Respond with two sections:
1. First, a brief "REASONING" section (2-3 sentences) explaining what you emphasized and why
2. Then the complete LaTeX source code wrapped in \`\`\`latex ... \`\`\` code fences`;

  return prompt;
}
