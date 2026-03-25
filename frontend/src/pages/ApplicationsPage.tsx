import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplications } from '@/hooks/use-applications';
import { useDebounce } from '@/hooks/use-debounce';
import ApplicationForm from '@/components/applications/ApplicationForm';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { STAGE_LABELS, STAGE_COLORS, STAGE_ORDER } from '@/types';
import type { Application } from '@/types';
import { format } from 'date-fns';
import { Search, Briefcase, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type SortKey = 'company' | 'role' | 'stage' | 'applied' | 'salary';
type SortDir = 'asc' | 'desc';

export default function ApplicationsPage() {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('applied');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const debouncedSearch = useDebounce(search);
  const { data: applications = [], isLoading } = useApplications({ search: debouncedSearch || undefined });
  const navigate = useNavigate();

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'applied' ? 'desc' : 'asc');
    }
  }

  const sorted = useMemo(() => {
    const arr = [...applications];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'company':
          return dir * a.company.name.localeCompare(b.company.name);
        case 'role':
          return dir * a.role.localeCompare(b.role);
        case 'stage':
          return dir * (STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));
        case 'applied': {
          const da = a.appliedDate ? new Date(a.appliedDate).getTime() : 0;
          const db = b.appliedDate ? new Date(b.appliedDate).getTime() : 0;
          return dir * (da - db);
        }
        case 'salary':
          return dir * ((a.salaryMin ?? 0) - (b.salaryMin ?? 0));
        default:
          return 0;
      }
    });
    return arr;
  }, [applications, sortKey, sortDir]);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  }

  function SortableHead({ col, children, className }: { col: SortKey; children: React.ReactNode; className?: string }) {
    return (
      <TableHead
        className={`cursor-pointer select-none hover:text-foreground transition-colors ${className ?? ''}`}
        onClick={() => toggleSort(col)}
      >
        <span className="flex items-center">
          {children}
          <SortIcon col={col} />
        </span>
      </TableHead>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Applications</h1>
        <ApplicationForm />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company or role..."
          className="pl-9 max-w-sm"
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead col="company">Company</SortableHead>
              <SortableHead col="role">Role</SortableHead>
              <SortableHead col="stage">Stage</SortableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
              <SortableHead col="salary" className="hidden lg:table-cell">Salary</SortableHead>
              <SortableHead col="applied" className="hidden md:table-cell">Applied</SortableHead>
              <TableHead className="hidden lg:table-cell">Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(7)].map((_, j) => (
                    <TableCell key={j} className={j >= 3 && j < 5 ? 'hidden md:table-cell' : j >= 5 ? 'hidden lg:table-cell' : ''}>
                      <div className="h-4 bg-muted animate-pulse rounded w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Briefcase className="h-10 w-10 mb-3 opacity-40" />
                    <p className="text-sm font-medium">
                      {search ? 'No matching applications' : 'No applications yet'}
                    </p>
                    <p className="text-xs mt-1">
                      {search ? 'Try a different search term' : 'Add one to get started'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((app) => (
                <TableRow
                  key={app.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => navigate(`/applications/${app.id}`)}
                >
                  <TableCell className="font-medium">{app.company.name}</TableCell>
                  <TableCell>{app.role}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`text-xs ${STAGE_COLORS[app.stage]}`}>
                      {STAGE_LABELS[app.stage]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                    {app.isRemote ? 'Remote' : app.location ?? '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                    {app.salaryMin && app.salaryMax
                      ? `${app.salaryMin / 1000}k-${app.salaryMax / 1000}k`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                    {app.appliedDate ? format(new Date(app.appliedDate), 'MMM d') : '-'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex gap-1">
                      {app.tags.slice(0, 2).map(({ tag }) => (
                        <Badge key={tag.id} variant="secondary" className="text-[10px]">{tag.name}</Badge>
                      ))}
                      {app.tags.length > 2 && (
                        <Badge variant="secondary" className="text-[10px]">+{app.tags.length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
