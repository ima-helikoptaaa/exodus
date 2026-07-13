import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboardStats, useDailyApplications, useDashboardUpcoming, useFollowUps, useInterviewInsights, useActivityHeatmap } from '@/hooks/use-dashboard';
import { STAGE_LABELS, STAGE_DOT_COLORS, INTERVIEW_TYPE_LABELS, STAGE_ORDER } from '@/types';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format, startOfWeek, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Briefcase, TrendingUp, Calendar, Award, Clock, MessageSquare, Star, Flame, ArrowUpRight, Target } from 'lucide-react';
import React, { useMemo } from 'react';

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border glass px-3 py-2 text-sm shadow-xl">
      <p className="font-medium font-mono text-xs">{format(new Date(label!), 'EEE, MMM d')}</p>
      <p className="text-primary font-mono text-lg font-bold mt-0.5">{payload[0].value}</p>
      <p className="text-muted-foreground text-xs">application{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  );
}

function ActivityHeatmap({ data }: { data: { date: string; count: number }[] }) {
  const { weeks, months, maxCount, currentStreak, longestStreak, totalInPeriod } = useMemo(() => {
    const countMap = new Map(data.map((d) => [d.date, d.count]));
    const today = new Date();
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
        const count = cursor <= today ? (countMap.get(key) ?? 0) : -1;
        if (count > max) max = count;
        if (count > 0) total += count;
        week.push({ date: key, count, day: d });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

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

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
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
    if (count === 0) return 'bg-muted/50';
    if (maxCount <= 1) return 'bg-primary';
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 'bg-primary/25';
    if (ratio <= 0.5) return 'bg-primary/45';
    if (ratio <= 0.75) return 'bg-primary/70';
    return 'bg-primary';
  };

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  return (
    <div>
      <div className="flex items-center gap-5 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <Flame className="h-3.5 w-3.5 text-accent-foreground" />
          <span className="text-muted-foreground">Current: <span className="font-mono font-bold text-foreground">{currentStreak}d</span></span>
        </div>
        <div className="text-muted-foreground">
          Best: <span className="font-mono font-bold text-foreground">{longestStreak}d</span>
        </div>
        <div className="text-muted-foreground">
          Total: <span className="font-mono font-bold text-foreground">{totalInPeriod}</span>
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <div className="inline-grid" style={{ gridTemplateColumns: `28px repeat(${weeks.length}, 16px)`, gap: '3px' }}>
          <div />
          {weeks.map((_week, wi) => {
            const m = months.find((m) => m.col === wi);
            return (
              <div key={`m-${wi}`} className="text-[10px] text-muted-foreground leading-none h-4 flex items-end font-mono">
                {m?.label ?? ''}
              </div>
            );
          })}
          {dayLabels.map((label, di) => (
            <React.Fragment key={`row-${di}`}>
              <div className="text-[10px] text-muted-foreground leading-[13px] h-[13px] pr-1 text-right font-mono">
                {label}
              </div>
              {weeks.map((week, wi) => {
                const day = week[di];
                return (
                  <div
                    key={`${wi}-${di}`}
                    className={`w-[13px] h-[13px] rounded-sm transition-all hover:scale-125 ${getColor(day.count)}`}
                    title={day.count >= 0 ? `${format(new Date(day.date), 'MMM d, yyyy')}: ${day.count} app${day.count !== 1 ? 's' : ''}` : ''}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground justify-end font-mono">
        <span>Less</span>
        <div className="w-[11px] h-[11px] rounded-sm bg-muted/50" />
        <div className="w-[11px] h-[11px] rounded-sm bg-primary/25" />
        <div className="w-[11px] h-[11px] rounded-sm bg-primary/45" />
        <div className="w-[11px] h-[11px] rounded-sm bg-primary/70" />
        <div className="w-[11px] h-[11px] rounded-sm bg-primary" />
        <span>More</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: daily = [] } = useDailyApplications(14);
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
        <h1 className="text-2xl font-heading font-bold tracking-tight">Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-5 animate-pulse">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-10 w-20 bg-muted rounded mt-3" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-5 h-64 bg-muted/20 animate-pulse lg:col-span-2" />
          <Card className="p-5 h-64 bg-muted/20 animate-pulse" />
        </div>
      </div>
    );
  }

  const offerRate = (stats?.total ?? 0) > 0
    ? Math.round(((stats?.offers ?? 0) / stats!.total) * 100)
    : 0;

  const statCards = [
    { icon: Briefcase, label: 'Total Applications', value: stats?.total ?? 0, sub: 'all time', accent: false },
    { icon: TrendingUp, label: 'Active', value: activeCount, sub: 'in progress', accent: false },
    { icon: Target, label: 'Response Rate', value: `${stats?.responseRate ?? 0}%`, sub: 'of applied', accent: true },
    { icon: Award, label: 'Offers', value: stats?.offers ?? 0, sub: `${offerRate}% rate`, accent: true },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your job search at a glance</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ icon: Icon, label, value, sub, accent }, i) => (
          <Card
            key={label}
            className={`p-5 relative overflow-hidden group hover:border-primary/30 transition-all duration-300 animate-in-up`}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${accent ? 'bg-accent/10' : 'bg-primary/10'}`}>
                <Icon className={`h-5 w-5 ${accent ? 'text-accent-foreground' : 'text-primary'}`} strokeWidth={2} />
              </div>
            </div>
            <p className="text-3xl font-heading font-bold font-mono tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono uppercase tracking-wider">{sub}</p>
          </Card>
        ))}
      </div>

      {/* Pipeline + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-heading font-semibold mb-4 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            Pipeline Distribution
          </h3>
          <div className="space-y-2.5">
            {STAGE_ORDER.map((stage) => {
              const count = stats?.byStage?.find((s) => s.stage === stage)?._count ?? 0;
              const pct = stats?.total ? (count / stats.total) * 100 : 0;
              return (
                <div key={stage} className="flex items-center gap-3 group">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${STAGE_DOT_COLORS[stage]}`} />
                  <span className="text-xs text-muted-foreground w-20 shrink-0 group-hover:text-foreground transition-colors">{STAGE_LABELS[stage]}</span>
                  <div className="flex-1 bg-muted/30 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${STAGE_DOT_COLORS[stage]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono tabular-nums text-muted-foreground w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-3">
          <h3 className="text-sm font-heading font-semibold mb-4 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Last 14 Days
          </h3>
          {daily.some((d) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => format(new Date(v), 'EEE')}
                  fontSize={10}
                  tick={{ fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis allowDecimals={false} fontSize={10} width={28} tick={{ fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} fill="url(#chartGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Briefcase className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No applications yet</p>
              <p className="text-xs mt-1 text-muted-foreground/60">Start applying to see your activity</p>
            </div>
          )}
        </Card>
      </div>

      {/* Activity heatmap */}
      <Card className="p-5">
        <h3 className="text-sm font-heading font-semibold mb-4 flex items-center gap-2">
          <Flame className="h-4 w-4 text-accent-foreground" />
          Application Activity
        </h3>
        {heatmapData.length > 0 ? (
          <ActivityHeatmap data={heatmapData} />
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Briefcase className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No application history yet</p>
          </div>
        )}
      </Card>

      {/* Upcoming + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-heading font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Upcoming Interviews
          </h3>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Calendar className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No upcoming interviews</p>
            </div>
          ) : (
            <div className="space-y-1">
              {upcoming.map((round) => (
                <div
                  key={round.id}
                  className="p-3 rounded-lg hover:bg-secondary/40 cursor-pointer transition-all group flex items-center gap-3"
                  onClick={() => navigate(`/applications/${round.applicationId}`)}
                >
                  <div className="h-10 w-1 rounded-full bg-primary/60 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{round.application?.company.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {INTERVIEW_TYPE_LABELS[round.type]} · Round {round.roundNumber}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono text-foreground">{round.scheduledAt ? format(new Date(round.scheduledAt), 'MMM d') : ''}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{round.scheduledAt ? format(new Date(round.scheduledAt), 'h:mm a') : ''}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-heading font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-accent-foreground" />
            Interview Insights
          </h3>
          {insights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No reflections yet</p>
              <p className="text-xs mt-1 text-muted-foreground/60">Complete interviews to see insights</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto scrollbar-thin pr-1">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-3 rounded-lg hover:bg-secondary/40 cursor-pointer transition-all border border-transparent hover:border-border/50"
                  onClick={() => navigate(`/applications/${insight.applicationId}`)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{insight.companyName}</span>
                      <Badge variant="secondary" className="text-[10px] shrink-0 font-mono">
                        {INTERVIEW_TYPE_LABELS[insight.type]}
                      </Badge>
                    </div>
                    {insight.difficulty && (
                      <div className="flex items-center gap-0.5 shrink-0 ml-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`h-2.5 w-2.5 ${n <= insight.difficulty! ? 'text-accent-foreground fill-accent-foreground' : 'text-muted-foreground/20'}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {insight.reflection && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{insight.reflection}</p>
                  )}
                  {insight.prepTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {insight.prepTopics.slice(0, 4).map((topic, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/50 text-muted-foreground font-mono">
                          {topic.title}
                        </span>
                      ))}
                      {insight.prepTopics.length > 4 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/50 text-muted-foreground font-mono">
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

      {/* Follow-ups */}
      {followUps.length > 0 && (
        <Card className="p-5 border-accent/20">
          <h3 className="text-sm font-heading font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent-foreground" />
            Follow-ups Due
            <Badge variant="secondary" className="text-[10px] font-mono ml-1 bg-accent/15 text-accent-foreground">{followUps.length}</Badge>
          </h3>
          <div className="space-y-1">
            {followUps.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/40 cursor-pointer transition-all group"
                onClick={() => navigate(`/applications/${app.id}`)}
              >
                <div>
                  <p className="text-sm font-medium">{app.company.name}</p>
                  <p className="text-xs text-muted-foreground">{app.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">
                    {app.followUpDate ? format(new Date(app.followUpDate), 'MMM d') : ''}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
