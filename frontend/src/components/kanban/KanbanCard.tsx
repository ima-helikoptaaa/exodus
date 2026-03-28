import { useDraggable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Application } from '@/types';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Star } from 'lucide-react';

const PRIORITY_COLORS = ['', 'text-blue-500', 'text-amber-500', 'text-red-500'];

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
      style={isOverlay ? undefined : style}
      {...(isOverlay ? {} : attributes)}
      {...(isOverlay ? {} : listeners)}
      className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      role="button"
      aria-label={`${app.company.name} - ${app.role}`}
      onClick={() => {
        if (!isDragging) {
          navigate(`/applications/${app.id}`);
        }
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{app.company.name}</p>
          <p className="text-xs text-muted-foreground truncate">{app.role}</p>
        </div>
        {app.priority > 0 && <Star className={`h-3.5 w-3.5 shrink-0 ${PRIORITY_COLORS[app.priority]}`} fill="currentColor" />}
      </div>

      {(app.location || app.isRemote) && (
        <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{app.isRemote ? 'Remote' : app.location}</span>
        </div>
      )}

      {nextInterview?.scheduledAt && (
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0" />
          <span>{format(new Date(nextInterview.scheduledAt), 'MMM d, h:mm a')}</span>
        </div>
      )}

      {app.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {app.tags.slice(0, 3).map(({ tag }) => (
            <Badge key={tag.id} variant="secondary" className="text-[10px] px-1.5 py-0">
              {tag.name}
            </Badge>
          ))}
          {app.tags.length > 3 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              +{app.tags.length - 3}
            </Badge>
          )}
        </div>
      )}
    </Card>
  );
}
