import InterviewRoundCard from './InterviewRoundCard';
import InterviewRoundForm from './InterviewRoundForm';
import type { InterviewRound } from '@/types';
import { CalendarDays } from 'lucide-react';

interface Props {
  applicationId: string;
  rounds: InterviewRound[];
}

export default function InterviewTimeline({ applicationId, rounds }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Interview Rounds ({rounds.length})</h3>
        <InterviewRoundForm
          applicationId={applicationId}
          nextRoundNumber={rounds.length + 1}
        />
      </div>
      {rounds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <CalendarDays className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No interview rounds yet</p>
          <p className="text-xs mt-1">Add one to start tracking your prep</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rounds.map((round) => (
            <InterviewRoundCard key={round.id} round={round} applicationId={applicationId} />
          ))}
        </div>
      )}
    </div>
  );
}
