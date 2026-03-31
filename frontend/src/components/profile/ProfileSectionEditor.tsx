import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Check, Pencil } from 'lucide-react';
import type { ProfileSection } from '@/types';
import { PROFILE_SECTION_LABELS } from '@/types';

interface Props {
  section: ProfileSection;
  value: string;
  onSave: (section: ProfileSection, value: string) => void;
  saving?: boolean;
}

const PLACEHOLDERS: Record<ProfileSection, string> = {
  SUMMARY: 'A brief professional summary highlighting your key strengths and career focus...',
  EXPERIENCE:
    'List your work experience with company names, roles, dates, and key accomplishments. Use bullet points for achievements.\n\nExample:\n- Software Engineer at Acme Corp (2022-2024)\n  - Built real-time data pipeline processing 1M events/day\n  - Led migration from monolith to microservices',
  SKILLS: 'Languages: JavaScript, TypeScript, Python\nFrameworks: React, Node.js, NestJS\nTools: Docker, AWS, PostgreSQL',
  PROJECTS: 'List your notable projects with descriptions, tech stack, and impact...',
  EDUCATION: 'Degree, University, Year, GPA (optional), relevant coursework...',
  ACHIEVEMENTS: 'Awards, publications, patents, speaking engagements...',
  CERTIFICATIONS: 'AWS Solutions Architect, Google Cloud Professional, etc.',
};

export default function ProfileSectionEditor({ section, value, onSave, saving }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const handleEdit = useCallback(() => {
    setDraft(value);
    setEditing(true);
  }, [value]);

  const handleSave = useCallback(() => {
    onSave(section, draft);
    setEditing(false);
  }, [section, draft, onSave]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{PROFILE_SECTION_LABELS[section]}</CardTitle>
          {editing ? (
            <Button size="sm" variant="ghost" onClick={handleSave} disabled={saving}>
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={handleEdit}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={PLACEHOLDERS[section]}
            rows={section === 'EXPERIENCE' ? 12 : section === 'SUMMARY' ? 4 : 6}
            className="font-mono text-sm"
          />
        ) : value ? (
          <pre className="text-sm whitespace-pre-wrap text-muted-foreground font-mono">{value}</pre>
        ) : (
          <p className="text-sm text-muted-foreground italic">Click Edit to add content...</p>
        )}
      </CardContent>
    </Card>
  );
}
