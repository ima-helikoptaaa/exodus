import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import PrepTopicChecklist from './PrepTopicChecklist';
import InterviewRoundForm from './InterviewRoundForm';
import { useUpdateInterviewRound, useDeleteInterviewRound } from '@/hooks/use-interviews';
import { INTERVIEW_TYPE_LABELS } from '@/types';
import type { InterviewRound, InterviewStatus } from '@/types';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Trash2, Pencil, Star } from 'lucide-react';

const STATUS_COLORS: Record<InterviewStatus, string> = {
  UPCOMING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400',
};

export default function InterviewRoundCard({ round, applicationId }: { round: InterviewRound; applicationId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [reflection, setReflection] = useState(round.reflection ?? '');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const updateRound = useUpdateInterviewRound();
  const deleteRound = useDeleteInterviewRound();

  function saveReflection() {
    if (reflection !== (round.reflection ?? '')) {
      updateRound.mutate({ id: round.id, reflection });
    }
  }

  return (
    <Card className="p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">Round {round.roundNumber}</span>
            <Badge variant="secondary" className="text-xs">
              {INTERVIEW_TYPE_LABELS[round.type]}
            </Badge>
            <Badge variant="secondary" className={`text-xs ${STATUS_COLORS[round.status]}`}>
              {round.status.charAt(0) + round.status.slice(1).toLowerCase()}
            </Badge>
          </div>
          {round.scheduledAt && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(round.scheduledAt), 'MMM d, yyyy h:mm a')}
              {round.durationMin ? ` (${round.durationMin} min)` : ''}
              {round.interviewerName ? ` - ${round.interviewerName}` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {round.difficulty && (
            <div className="flex items-center gap-0.5 mr-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`h-3 w-3 ${n <= round.difficulty! ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-600'}`}
                />
              ))}
            </div>
          )}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 border-t pt-4">
          <div className="flex gap-2 flex-wrap">
            <Select
              value={round.status}
              onValueChange={(v) => updateRound.mutate({ id: round.id, status: v })}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UPCOMING">Upcoming</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={String(round.difficulty ?? 0)}
              onValueChange={(v) => updateRound.mutate({ id: round.id, difficulty: Number(v) })}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No rating</SelectItem>
                <SelectItem value="1">1 - Easy</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3 - Medium</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5 - Hard</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <InterviewRoundForm
              applicationId={applicationId}
              round={round}
              trigger={
                <Button size="sm" variant="ghost">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              }
            />
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {round.prepNotes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Prep Notes</p>
              <p className="text-sm whitespace-pre-wrap">{round.prepNotes}</p>
            </div>
          )}

          <PrepTopicChecklist roundId={round.id} topics={round.prepTopics} />

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Post-Interview Reflection</p>
            <Textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              onBlur={saveReflection}
              rows={3}
              placeholder="How did it go? What went well? What to improve?"
              className="text-sm"
            />
          </div>

          {round.meetingLink && (
            <a href={round.meetingLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-block">
              Meeting Link
            </a>
          )}
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Interview Round</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete Round {round.roundNumber} ({INTERVIEW_TYPE_LABELS[round.type]})?
              This will also remove all prep topics. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteRound.mutate(round.id);
                setDeleteOpen(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
