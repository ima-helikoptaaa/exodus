import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateApplication, useUpdateApplication } from '@/hooks/use-applications';
import { STAGE_ORDER, STAGE_LABELS } from '@/types';
import type { Application, PipelineStage } from '@/types';
import { Plus } from 'lucide-react';

interface Props {
  application?: Application;
  defaultStage?: PipelineStage;
  trigger?: React.ReactNode;
  onDone?: () => void;
}

function toDateInputValue(iso?: string): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export default function ApplicationForm({ application, defaultStage, trigger, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const create = useCreateApplication();
  const update = useUpdateApplication();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      companyName: fd.get('companyName'),
      role: fd.get('role'),
      jobUrl: fd.get('jobUrl') || undefined,
      jobDescription: fd.get('jobDescription') || undefined,
      location: fd.get('location') || undefined,
      isRemote: fd.get('isRemote') === 'on',
      salaryMin: fd.get('salaryMin') ? Number(fd.get('salaryMin')) : application ? null : undefined,
      salaryMax: fd.get('salaryMax') ? Number(fd.get('salaryMax')) : application ? null : undefined,
      stage: fd.get('stage') || defaultStage || 'WISHLIST',
      priority: Number(fd.get('priority')) || 0,
      appliedDate: fd.get('appliedDate') || (application ? null : undefined),
      followUpDate: fd.get('followUpDate') || (application ? null : undefined),
      deadlineDate: fd.get('deadlineDate') || (application ? null : undefined),
    };

    const promise = application
      ? update.mutateAsync({ id: application.id, ...data })
      : create.mutateAsync(data);

    promise.then(() => {
      setOpen(false);
      onDone?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Application
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{application ? 'Edit Application' : 'New Application'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="companyName">Company</Label>
              <Input id="companyName" name="companyName" defaultValue={application?.company.name} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="role">Role</Label>
              <Input id="role" name="role" defaultValue={application?.role} required />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="jobUrl">Job URL</Label>
            <Input id="jobUrl" name="jobUrl" type="url" defaultValue={application?.jobUrl ?? ''} placeholder="https://..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" defaultValue={application?.location ?? ''} placeholder="San Francisco, CA" />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Checkbox id="isRemote" name="isRemote" defaultChecked={application?.isRemote} />
              <Label htmlFor="isRemote">Remote</Label>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="salaryMin">Salary Min</Label>
              <Input id="salaryMin" name="salaryMin" type="number" min={0} defaultValue={application?.salaryMin ?? ''} placeholder="80000" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="salaryMax">Salary Max</Label>
              <Input id="salaryMax" name="salaryMax" type="number" min={0} defaultValue={application?.salaryMax ?? ''} placeholder="120000" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="stage">Stage</Label>
              <Select name="stage" defaultValue={application?.stage ?? defaultStage ?? 'WISHLIST'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="appliedDate">Applied Date</Label>
              <Input id="appliedDate" name="appliedDate" type="date" defaultValue={toDateInputValue(application?.appliedDate)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="followUpDate">Follow-up Date</Label>
              <Input id="followUpDate" name="followUpDate" type="date" defaultValue={toDateInputValue(application?.followUpDate)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="deadlineDate">Deadline</Label>
              <Input id="deadlineDate" name="deadlineDate" type="date" defaultValue={toDateInputValue(application?.deadlineDate)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="priority">Priority</Label>
            <Select name="priority" defaultValue={String(application?.priority ?? 0)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">None</SelectItem>
                <SelectItem value="1">Low</SelectItem>
                <SelectItem value="2">Medium</SelectItem>
                <SelectItem value="3">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="jobDescription">Job Description</Label>
            <Textarea
              id="jobDescription"
              name="jobDescription"
              rows={3}
              defaultValue={application?.jobDescription ?? ''}
              placeholder="Paste or summarize the job description..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending ? 'Saving...' : application ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
