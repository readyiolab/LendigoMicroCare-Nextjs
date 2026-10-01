import React, { useState } from 'react';
import {
  TrendingUp,
  Calendar,
  RefreshCw,
  IndianRupee,
  HandCoins,
  Scale,
  MapPin,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PendingCollectionMISPanel from '@/components/admin/collections/PendingCollectionMISPanel';
import CollectionKpiGrid from '@/components/admin/collections/shared/CollectionKpiGrid';
import CollectionSection from '@/components/admin/collections/shared/CollectionSection';
import CollectionSegmentedControl from '@/components/admin/collections/shared/CollectionSegmentedControl';
import CollectionEmptyState from '@/components/admin/collections/shared/CollectionEmptyState';
import { formatInr } from '@/components/admin/collections/shared/collectionUi';

const PERIOD_OPTIONS = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom' },
];

function periodLabel(period) {
  if (period === 'week') return 'this week';
  if (period === 'custom') return 'selected period';
  return 'this month';
}

function trendIntensity(amount, maxAmount) {
  if (!maxAmount || amount <= 0) return 0;
  const ratio = amount / maxAmount;
  if (ratio < 0.15) return 0;
  if (ratio < 0.4) return 1;
  if (ratio < 0.7) return 2;
  return 3;
}

export default function CollectionDashboard({
  data,
  period = 'month',
  customStart = '',
  customEnd = '',
  onPeriodChange,
  onRefresh,
  onViewOverdueList,
  onOpenReports,
  onWorkflowAlert,
  onOpenTodayWork,
  onKpiClick,
}) {
  const [localCustomStart, setLocalCustomStart] = useState(customStart);
  const [localCustomEnd, setLocalCustomEnd] = useState(customEnd);

  if (!data) {
    return (
      <div className="border border-slate-200 bg-white">
        <CollectionEmptyState loading />
      </div>
    );
  }

  const label = periodLabel(period);
  const month = data.month || {};
  const portfolio = data.portfolio || {};
  const workflow = data.workflow || {};
  const buckets = data.dpdBuckets || [];
  const trend = data.trend30Days || [];
  const dueThisMonth = Number(month.dueThisMonth || 0);
  const collected = Number(month.collected || 0);
  const lateChargesCollected = Number(month.lateChargesCollected || 0);
  const progressPct = dueThisMonth > 0 ? Math.min(100, Math.round((collected / dueThisMonth) * 100)) : 0;
  const maxTrend = Math.max(0, ...trend.map((t) => Number(t.overdueAmount || 0)));
  const bucketTotal = buckets.reduce((sum, b) => sum + Number(b.totalDue || 0), 0);

  const trendByDate = {};
  for (const t of trend) {
    trendByDate[t.date] = t;
  }

  const kpis = [
    {
      key: 'collected',
      label: `Collected ${label}`,
      value: formatInr(collected),
      hint: lateChargesCollected > 0
        ? `${month.collectedCount || 0} repayments · incl. ${formatInr(lateChargesCollected)} late charges`
        : `${month.collectedCount || 0} repayments`,
      tone: 'success',
    },
    {
      key: 'pending',
      label: 'Pending to collect',
      value: formatInr(month.pendingThisMonth),
      hint: `${month.pendingAccounts || 0} accounts`,
      tone: 'warning',
      onClick: onKpiClick ? () => onKpiClick('pending') : undefined,
    },
    {
      key: 'recovery',
      label: 'Recovery rate',
      value: `${portfolio.recoveryRatePct || 0}%`,
      hint: 'Collected vs overdue principal',
      tone: 'info',
    },
    {
      key: 'dueToday',
      label: 'Due today',
      value: data.todayDue?.count || 0,
      hint: formatInr(data.todayDue?.amount),
      tone: 'warning',
      onClick: onKpiClick ? () => onKpiClick('dueToday') : undefined,
    },
    {
      key: 'overdue',
      label: 'Total overdue',
      value: data.overdue?.count || 0,
      hint: formatInr(data.overdue?.total),
      tone: 'danger',
      onClick: onKpiClick ? () => onKpiClick('overdue') : undefined,
    },
    {
      key: 'upcoming7',
      label: 'Due in 7 days',
      value: data.upcoming7Days?.count || 0,
      hint: formatInr(data.upcoming7Days?.amount),
      tone: 'info',
      onClick: onKpiClick ? () => onKpiClick('upcoming7') : undefined,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-semibold text-slate-900">Recovery overview</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CollectionSegmentedControl
            options={PERIOD_OPTIONS}
            value={period}
            onChange={(p) => {
              if (p !== 'custom') onPeriodChange?.(p);
            }}
          />
          {period === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={localCustomStart}
                onChange={(e) => setLocalCustomStart(e.target.value)}
                className="h-8 px-2 text-xs border border-slate-200 bg-white"
              />
              <span className="text-slate-400 text-xs">–</span>
              <input
                type="date"
                value={localCustomEnd}
                onChange={(e) => setLocalCustomEnd(e.target.value)}
                className="h-8 px-2 text-xs border border-slate-200 bg-white"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => localCustomStart && localCustomEnd && onPeriodChange?.('custom', localCustomStart, localCustomEnd)}
                disabled={!localCustomStart || !localCustomEnd}
                className="h-8 text-xs"
              >
                Apply
              </Button>
            </div>
          )}
          {onOpenReports && (
            <Button type="button" variant="outline" size="sm" onClick={onOpenReports} className="h-8 gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" /> MIS
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} className="h-8 gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      <CollectionKpiGrid items={kpis} className="lg:grid-cols-3" />

      <CollectionSection title={`Period progress (${label})`} subtitle={`${progressPct}% collected vs due`}>
        <div className="h-2 bg-slate-100 overflow-hidden">
          <div className="h-full bg-emerald-600" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
          <div>
            <p className="text-xs text-slate-500">Due {label}</p>
            <p className="font-semibold tabular-nums">{formatInr(dueThisMonth)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Collected</p>
            <p className="font-semibold tabular-nums text-emerald-700">{formatInr(collected)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Still pending</p>
            <p className="font-semibold tabular-nums text-amber-700">{formatInr(month.pendingThisMonth)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Overdue {label}</p>
            <p className="font-semibold tabular-nums text-red-600">{formatInr(month.overdueThisMonth)}</p>
          </div>
        </div>
      </CollectionSection>

      {data.overdue?.count > 0 && (
        <CollectionSection
          title="Overdue amount details"
          actions={
            onViewOverdueList && (
              <Button type="button" variant="outline" size="sm" onClick={onViewOverdueList} className="h-8 text-xs">
                View {data.overdue.count} in overdue list
              </Button>
            )
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Principal due</p>
              <p className="text-lg font-semibold tabular-nums">{formatInr(data.overdue.principal)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Late charges</p>
              <p className="text-lg font-semibold tabular-nums text-red-600">{formatInr(data.overdue.penalty)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total to collect</p>
              <p className="text-lg font-semibold tabular-nums text-red-700">{formatInr(data.overdue.total)}</p>
            </div>
          </div>
        </CollectionSection>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CollectionSection title="DPD buckets">
          {buckets.length === 0 ? (
            <p className="text-sm text-slate-500">No overdue buckets</p>
          ) : (
            <div className="space-y-3">
              {buckets.map((bucket, idx) => (
                <div key={bucket.bucket || idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">{bucket.bucket} · {bucket.count} accounts</span>
                    <span className="font-semibold tabular-nums">{formatInr(bucket.totalDue)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100">
                    <div
                      className={cn('h-full', idx === 0 ? 'bg-blue-600' : 'bg-amber-500')}
                      style={{
                        width: `${bucketTotal > 0 ? Math.max(8, (Number(bucket.totalDue || 0) / bucketTotal) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollectionSection>

        <CollectionSection title="Workflow alerts">
          <div className="space-y-2 text-sm">
            {[
              { key: 'ptpDueToday', icon: HandCoins, label: 'PTP due today', value: workflow.ptpDueToday || 0 },
              { key: 'settlementsPending', icon: Scale, label: 'Settlements pending approval', value: workflow.settlementsPendingApproval || 0 },
              { key: 'visitRequired', icon: MapPin, label: 'Visit required', value: workflow.visitRequiredCount || 0 },
              { key: 'punchesPending', icon: IndianRupee, label: 'Collections pending approval', value: workflow.punchesPendingApproval || 0 },
              { key: 'portfolioPending', icon: IndianRupee, label: 'Portfolio pending accounts', value: portfolio.totalPendingAccounts || 0 },
            ].map((row) => (
              <button
                key={row.label}
                type="button"
                onClick={() => onWorkflowAlert?.(row.key)}
                className="w-full flex items-center justify-between border border-slate-100 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center gap-2 text-slate-700">
                  <row.icon className="w-4 h-4 text-slate-500" />
                  {row.label}
                </span>
                <span className="font-semibold tabular-nums text-blue-700">{row.value}</span>
              </button>
            ))}
          </div>
          {onOpenTodayWork && (
            <Button type="button" variant="outline" size="sm" className="mt-3 w-full" onClick={onOpenTodayWork}>
              Open today’s work
            </Button>
          )}
        </CollectionSection>
      </div>

      <CollectionSection
        title="Daily overdue by due date (last 30 days)"
        subtitle="Heat intensity by overdue amount"
      >
        <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-15 gap-1.5">
          {Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (29 - i));
            const key = date.toISOString().slice(0, 10);
            const isToday = i === 29;
            const dayOfWeek = date.getDay();
            const point = trendByDate[key];
            const amount = Number(point?.overdueAmount || 0);
            const count = Number(point?.overdueCount || 0);
            const intensity = trendIntensity(amount, maxTrend);
            const heatColors = [
              'bg-slate-50 border-slate-200 text-slate-500',
              'bg-amber-50 border-amber-200 text-amber-800',
              'bg-orange-100 border-orange-200 text-orange-900',
              'bg-red-600 border-red-700 text-white',
            ];

            return (
              <div
                key={key}
                title={`${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} · ${count} overdue · ${formatInr(amount)}`}
                className={cn(
                  'aspect-square border flex flex-col items-center justify-center text-[10px] font-medium',
                  heatColors[intensity],
                  isToday && 'ring-1 ring-slate-900 ring-offset-1'
                )}
              >
                <span className="text-[8px] opacity-60">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]}
                </span>
                <span>{date.getDate()}</span>
              </div>
            );
          })}
        </div>
      </CollectionSection>

      <PendingCollectionMISPanel compact />
    </div>
  );
}
