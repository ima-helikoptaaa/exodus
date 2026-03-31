import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResumes, useDeleteResume } from '@/hooks/use-resumes';
import ResumeForm from '@/components/resume/ResumeForm';
import ResumeCard from '@/components/resume/ResumeCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Resume } from '@/types';

export default function ResumesListPage() {
  const { data: resumes, isLoading } = useResumes();
  const deleteResume = useDeleteResume();
  const navigate = useNavigate();
  const [editResume, setEditResume] = useState<Resume | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Resume | undefined>();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Resumes</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your resume versions and templates.</p>
        </div>
        <ResumeForm onDone={(r) => navigate(`/resumes/${r.id}`)} />
      </div>

      {resumes && resumes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumes.map((resume) => (
            <ResumeCard
              key={resume.id}
              resume={resume}
              onEdit={() => setEditResume(resume)}
              onDelete={() => setDeleteTarget(resume)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No resumes yet. Create your first one to get started.</p>
        </div>
      )}

      {editResume && (
        <ResumeForm
          resume={editResume}
          trigger={<span />}
          onDone={() => setEditResume(undefined)}
        />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Resume</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{deleteTarget?.name}"? This will remove all versions and cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(undefined)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  deleteResume.mutate(deleteTarget.id);
                  setDeleteTarget(undefined);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
