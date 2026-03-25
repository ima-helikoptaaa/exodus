import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateInterviewRound, useUpdateInterviewRound } from '@/hooks/use-interviews';
import { INTERVIEW_TYPE_LABELS } from '@/types';
import type { InterviewRound, InterviewType } from '@/types';
import { Plus } from 'lucide-react';

interface Props {
  applicationId: string;
  round?: InterviewRound;
  nextRoundNumber?: number;
  trigger?: React.ReactNode;
}

export default function InterviewRoundForm({ applicationId, round, nextRoundNumber = 1, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const create = useCreateInterviewRound();
  const update = useUpdateInterviewRound();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      type: fd.get('type'),
      roundNumber: Number(fd.get('roundNumber')),
      scheduledAt: fd.get('scheduledAt') || undefined,
      durationMin: fd.get('durationMin') ? Number(fd.get('durationMin')) : undefined,
      interviewerName: fd.get('interviewerName') || undefined,
      meetingLink: fd.get('meetingLink') || undefined,
      prepNotes: fd.get('prepNotes') || undefined,
    };

    const promise = round
      ? update.mutateAsync({ id: round.id, ...data })
      : create.mutateAsync({ applicationId, ...data });

    promise.then(() => setOpen(false));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Add Round
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{round ? 'Edit Interview Round' : 'New Interview Round'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="type">Type</Label>
              <Select name="type" defaultValue={round?.type ?? 'INTRO_CALL'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(INTERVIEW_TYPE_LABELS) as [InterviewType, string][]).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="roundNumber">Round #</Label>
              <Input id="roundNumber" name="roundNumber" type="number" defaultValue={round?.roundNumber ?? nextRoundNumber} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="scheduledAt">Scheduled Date/Time</Label>
              <Input id="scheduledAt" name="scheduledAt" type="datetime-local" defaultValue={round?.scheduledAt?.slice(0, 16) ?? ''} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="durationMin">Duration (min)</Label>
              <Input id="durationMin" name="durationMin" type="number" defaultValue={round?.durationMin ?? 60} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="interviewerName">Interviewer</Label>
              <Input id="interviewerName" name="interviewerName" defaultValue={round?.interviewerName ?? ''} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="meetingLink">Meeting Link</Label>
              <Input id="meetingLink" name="meetingLink" type="url" defaultValue={round?.meetingLink ?? ''} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="prepNotes">Prep Notes</Label>
            <Textarea id="prepNotes" name="prepNotes" rows={3} defaultValue={round?.prepNotes ?? ''} placeholder="What to prepare for this round..." />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {round ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
