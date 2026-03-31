import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateResume, useUpdateResume } from '@/hooks/use-resumes';
import { Plus } from 'lucide-react';
import type { Resume } from '@/types';

interface Props {
  resume?: Resume;
  trigger?: React.ReactNode;
  onDone?: (resume: Resume) => void;
}

export default function ResumeForm({ resume, trigger, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const create = useCreateResume();
  const update = useUpdateResume();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;
    const description = (fd.get('description') as string) || undefined;

    const promise = resume
      ? update.mutateAsync({ id: resume.id, name, description })
      : create.mutateAsync({ name, description });

    promise.then((result) => {
      setOpen(false);
      onDone?.(result);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Resume
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{resume ? 'Edit Resume' : 'New Resume'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={resume?.name} required placeholder="e.g. Full Stack Developer Resume" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={resume?.description ?? ''}
              placeholder="Brief description of this resume variant..."
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending ? 'Saving...' : resume ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
