import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboardStats, useDailyApplications, useDashboardUpcoming, useFollowUps, useInterviewInsights, useActivityHeatmap } from '@/hooks/use-dashboard';
import { STAGE_LABELS, STAGE_COLORS, INTERVIEW_TYPE_LABELS, STAGE_ORDER } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfWeek, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Briefcase, TrendingUp, Calendar, Award, Clock, MessageSquare, Star, Flame } from 'lucide-react';
import React, { useMemo } from 'react';

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{format(new Date(label), 'MMM d, yyyy')}</p>
      <p className="text-muted-foreground">{payload[0].value} application{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  );
}

function ActivityHeatmap({ data }: { data: { date: string; count: number }[] }) {
  const { weeks, months, maxCount, currentStreak, longestStreak, totalInPeriod } = useMemo(() => {
    const countMap = new Map(data.map((d) => [d.date, d.count]));

    // Build weeks grid: columns = weeks, rows = days (Sun=0 to Sat=6)
    const today = new Date();
    // Go back ~26 weeks (6 months)
    const numWeeks = 26;
    const gridStart = subDays(startOfWeek(today, { weekStartsOn: 0 }), (numWeeks - 1) * 7);

    const weeks: { date: string; count: number; day: number }[][] = [];
    let max = 0;
    let total = 0;
    const cursor = new Date(gridStart);

    for (let w = 0; w < numWeeks; w++) {
      const week: { date: string; count: number; day: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const key = cursor.toISOString().slice(0, 10);
        const count = cursor <= today ? (countMap.get(key) ?? 0) : -1; // -1 = future
        if (count > max) max = count;
        if (count > 0) total += count;
        week.push({ date: key, count, day: d });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    // Month labels
    const months: { label: string; col: number }[] = [];
    let lastMonth = '';
    for (let w = 0; w < weeks.length; w++) {
      const firstDay = weeks[w][0];
      const m = format(new Date(firstDay.date), 'MMM');
      if (m !== lastMonth) {
        months.push({ label: m, col: w });
        lastMonth = m;
      }
    }

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    // Walk backwards from today
    const todayKey = today.toISOString().slice(0, 10);
    const d = new Date(today);
    let foundCurrent = false;
    for (let i = 0; i < 365; i++) {
      const key = d.toISOString().slice(0, 10);
      const c = countMap.get(key) ?? 0;
      if (c > 0) {
        tempStreak++;
        if (!foundCurrent) currentStreak = tempStreak;
      } else {
        if (!foundCurrent && i > 0) foundCurrent = true;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        tempStreak = 0;
      }
      d.setDate(d.getDate() - 1);
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;
    if (currentStreak > longestStreak) longestStreak = currentStreak;

    return { weeks, months, maxCount: max, currentStreak, longestStreak, totalInPeriod: total };
  }, [data]);

  const getColor = (count: number) => {
    if (count < 0) return 'bg-transparent';
    if (count === 0) return 'bg-muted';
    if (maxCount <= 1) return 'bg-emerald-500';
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 'bg-emerald-200 dark:bg-emerald-900';
    if (ratio <= 0.5) return 'bg-emerald-400 dark:bg-emerald-700';
    if (ratio <= 0.75) return 'bg-emerald-500 dark:bg-emerald-500';
    return 'bg-emerald-600 dark:bg-emerald-400';
  };

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Flame className="h-3.5 w-3.5 text-orange-500" />
          <span>Current streak: <span className="font-medium text-foreground">{currentStreak}d</span></span>
        </div>
        <div>
          Longest: <span className="font-medium text-foreground">{longestStreak}d</span>
        </div>
        <div>
          Total: <span className="font-medium text-foreground">{totalInPeriod}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-grid" style={{ gridTemplateColumns: `24px repeat(${weeks.length}, 16px)`, gap: '3px' }}>
          {/* Month labels row */}
          <div />
          {weeks.map((week, wi) => {
            const m = months.find((m) => m.col === wi);
            return (
              <div key={`m-${wi}`} className="text-[10px] text-muted-foreground leading-none h-4 flex items-end">
                {m?.label ?? ''}
              </div>
            );
          })}
          {/* Day rows */}
          {dayLabels.map((label, di) => (
            <React.Fragment key={`row-${di}`}>
              <div className="text-[10px] text-muted-foreground leading-[13px] h-[13px] pr-1 text-right">
                {label}
              </div>
              {weeks.map((week, wi) => {
                const day = week[di];
                return (
                  <div
                    key={`${wi}-${di}`}
                    className={`w-[13px] h-[13px] rounded-sm ${getColor(day.count)}`}
                    title={day.count >= 0 ? `${format(new Date(day.date), 'MMM d, yyyy')}: ${day.count} app${day.count !== 1 ? 's' : ''}` : ''}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground justify-end">
        <span>Less</span>
        <div className="w-[11px] h-[11px] rounded-sm bg-muted" />
        <div className="w-[11px] h-[11px] rounded-sm bg-emerald-200 dark:bg-emerald-900" />
        <div className="w-[11px] h-[11px] rounded-sm bg-emerald-400 dark:bg-emerald-700" />
        <div className="w-[11px] h-[11px] rounded-sm bg-emerald-500 dark:bg-emerald-500" />
        <div className="w-[11px] h-[11px] rounded-sm bg-emerald-600 dark:bg-emerald-400" />
        <span>More</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: daily = [] } = useDailyApplications(7);
  const { data: upcoming = [] } = useDashboardUpcoming();
  const { data: followUps = [] } = useFollowUps();
  const { data: insights = [] } = useInterviewInsights();
  const { data: heatmapData = [] } = useActivityHeatmap();
  const navigate = useNavigate();

  const activeCount = stats?.byStage
    ?.filter((s) => !['REJECTED', 'WITHDRAWN', 'OFFER'].includes(s.stage))
    .reduce((sum, s) => sum + s._count, 0) ?? 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-8 w-16 bg-muted animate-pulse rounded mt-2" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-4 h-64 bg-muted/30 animate-pulse" />
          <Card className="p-4 h-64 bg-muted/30 animate-pulse" />
        </div>
      </div>
    );
  }

  const offerRate = (stats?.total ?? 0) > 0
    ? Math.round(((stats?.offers ?? 0) / stats!.total) * 100)
    : 0;

  const statCards = [
    { icon: Briefcase, label: 'Total Applications', value: stats?.total ?? 0, color: 'text-blue-500' },
    { icon: TrendingUp, label: 'Active', value: activeCount, color: 'text-emerald-500' },
    { icon: Calendar, label: 'Response Rate', value: `${stats?.responseRate ?? 0}%`, color: 'text-violet-500' },
    { icon: Award, label: 'Offers', value: `${stats?.offers ?? 0} (${offerRate}%)`, color: 'text-amber-500' },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Icon className={`h-4 w-4 ${color}`} />
              {label}
            </div>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">Pipeline</h3>
          <div className="space-y-2">
            {STAGE_ORDER.map((stage) => {
              const count = stats?.byStage?.find((s) => s.stage === stage)?._count ?? 0;
              const pct = stats?.total ? (count / stats.total) * 100 : 0;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <Badge variant="secondary" className={`text-xs w-24 justify-center ${STAGE_COLORS[stage]}`}>
                    {STAGE_LABELS[stage]}
                  </Badge>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: 'var(--foreground)', opacity: 0.7 }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">This Week</h3>
          {daily.some((d) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={daily}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => format(new Date(v), 'EEE')}
                  fontSize={11}
                />
                <YAxis allowDecimals={false} fontSize={11} width={24} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--accent)', opacity: 0.5 }} />
                <Bar dataKey="count" fill="var(--foreground)" opacity={0.8} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Briefcase className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No applications this week</p>
              <p className="text-xs mt-1">Set applied dates to see your daily activity</p>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          Application Activity
        </h3>
        {heatmapData.length > 0 ? (
          <ActivityHeatmap data={heatmapData} />
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <Briefcase className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No application history yet</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            Upcoming Interviews
          </h3>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <Calendar className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No upcoming interviews</p>
            </div>
          ) : (
            <div className="space-y-1">
              {upcoming.map((round) => (
                <div
                  key={round.id}
                  className="p-2.5 rounded-md hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => navigate(`/applications/${round.applicationId}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{round.application?.company.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {INTERVIEW_TYPE_LABELS[round.type]} - Round {round.roundNumber}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {round.scheduledAt ? format(new Date(round.scheduledAt), 'MMM d, h:mm a') : ''}
                    </span>
                  </div>
                  {round.prepNotes && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 pl-0.5 border-l-2 border-muted ml-0.5">
                      <span className="pl-1.5">{round.prepNotes}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-violet-500" />
            Recent Interview Insights
          </h3>
          {insights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No interview reflections yet</p>
              <p className="text-xs mt-1">Complete interviews and add reflections to see insights</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[280px] overflow-y-auto">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-2.5 rounded-md hover:bg-accent cursor-pointer transition-colors border border-transparent hover:border-border"
                  onClick={() => navigate(`/applications/${insight.applicationId}`)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{insight.companyName}</span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {INTERVIEW_TYPE_LABELS[insight.type]}
                      </Badge>
                    </div>
                    {insight.difficulty && (
                      <div className="flex items-center gap-0.5 shrink-0 ml-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`h-2.5 w-2.5 ${n <= insight.difficulty! ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-600'}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {insight.reflection && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{insight.reflection}</p>
                  )}
                  {insight.prepTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {insight.prepTopics.slice(0, 4).map((topic, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {topic.title}
                        </span>
                      ))}
                      {insight.prepTopics.length > 4 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          +{insight.prepTopics.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {followUps.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            Follow-ups Due
          </h3>
          <div className="space-y-1">
            {followUps.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between p-2.5 rounded-md hover:bg-accent cursor-pointer transition-colors"
                onClick={() => navigate(`/applications/${app.id}`)}
              >
                <div>
                  <p className="text-sm font-medium">{app.company.name}</p>
                  <p className="text-xs text-muted-foreground">{app.role}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {app.followUpDate ? format(new Date(app.followUpDate), 'MMM d') : ''}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
