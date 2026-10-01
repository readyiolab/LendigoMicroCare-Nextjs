import React from 'react';
import { useNavigate } from '@/lib/router';
import {
  FolderKanban,
  CheckCircle2,
  XCircle,
  FileEdit,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Send,
  Scale,
  Sparkles,
  Users,
  Banknote,
  Receipt,
  FileText,
  BadgeCheck,
  Coins,
  ChevronRight,
  Video,
  PenTool,
  CheckCheck,
  TrendingUp,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);

const formatNumber = (val) =>
  new Intl.NumberFormat('en-IN').format(val || 0);

export default function ApplicationKpiMetrics({
  applications,
  amounts,
  users,
  loading = false,
}) {
  const navigate = useNavigate();

  // Financial amounts (aligned with Analytics formulas via dashboard API)
  const disbursedAmount = Number(amounts?.totalDisbursed ?? applications?.disbursedAmount ?? 0);
  const pfDeductedAmount = Number(amounts?.totalPfDeducted ?? 0);
  const recoveredAmount = Number(amounts?.totalRepaid ?? 0);
  const repaymentPending = Number(amounts?.repaymentPending ?? amounts?.outstanding ?? 0);
  const totalSanctionedAmount = Number(
    amounts?.totalSanctionedAmount ?? applications?.totalSanctionedAmount ?? disbursedAmount
  );
  const sanctionedCases = Number(
    applications?.sanctionedCases ?? 0
  );

  const disbursedChange = Number(amounts?.disbursedChange || 0);
  const disbursedDelta = Number(amounts?.disbursedDelta || 0);
  const recoveredChange = Number(amounts?.recoveredChange || 0);
  const recoveredDelta = Number(amounts?.recoveredDelta || 0);

  // Application counts
  const total = Number(applications?.total || 0);
  const disbursed = Number(applications?.disbursed || 0);
  const rejected = Number(applications?.rejected || 0);
  const draft = Number(applications?.draft || 0);
  const submitted = Number(applications?.submitted || 0);
  const inReview = Number(applications?.inReview || 0);
  const approved = Number(applications?.approved || 0);
  const readyForDisbursal = Number(applications?.readyForDisbursal || 0);

  const totalAmount = Number(applications?.totalAmount || 0);
  const rejectedAmount = Number(applications?.rejectedAmount || 0);
  const draftAmount = Number(applications?.draftAmount || 0);
  const submittedAmount = Number(applications?.submittedAmount || 0);
  const inReviewAmount = Number(applications?.inReviewAmount || 0);
  const approvedAmount = Number(applications?.approvedAmount || 0);
  const readyForDisbursalAmount = Number(applications?.readyForDisbursalAmount || 0);

  const conversionRate = Number(applications?.conversionRate || 0);
  const rejectionRate = Number(applications?.rejectionRate || 0);
  const approvalRate = Number(applications?.approvalRate || 0);
  const recoveryRate = Number(amounts?.recoveryRate || 0);

  const byStatus = applications?.byStatus || {};

  // Financial Cards: net disbursement, sanctioned amount, PF, recovered, pending repayment
  const financialCards = [
    {
      id: 'disbursed',
      label: 'Net Disbursement',
      value: formatCurrency(disbursedAmount),
      badge: `${disbursedChange >= 0 ? '↑' : '↓'} ${Math.abs(disbursedChange)}%`,
      badgeColor: disbursedChange >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200',
      icon: Banknote,
      iconBg: 'bg-emerald-600 text-white',
      accentColor: 'border-emerald-200 hover:border-emerald-400 bg-white',
      subtext: `${disbursedChange >= 0 ? 'Increased' : 'Down'} by ${formatCurrency(disbursedDelta)} from last month`,
      path: '/admin/applications?status=disbursed',
    },
    {
      id: 'sanctioned',
      label: 'Total Sanction Amount',
      value: formatCurrency(totalSanctionedAmount),
      badge: `${formatNumber(sanctionedCases || approved + disbursed)} cases`,
      badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
      icon: BadgeCheck,
      iconBg: 'bg-teal-600 text-white',
      accentColor: 'border-teal-200 hover:border-teal-400 bg-white',
      subtext: 'Cumulative loan limit approved & sanctioned',
      path: '/admin/applications?status=approved',
    },
    {
      id: 'pf_deducted',
      label: 'PF Deducted (18% GST)',
      value: formatCurrency(pfDeductedAmount),
      badge: 'PF + GST',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: Receipt,
      iconBg: 'bg-purple-600 text-white',
      accentColor: 'border-purple-200 hover:border-purple-400 bg-white',
      subtext: 'Processing fee including 18% GST',
      path: '/admin/applications?status=disbursed',
    },
    {
      id: 'recovered',
      label: 'Recovered',
      value: formatCurrency(recoveredAmount),
      badge: `${recoveryRate}% Rate`,
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Receipt,
      iconBg: 'bg-blue-600 text-white',
      accentColor: 'border-blue-200 hover:border-blue-400 bg-white',
      subtext: `${recoveredChange >= 0 ? 'Increased' : 'Down'} by ${formatCurrency(recoveredDelta)} from last month`,
      path: '/admin/applications?status=closed',
    },
    {
      id: 'repayment',
      label: 'Pending Repayment Amount',
      value: formatCurrency(repaymentPending),
      badge: 'Active Due',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Coins,
      iconBg: 'bg-amber-600 text-white',
      accentColor: 'border-amber-200 hover:border-amber-400 bg-white',
      subtext: 'Pending repayment due on active loans',
      path: '/admin/applications?status=disbursed',
    },
  ];

  // Case Count Cards: Total Cases, Disbursed Cases, Rejected Cases, Draft Cases
  const caseKpis = [
    {
      id: 'total',
      label: 'Total Cases',
      count: total,
      amount: totalAmount,
      badge: 'All Records',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: FolderKanban,
      iconColor: 'text-slate-700 bg-slate-100',
      accentColor: 'border-slate-200 hover:border-slate-300',
      subtext: 'Portfolio applications registered',
      path: '/admin/applications',
    },
    {
      id: 'disbursed_cases',
      label: 'Disbursed Cases',
      count: disbursed,
      amount: Number(applications?.disbursedAmount ?? disbursedAmount),
      badge: `${conversionRate}% Conv.`,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
      iconColor: 'text-emerald-700 bg-emerald-50',
      accentColor: 'border-emerald-200 hover:border-emerald-300',
      subtext: 'Loans successfully paid out',
      path: '/admin/applications?status=disbursed',
    },
    {
      id: 'rejected',
      label: 'Rejected Cases',
      count: rejected,
      amount: rejectedAmount,
      badge: `${rejectionRate}% Rej.`,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: XCircle,
      iconColor: 'text-rose-700 bg-rose-50',
      accentColor: 'border-rose-200 hover:border-rose-300',
      subtext: 'Declined at credit, KYC or underwriting',
      path: '/admin/applications?status=rejected',
    },
    {
      id: 'draft',
      label: 'Draft Cases',
      count: draft,
      amount: draftAmount,
      badge: 'Incomplete',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: FileEdit,
      iconColor: 'text-amber-700 bg-amber-50',
      accentColor: 'border-amber-200 hover:border-amber-300',
      subtext: 'Drop-offs & incomplete leads',
      path: '/admin/applications?status=draft',
    },
  ];

  // Pipeline Execution Strip
  const pipelineStages = [
    {
      id: 'submitted',
      title: 'New Submissions',
      count: submitted,
      amount: submittedAmount,
      stage: 'Awaiting Initial Review',
      icon: FileText,
      iconColor: 'text-blue-600 bg-blue-50',
      path: '/admin/applications?status=submitted',
    },
    {
      id: 'under_review',
      title: 'Under Verification',
      count: inReview,
      amount: inReviewAmount,
      stage: 'Credit, PD & Eligibility',
      icon: Scale,
      iconColor: 'text-indigo-600 bg-indigo-50',
      path: '/admin/applications?status=under_review',
    },
    {
      id: 'approved',
      title: 'Approved / Sanctioned',
      count: approved,
      amount: approvedAmount,
      stage: 'Sanctioned & Offer Stage',
      icon: ShieldCheck,
      iconColor: 'text-teal-600 bg-teal-50',
      path: '/admin/applications?status=approved',
    },
    {
      id: 'payment_pending',
      title: 'Ready to Disburse',
      count: readyForDisbursal,
      amount: readyForDisbursalAmount,
      stage: 'Mandate & E-sign Complete',
      icon: Send,
      iconColor: 'text-violet-600 bg-violet-50',
      path: '/admin/applications?status=payment_pending',
    },
  ];

  // Granular Queues
  const granularQueues = [
    { label: 'Under Review', status: 'under_review', count: byStatus['under_review'] || 0, icon: Clock },
    { label: 'Pending PD', status: 'pending_pd', count: byStatus['pending_pd'] || 0, icon: Users },
    { label: 'Recommended', status: 'recommended', count: byStatus['recommended'] || 0, icon: Sparkles },
    { label: 'Video KYC Pending', status: 'video_declaration_pending', count: byStatus['video_declaration_pending'] || 0, icon: Video },
    { label: 'E-sign Pending', status: 'esign_pending', count: byStatus['esign_pending'] || 0, icon: PenTool },
    { label: 'Mandate Pending', status: 'mandate_pending', count: byStatus['mandate_pending'] || 0, icon: Clock },
    { label: 'Payment Pending', status: 'payment_pending', count: byStatus['payment_pending'] || 0, icon: Coins },
    { label: 'Closed Loans', status: 'closed', count: byStatus['closed'] || 0, icon: CheckCheck },
  ];

  // Funnel Segments
  const funnelSegments = [
    { label: 'Draft', count: draft, color: 'bg-amber-400' },
    { label: 'Submitted', count: submitted, color: 'bg-blue-500' },
    { label: 'In Review', count: inReview, color: 'bg-indigo-500' },
    { label: 'Approved', count: approved, color: 'bg-teal-500' },
    { label: 'Disbursed', count: disbursed, color: 'bg-emerald-500' },
    { label: 'Rejected', count: rejected, color: 'bg-rose-500' },
  ];
  const funnelTotal = Math.max(1, total);

  return (
    <div className="space-y-3.5">
      {/* 1. Compact Financial Revenue & Capital Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {financialCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={() => navigate(card.path)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(card.path)}
              className={cn(
                'rounded-lg p-3.5 border shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all cursor-pointer hover:shadow-sm hover:border-slate-300 flex flex-col justify-between min-h-[108px] group',
                card.accentColor
              )}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0', card.iconBg)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 truncate group-hover:text-slate-900 transition-colors">
                    {card.label}
                  </span>
                </div>
                <span className={cn('text-[11px] font-semibold px-1.5 py-0.2 rounded border whitespace-nowrap', card.badgeColor)}>
                  {card.badge}
                </span>
              </div>

              {loading ? (
                <div className="my-1.5 h-6 w-28 bg-slate-100 animate-pulse rounded" />
              ) : (
                <div className="my-1">
                  <p className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {card.value}
                  </p>
                </div>
              )}

              <p className="text-[11px] text-slate-400 truncate">
                {card.subtext}
              </p>
            </div>
          );
        })}
      </div>

      {/* 2. Compact Core Case KPIs (Total, Disbursed, Rejected, Draft) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {caseKpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.id}
              onClick={() => navigate(kpi.path)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(kpi.path)}
              className={cn(
                'rounded-lg p-3.5 bg-white border shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all cursor-pointer hover:shadow-sm hover:border-slate-300 flex flex-col justify-between min-h-[108px] group',
                kpi.accentColor
              )}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0', kpi.iconColor)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 truncate group-hover:text-slate-900 transition-colors">
                    {kpi.label}
                  </span>
                </div>
                <span className={cn('text-[11px] font-semibold px-1.5 py-0.2 rounded border whitespace-nowrap', kpi.badgeColor)}>
                  {kpi.badge}
                </span>
              </div>

              {loading ? (
                <div className="my-1.5 h-6 w-20 bg-slate-100 animate-pulse rounded" />
              ) : (
                <div className="my-1 flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                      {formatNumber(kpi.count)}
                    </span>
                    <span className="text-[11px] text-slate-400">cases</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 tabular-nums">
                    {formatCurrency(kpi.amount)}
                  </span>
                </div>
              )}

              <p className="text-[11px] text-slate-400 truncate">
                {kpi.subtext}
              </p>
            </div>
          );
        })}
      </div>

      {/* 3. Compact Active Processing Pipeline */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Active Processing Pipeline
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            Click stage to filter applications
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {pipelineStages.map((stage) => {
            const Icon = stage.icon;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => navigate(stage.path)}
                className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-200 transition-all text-left flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0', stage.iconColor)}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 truncate group-hover:text-slate-900">
                      {stage.title}
                    </span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0" />
                </div>

                <div className="mt-2 flex items-baseline justify-between gap-1.5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-slate-900 tabular-nums">
                      {loading ? '—' : formatNumber(stage.count)}
                    </span>
                    <span className="text-[10px] text-slate-400">cases</span>
                  </div>
                  <span className="text-[11px] text-slate-600 font-medium tabular-nums">
                    {loading ? '—' : formatCurrency(stage.amount)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {stage.stage}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Compact Funnel & Health Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Pipeline Funnel */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Loan Portfolio Funnel Breakdown
              </h3>
              <span className="text-xs font-semibold text-slate-700">
                {formatNumber(total)} total cases
              </span>
            </div>

            {/* Funnel Progress Bar */}
            <div className="h-2.5 w-full rounded-full bg-slate-100 flex overflow-hidden gap-[2px] p-[1px] my-2">
              {funnelSegments.map((segment) => {
                const pct = total > 0 ? (segment.count / funnelTotal) * 100 : 0;
                if (pct <= 0) return null;
                return (
                  <div
                    key={segment.label}
                    title={`${segment.label}: ${formatNumber(segment.count)} (${pct.toFixed(1)}%)`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                    className={cn('h-full first:rounded-l-full last:rounded-r-full transition-all', segment.color)}
                  />
                );
              })}
            </div>

            {/* Funnel Legend */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2 pt-2 border-t border-slate-100">
              {funnelSegments.map((seg) => {
                const pct = total > 0 ? ((seg.count / funnelTotal) * 100).toFixed(1) : '0.0';
                return (
                  <div key={seg.label} className="flex items-center gap-1.5 min-w-0">
                    <span className={cn('w-2 h-2 rounded-sm shrink-0', seg.color)} />
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-500 truncate">{seg.label}</p>
                      <p className="text-xs font-bold text-slate-900 tabular-nums">
                        {formatNumber(seg.count)}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Portfolio Health Ratios */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-3.5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Portfolio Health Ratios
            </h3>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs py-0.5">
                <span className="text-slate-500">Disbursal Conversion</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100 tabular-nums">
                  {conversionRate}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-0.5">
                <span className="text-slate-500">Approval Rate</span>
                <span className="font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-100 tabular-nums">
                  {approvalRate}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-0.5">
                <span className="text-slate-500">Rejection Rate</span>
                <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100 tabular-nums">
                  {rejectionRate}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-0.5">
                <span className="text-slate-500">Repayment Recovery</span>
                <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100 tabular-nums">
                  {recoveryRate}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-0.5">
                <span className="text-slate-500">Registered Borrowers</span>
                <span className="font-bold text-slate-800 tabular-nums">
                  {formatNumber(users?.total || 0)}{' '}
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({formatNumber(users?.active || 0)} active)
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Compact Quick Stage Queue Pills */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Quick Stage Queues
          </h3>
          <span className="text-[11px] text-slate-400">
            Click to view filtered applications
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {granularQueues.map((q) => {
            const Icon = q.icon;
            return (
              <button
                key={q.status}
                type="button"
                onClick={() => navigate(`/admin/applications?status=${q.status}`)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors hover:border-slate-300"
              >
                <Icon className="w-3 h-3 text-slate-500" />
                <span>{q.label}</span>
                <span className="font-bold tabular-nums text-slate-900 bg-white px-1.5 py-0.2 rounded border border-slate-200 text-[11px]">
                  {formatNumber(q.count)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
