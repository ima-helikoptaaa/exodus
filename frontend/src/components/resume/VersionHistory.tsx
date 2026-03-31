import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import type { ResumeVersion } from '@/types';

interface Props {
  versions: ResumeVersion[];
  currentVersionId?: string;
  onRestore: (versionId: string) => void;
  onSelect: (version: ResumeVersion) => void;
  restoring?: boolean;
}

export default function VersionHistory({ versions, currentVersionId, onRestore, onSelect, restoring }: Props) {
  if (versions.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">No versions yet.</p>;
  }

  return (
    <div className="space-y-1 p-2 max-h-[60vh] overflow-y-auto">
      {versions.map((v) => {
        const isCurrent = v.id === currentVersionId;
        return (
          <div
            key={v.id}
            className={`flex items-center gap-2 p-2 rounded-md text-sm cursor-pointer hover:bg-accent ${
              isCurrent ? 'bg-accent' : ''
            }`}
            onClick={() => onSelect(v)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Badge variant={isCurrent ? 'default' : 'secondary'} className="text-xs">
                  v{v.versionNumber}
                </Badge>
                {isCurrent && (
                  <span className="text-xs text-primary font-medium">current</span>
                )}
              </div>
              {v.changeNote && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{v.changeNote}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(v.createdAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
            {!isCurrent && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore(v.id);
                }}
                disabled={restoring}
                title="Restore this version"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
