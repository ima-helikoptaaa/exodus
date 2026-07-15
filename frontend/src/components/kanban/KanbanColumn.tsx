import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import KanbanCard from './KanbanCard';
import type { Application, PipelineStage } from '@/types';
import { STAGE_LABELS, STAGE_DOT_COLORS } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  stage: PipelineStage;
  applications: Application[];
  isDragging?: boolean;
}

// Render this many cards before requiring a "show more" click. Keeps the DOM
// light when a column holds hundreds of cards (the wishlist can hit 250+)
// without breaking dnd-kit (only rendered cards are draggable).
const INITIAL_VISIBLE = 50;
const LOAD_MORE_STEP = 50;

export default function KanbanColumn({ stage, applications, isDragging }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const [visible, setVisible] = useState(INITIAL_VISIBLE);

  const shown = applications.slice(0, visible);
  const hidden = applications.length - shown.length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-64 shrink-0 rounded-xl border border-border/50 bg-card/30 transition-all duration-200',
        isOver && 'border-primary/40 bg-primary/5 ring-1 ring-primary/20',
      )}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${STAGE_DOT_COLORS[stage]}`} />
          <span className="text-xs font-heading font-semibold uppercase tracking-wider">{STAGE_LABELS[stage]}</span>
        </div>
        <span className="text-xs font-mono tabular-nums text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded-md min-w-[24px] text-center">{applications.length}</span>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px] scrollbar-thin">
        {applications.length === 0 && isDragging && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50 border border-dashed border-border/40 rounded-lg">
            Drop here
          </div>
        )}
        {shown.map((app) => (
          <KanbanCard key={app.id} app={app} />
        ))}
        {hidden > 0 && (
          <button
            onClick={() => setVisible((v) => v + LOAD_MORE_STEP)}
            className="w-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg py-1.5 transition-colors font-mono"
          >
            Show {Math.min(LOAD_MORE_STEP, hidden)} more ({hidden} hidden)
          </button>
        )}
      </div>
    </div>
  );
}
