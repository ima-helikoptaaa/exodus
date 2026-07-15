import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';
import { DEFAULT_FILTERS, type BoardFilterState } from './filters';

interface Props {
  value: BoardFilterState;
  onChange: (v: BoardFilterState) => void;
  sources: string[];
  total: number;
  shown: number;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
      {children}
    </div>
  );
}

const triggerClass =
  'h-7 w-[110px] text-xs gap-1 px-2 border-border/50 bg-card/40 font-mono';

export default function KanbanFilters({
  value,
  onChange,
  sources,
  total,
  shown,
}: Props) {
  const activeCount =
    (value.minScore !== 0 ? 1 : 0) +
    (value.location !== 'all' ? 1 : 0) +
    (value.source !== 'all' ? 1 : 0) +
    (value.freshness !== 'all' ? 1 : 0);

  const set = (patch: Partial<BoardFilterState>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="flex items-center gap-3 px-6 py-2 border-b border-border/30 flex-wrap">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Filter className="h-3.5 w-3.5" />
        <span className="text-xs font-mono tabular-nums">
          {shown}/{total}
        </span>
      </div>

      <Field label="Score">
        <Select
          value={String(value.minScore)}
          onValueChange={(v) => set({ minScore: Number(v) })}
        >
          <SelectTrigger className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Any</SelectItem>
            <SelectItem value="50">50+</SelectItem>
            <SelectItem value="70">70+</SelectItem>
            <SelectItem value="85">85+</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="Location">
        <Select
          value={value.location}
          onValueChange={(v) =>
            set({ location: v as BoardFilterState['location'] })
          }
        >
          <SelectTrigger className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="india">India</SelectItem>
            <SelectItem value="remote">Remote</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="Source">
        <Select
          value={value.source}
          onValueChange={(v) => set({ source: v })}
        >
          <SelectTrigger className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Freshness">
        <Select
          value={value.freshness}
          onValueChange={(v) =>
            set({ freshness: v as BoardFilterState['freshness'] })
          }
        >
          <SelectTrigger className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any time</SelectItem>
            <SelectItem value="24h">24 hours</SelectItem>
            <SelectItem value="7d">7 days</SelectItem>
            <SelectItem value="30d">30 days</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1 text-muted-foreground"
          onClick={() => onChange(DEFAULT_FILTERS)}
        >
          <X className="h-3 w-3" />
          Clear ({activeCount})
        </Button>
      )}
    </div>
  );
}
