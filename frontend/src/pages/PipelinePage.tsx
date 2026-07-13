import { useState } from 'react';
import { Telescope, Loader2, CheckCircle2, ChevronDown, ChevronUp, Sparkles, Zap, Eye } from 'lucide-react';
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
      <div className="flex items-center justify-between px-6 pt-6 pb-3">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Pipeline</h1>
          {lastRun && (
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Last scout: {formatDistanceToNow(new Date(lastRun.startedAt), { addSuffix: true })}
              {lastRun.jobsAdded ? ` · ${lastRun.jobsAdded} added` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 relative">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              disabled={isScouting}
              onClick={() => setShowScoutMenu((s) => !s)}
              className="gap-2"
            >
              {isScouting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Telescope className="h-4 w-4" />
              )}
              Run Scout
            </Button>
            {showScoutMenu && !isScouting && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowScoutMenu(false)} />
                <div className="absolute right-0 top-full mt-2 z-20 w-72 rounded-xl border border-border glass p-1.5 shadow-2xl animate-in-up">
                  <button
                    className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-primary/10 transition-all group flex items-start gap-3"
                    onClick={() => {
                      setShowScoutMenu(false);
                      runScout.mutate({ useLlm: true });
                    }}
                  >
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium">AI Scoring</div>
                      <div className="text-xs text-muted-foreground">Scores each job with GLM-5.2</div>
                    </div>
                  </button>
                  <button
                    className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-secondary/50 transition-all group flex items-start gap-3"
                    onClick={() => {
                      setShowScoutMenu(false);
                      runScout.mutate({ useLlm: false });
                    }}
                  >
                    <Zap className="h-4 w-4 text-accent-foreground mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium">Rules Only</div>
                      <div className="text-xs text-muted-foreground">Fast, free — no LLM scoring</div>
                    </div>
                  </button>
                  <div className="my-1 border-t border-border/50" />
                  <button
                    className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-secondary/50 transition-all group flex items-start gap-3"
                    onClick={() => {
                      setShowScoutMenu(false);
                      previewScout.mutate({ useLlm: true });
                    }}
                  >
                    <Eye className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium">Preview Mode</div>
                      <div className="text-xs text-muted-foreground">Fetch + score, review before adding</div>
                    </div>
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
        <div className="mx-6 mb-3 rounded-xl border border-accent/30 bg-accent/5 p-4 animate-in-up">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-accent/15 flex items-center justify-center">
                  <Telescope className="h-4 w-4 text-accent-foreground" />
                </div>
                <div>
                  <span className="font-heading font-semibold text-sm">
                    {pendingPreview.jobsFound} new jobs found
                  </span>
                  <span className="text-xs text-muted-foreground ml-2 font-mono">
                    {pendingPreview.companiesChecked} companies · {formatDistanceToNow(new Date(pendingPreview.startedAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              <button
                className="mt-3 flex items-center gap-1 text-xs text-accent-foreground hover:underline font-medium"
                onClick={() => setShowPreviewList((s) => !s)}
              >
                {showPreviewList ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {showPreviewList ? 'Hide' : 'Show'} job list
              </button>

              {showPreviewList && (
                <div className="mt-3 max-h-52 overflow-y-auto space-y-1 scrollbar-thin">
                  {pendingPreview.preview.map((job, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm py-1.5 px-2.5 rounded-lg bg-card/40 hover:bg-card/70 transition-colors">
                      <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                        (job.matchScore ?? 0) >= 85
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : (job.matchScore ?? 0) >= 70
                            ? 'bg-sky-500/15 text-sky-400'
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        {job.matchScore}
                      </span>
                      <span className="font-medium truncate">{job.companyName}</span>
                      <span className="text-muted-foreground truncate">— {job.role}</span>
                      {job.location && (
                        <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">· {job.location}</span>
                      )}
                      {job.jobUrl && (
                        <a
                          href={job.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto text-xs text-primary hover:underline shrink-0"
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
                className="gap-2"
              >
                {confirmPreview.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
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
