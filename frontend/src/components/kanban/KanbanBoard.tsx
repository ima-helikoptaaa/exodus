import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useState, useCallback, useMemo, useEffect } from 'react';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import KanbanFilters from './KanbanFilters';
import { DEFAULT_FILTERS, type BoardFilterState } from './filters';
import { useApplications, useUpdateStage } from '@/hooks/use-applications';
import { STAGE_ORDER } from '@/types';
import type { Application, PipelineStage } from '@/types';
import { Loader2, AlertTriangle } from 'lucide-react';

// India city tokens for the location filter (mirrors backend INDIA_CITIES).
const INDIA_TOKENS =
  /\b(bangalore|bengaluru|mumbai|delhi|ncr|gurgaon|gurugram|hyderabad|pune|chennai|kolkata|noida|ahmedabad|india)\b/i;
const REMOTE_TOKENS = /\bremote|worldwide|anywhere|global|distributed\b/i;
const FRESHNESS_MS: Record<Exclude<BoardFilterState['freshness'], 'all'>, number> = {
  '24h': 86_400_000,
  '7d': 604_800_000,
  '30d': 2_592_000_000,
};

export default function KanbanBoard() {
  const { data: applications = [], isLoading, isError } = useApplications();
  const updateStage = useUpdateStage();
  const [activeApp, setActiveApp] = useState<Application | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [filters, setFilters] = useState<BoardFilterState>(DEFAULT_FILTERS);

  // "now" drives the freshness filter; updated on an interval (setState in a
  // callback, never synchronously during render/effect body) to satisfy
  // React's purity + effect rules.
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const t = setTimeout(tick, 0);
    const id = setInterval(tick, 60_000);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const a of applications) if (a.source) set.add(a.source);
    return Array.from(set).sort();
  }, [applications]);

  const filtered = useMemo(() => {
    return applications.filter((a) => {
      if ((a.matchScore ?? 0) < filters.minScore) return false;
      if (filters.location === 'india' && !INDIA_TOKENS.test(a.location ?? ''))
        return false;
      if (
        filters.location === 'remote' &&
        !a.isRemote &&
        !REMOTE_TOKENS.test(a.location ?? '')
      )
        return false;
      if (filters.source !== 'all' && a.source !== filters.source) return false;
      if (filters.freshness !== 'all') {
        if (!a.postedAt || !now) return false;
        if (now - new Date(a.postedAt).getTime() > FRESHNESS_MS[filters.freshness])
          return false;
      }
      return true;
    });
  }, [applications, filters, now]);

  const grouped = useMemo(() =>
    STAGE_ORDER.reduce(
      (acc, stage) => {
        // Sort by matchScore desc (best matches on top), then newest first.
        // Makes the 251-card wishlist navigable without pagination.
        acc[stage] = filtered
          .filter((a) => a.stage === stage)
          .slice()
          .sort((a, b) => {
            const sa = a.matchScore ?? -1;
            const sb = b.matchScore ?? -1;
            if (sb !== sa) return sb - sa;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
        return acc;
      },
      {} as Record<PipelineStage, Application[]>,
    ),
    [filtered],
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
      <KanbanFilters
        value={filters}
        onChange={setFilters}
        sources={sources}
        total={applications.length}
        shown={filtered.length}
      />
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
