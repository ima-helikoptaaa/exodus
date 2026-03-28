import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useState, useCallback, useMemo } from 'react';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import { useApplications, useUpdateStage } from '@/hooks/use-applications';
import { STAGE_ORDER } from '@/types';
import type { Application, PipelineStage } from '@/types';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function KanbanBoard() {
  const { data: applications = [], isLoading, isError } = useApplications();
  const updateStage = useUpdateStage();
  const [activeApp, setActiveApp] = useState<Application | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const grouped = useMemo(() =>
    STAGE_ORDER.reduce(
      (acc, stage) => {
        acc[stage] = applications.filter((a) => a.stage === stage);
        return acc;
      },
      {} as Record<PipelineStage, Application[]>,
    ),
    [applications],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const app = (event.active.data.current as { app: Application })?.app;
    setActiveApp(app ?? null);
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveApp(null);
    setIsDragging(false);
    const { active, over } = event;
    if (!over) return;

    const appId = active.id as string;
    const targetStage = over.id as PipelineStage;

    if (STAGE_ORDER.includes(targetStage)) {
      const app = applications.find((a) => a.id === appId);
      if (app && app.stage !== targetStage) {
        updateStage.mutate({ id: appId, stage: targetStage });
      }
    }
  }, [applications, updateStage]);

  const handleDragCancel = useCallback(() => {
    setActiveApp(null);
    setIsDragging(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertTriangle className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">Failed to load applications</p>
        <p className="text-xs mt-1">Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 p-6 overflow-x-auto h-full">
        {STAGE_ORDER.map((stage) => (
          <KanbanColumn key={stage} stage={stage} applications={grouped[stage]} isDragging={isDragging} />
        ))}
      </div>
      <DragOverlay>
        {activeApp ? <KanbanCard app={activeApp} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
