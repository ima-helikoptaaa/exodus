import { useState } from 'react';
import { Telescope, Loader2, CheckCircle2, X, ChevronDown, ChevronUp } from 'lucide-react';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import ApplicationForm from '@/components/applications/ApplicationForm';
import {
  useRunScout,
  useLastScoutRun,
  usePendingPreview,
  usePreviewScout,
  useConfirmPreview,
} from '@/hooks/use-scout';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export default function PipelinePage() {
  const [showScoutMenu, setShowScoutMenu] = useState(false);
  const [showPreviewList, setShowPreviewList] = useState(false);
  const runScout = useRunScout();
  const previewScout = usePreviewScout();
  const confirmPreview = useConfirmPreview();
  const { data: lastRun } = useLastScoutRun();
  const { data: pendingPreview } = usePendingPreview();

  const isScouting = runScout.isPending || previewScout.isPending;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Pipeline</h1>
          {lastRun && (
            <span className="text-xs text-muted-foreground">
              Last scout: {formatDistanceToNow(new Date(lastRun.startedAt), { addSuffix: true })}
              {lastRun.jobsAdded ? ` · ${lastRun.jobsAdded} added` : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 relative">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              disabled={isScouting}
              onClick={() => setShowScoutMenu((s) => !s)}
            >
              {isScouting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Telescope className="h-4 w-4 mr-1.5" />
              )}
              Run Scout
            </Button>
            {showScoutMenu && !isScouting && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowScoutMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-64 rounded-md border bg-popover p-1 shadow-md">
                  <button
                    className="w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-accent transition-colors"
                    onClick={() => {
                      setShowScoutMenu(false);
                      runScout.mutate({ useLlm: true });
                    }}
                  >
                    <div className="font-medium">Run with AI scoring</div>
                    <div className="text-xs text-muted-foreground">Scores each job with GLM-5.2</div>
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-accent transition-colors"
                    onClick={() => {
                      setShowScoutMenu(false);
                      runScout.mutate({ useLlm: false });
                    }}
                  >
                    <div className="font-medium">Run (rules only)</div>
                    <div className="text-xs text-muted-foreground">Fast, free — no LLM scoring</div>
                  </button>
                  <div className="my-1 border-t" />
                  <button
                    className="w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-accent transition-colors"
                    onClick={() => {
                      setShowScoutMenu(false);
                      previewScout.mutate({ useLlm: true });
                    }}
                  >
                    <div className="font-medium">Preview (don't add yet)</div>
                    <div className="text-xs text-muted-foreground">Fetch + score, review before adding</div>
                  </button>
                </div>
              </>
            )}
          </div>
          <ApplicationForm />
        </div>
      </div>

      {/* Pending preview banner */}
      {pendingPreview && pendingPreview.jobsFound > 0 && (
        <div className="mx-6 mb-2 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Telescope className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="font-medium text-amber-900 dark:text-amber-200">
                  Scout preview: {pendingPreview.jobsFound} new jobs found
                </span>
                <span className="text-xs text-amber-700 dark:text-amber-500">
                  from {pendingPreview.companiesChecked} companies · {formatDistanceToNow(new Date(pendingPreview.startedAt), { addSuffix: true })}
                </span>
              </div>

              <button
                className="mt-2 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:underline"
                onClick={() => setShowPreviewList((s) => !s)}
              >
                {showPreviewList ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {showPreviewList ? 'Hide' : 'Show'} job list
              </button>

              {showPreviewList && (
                <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                  {pendingPreview.preview.map((job, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm py-1 px-2 rounded bg-amber-100/50 dark:bg-amber-900/20">
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                        (job.matchScore ?? 0) >= 85
                          ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
                          : (job.matchScore ?? 0) >= 70
                            ? 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {job.matchScore}
                      </span>
                      <span className="font-medium">{job.companyName}</span>
                      <span className="text-muted-foreground">— {job.role}</span>
                      {job.location && (
                        <span className="text-xs text-muted-foreground">· {job.location}</span>
                      )}
                      {job.jobUrl && (
                        <a
                          href={job.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                disabled={confirmPreview.isPending}
                onClick={() => confirmPreview.mutate(pendingPreview.runId)}
              >
                {confirmPreview.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                )}
                Confirm & Add
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <KanbanBoard />
      </div>
    </div>
  );
}
