import KanbanBoard from '@/components/kanban/KanbanBoard';
import ApplicationForm from '@/components/applications/ApplicationForm';

export default function PipelinePage() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <h1 className="text-xl font-semibold">Pipeline</h1>
        <ApplicationForm />
      </div>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard />
      </div>
    </div>
  );
}
