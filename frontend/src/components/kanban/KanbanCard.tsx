import { useDraggable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Application } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Star, Flame } from 'lucide-react';

const PRIORITY_COLORS: Record<number, string> = {
  1: 'text-sky-400',
  2: 'text-amber-400',
  3: 'text-red-400',
};

interface Props {
  app: Application;
  isOverlay?: boolean;
}

export default function KanbanCard({ app, isOverlay }: Props) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: app.id,
    data: { app },
  });

  const style: React.CSSProperties | undefined = isDragging
    ? { opacity: 0, pointerEvents: 'none' }
    : transform
      ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
      : undefined;

  const nextInterview = app.interviewRounds?.[0];

  return (
    <Card
      ref={isOverlay ? undefined : setNodeRef}
      style={isOverlay ? { ...style, cursor: 'grabbing', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.4)' } : style}
      {...(isOverlay ? {} : attributes)}
      {...(isOverlay ? {} : listeners)}
      className="p-3 cursor-grab active:cursor-grabbing hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      role="button"
      tabIndex={isOverlay ? undefined : 0}
      aria-label={`${app.company.name} - ${app.role}`}
      onClick={() => {
        if (!isDragging) {
          navigate(`/applications/${app.id}`);
        }
      }}
      onKeyDown={(e) => {
        if (isOverlay) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/applications/${app.id}`);
        }
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate font-heading">{app.company.name}</p>
          <p className="text-xs text-muted-foreground truncate">{app.role}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {app.matchScore != null && app.matchScore > 0 && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    tabIndex={isOverlay ? undefined : 0}
                    className={`cursor-default text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                      app.matchScore >= 85
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : app.matchScore >= 70
                          ? 'bg-sky-500/15 text-sky-400'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {app.matchScore}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs text-xs">
                  <div className="space-y-1">
                    <p className="font-semibold">Why this score</p>
                    {(() => {
                      const reasons =
                        app.matchReasons
                          ?.split(';')
                          .map((r) => r.trim())
                          .filter(Boolean) ?? [];
                      return reasons.length > 0 ? (
                        <ul className="list-disc pl-4 space-y-0.5">
                          {reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">
                          No scoring details available.
                        </p>
                      );
                    })()}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {app.priority > 0 && <Star className={`h-3.5 w-3.5 ${PRIORITY_COLORS[app.priority]}`} fill="currentColor" />}
        </div>
      </div>

      {(app.location || app.isRemote) && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{app.isRemote ? 'Remote' : app.location}</span>
        </div>
      )}

      {(app.source || app.postedAt) && (
        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-muted-foreground/60 font-mono">
          {app.source && (
            <span className="uppercase tracking-wide rounded bg-muted/40 px-1 py-0.5">{app.source}</span>
          )}
          {app.postedAt && (
            <span title={app.postedAt}>
              {formatDistanceToNow(new Date(app.postedAt), { addSuffix: true })}
            </span>
          )}
        </div>
      )}

      {nextInterview?.scheduledAt && (
        <div className="flex items-center gap-1 mt-1.5 text-xs text-primary">
          <Calendar className="h-3 w-3 shrink-0" />
          <span className="font-mono">{format(new Date(nextInterview.scheduledAt), 'MMM d, h:mm a')}</span>
        </div>
      )}

      {app.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {app.tags.slice(0, 3).map(({ tag }) => (
            <Badge key={tag.id} variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
              {tag.name}
            </Badge>
          ))}
          {app.tags.length > 3 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
              +{app.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {(app._count?.interviewRounds ?? 0) > 0 && !nextInterview?.scheduledAt && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground/60 font-mono">
          <Flame className="h-3 w-3" />
          {app._count!.interviewRounds} interview{(app._count!.interviewRounds ?? 0) !== 1 ? 's' : ''}
        </div>
      )}
    </Card>
  );
}
