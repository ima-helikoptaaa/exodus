import { useDroppable } from '@dnd-kit/core';
import KanbanCard from './KanbanCard';
import type { Application, PipelineStage } from '@/types';
import { STAGE_LABELS, STAGE_COLORS } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  stage: PipelineStage;
  applications: Application[];
  isDragging?: boolean;
}

export default function KanbanColumn({ stage, applications, isDragging }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-60 shrink-0 rounded-lg bg-muted/40 transition-all duration-200',
        isOver && 'bg-accent/60 ring-2 ring-primary/20',
      )}
    >
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn('text-xs', STAGE_COLORS[stage])}>
            {STAGE_LABELS[stage]}
          </Badge>
          <span className="text-xs text-muted-foreground font-medium">{applications.length}</span>
        </div>
      </div>
      <div className="flex-1 p-2 pt-0 space-y-2 overflow-y-auto min-h-[100px]">
        {applications.length === 0 && isDragging && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/60 border border-dashed rounded-md">
            Drop here
          </div>
        )}
        {applications.map((app) => (
          <KanbanCard key={app.id} app={app} />
        ))}
      </div>
    </div>
  );
}
