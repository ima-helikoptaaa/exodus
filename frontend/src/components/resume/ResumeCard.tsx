import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import type { Resume } from '@/types';

interface Props {
  resume: Resume;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ResumeCard({ resume, onEdit, onDelete }: Props) {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/resumes/${resume.id}`)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{resume.name}</CardTitle>
          </div>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {resume.description && <p className="text-sm text-muted-foreground mb-2">{resume.description}</p>}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            v{resume.currentVersion?.versionNumber ?? 1}
          </Badge>
          <span>{resume._count?.versions ?? 0} versions</span>
          {resume._count?.applicationResumes ? (
            <span>{resume._count.applicationResumes} linked</span>
          ) : null}
          <span className="ml-auto">{format(new Date(resume.updatedAt), 'MMM d, yyyy')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
