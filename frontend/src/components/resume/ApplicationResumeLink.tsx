import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplicationResumes, useLinkResume, useUnlinkResume } from '@/hooks/use-application-resume';
import { useResumes } from '@/hooks/use-resumes';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FileText, Link2, Unlink, ExternalLink, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import CustomizeDialog from './CustomizeDialog';

interface Props {
  applicationId: string;
  jobDescription?: string;
}

export default function ApplicationResumeLink({ applicationId, jobDescription }: Props) {
  const { data: linked = [], isLoading } = useApplicationResumes(applicationId);
  const { data: allResumes = [] } = useResumes();
  const linkResume = useLinkResume();
  const unlinkResume = useUnlinkResume();
  const navigate = useNavigate();

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState('');

  const selectedResume = allResumes.find((r) => r.id === selectedResumeId);

  function handleLink() {
    if (!selectedResume?.currentVersionId) return;
    linkResume.mutate(
      {
        applicationId,
        resumeId: selectedResume.id,
        resumeVersionId: selectedResume.currentVersionId,
      },
      { onSuccess: () => setLinkDialogOpen(false) },
    );
  }

  if (isLoading) {
    return <div className="animate-pulse h-24 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setLinkDialogOpen(true)}>
          <Link2 className="h-4 w-4 mr-1" />
          Link Resume
        </Button>
        {allResumes.length > 0 && jobDescription && (
          <CustomizeDialog
            resumeId={allResumes[0].id}
            onApply={() => navigate(`/resumes/${allResumes[0].id}`)}
            defaultJobDescription={jobDescription}
          />
        )}
      </div>

      {linked.length > 0 ? (
        <div className="space-y-2">
          {linked.map((ar) => (
            <Card key={ar.id}>
              <CardContent className="flex items-center gap-3 py-3">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ar.resume?.name ?? 'Resume'}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">
                      v{ar.resumeVersion?.versionNumber}
                    </Badge>
                    <span>Linked {format(new Date(ar.linkedAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/resumes/${ar.resumeId}`)}
                    title="Open in editor"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => unlinkResume.mutate({ applicationId, resumeId: ar.resumeId })}
                    title="Unlink"
                  >
                    <Unlink className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No resume linked to this application yet.</p>
      )}

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Link Resume</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Select Resume</Label>
            <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a resume..." />
              </SelectTrigger>
              <SelectContent>
                {allResumes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} (v{r.currentVersion?.versionNumber ?? 1})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {allResumes.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No resumes yet.{' '}
                <button className="text-primary underline" onClick={() => navigate('/resumes')}>
                  Create one first.
                </button>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLink} disabled={!selectedResumeId || linkResume.isPending}>
              {linkResume.isPending ? 'Linking...' : 'Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
