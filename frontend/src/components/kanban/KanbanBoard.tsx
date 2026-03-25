import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useState, useCallback } from 'react';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import { useApplications, useUpdateStage } from '@/hooks/use-applications';
import { STAGE_ORDER } from '@/types';
import type { Application, PipelineStage } from '@/types';

export default function KanbanBoard() {
  const { data: applications = [] } = useApplications();
  const updateStage = useUpdateStage();
  const [activeApp, setActiveApp] = useState<Application | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const grouped = STAGE_ORDER.reduce(
    (acc, stage) => {
      acc[stage] = applications.filter((a) => a.stage === stage);
      return acc;
    },
    {} as Record<PipelineStage, Application[]>,
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
