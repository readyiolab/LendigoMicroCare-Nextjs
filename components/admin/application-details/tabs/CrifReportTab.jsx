import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  RefreshCw,
  Download,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  User,
  Search,
  Filter,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DetailTable, DetailRow } from '../common/DetailTable';
import { useApplicationContext } from '../context/ApplicationContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { adminAPI } from '@/lib/api/admin';
import { cn } from '@/lib/utils';
import {
  groupTradelinesByCategory,
  filterTradelines,
  filterInquiriesByWindow,
  CRIF_LOAN_GROUP_ORDER,
  CRIF_LOAN_GROUP_LABELS,
} from '@/lib/utils/crifLoanGroups';
import {
  inr,
  bureauState,
  formatWhen,
  resolveConsumer,
  maskPan,
  maskMobile,
} from './crif/formatters';
import CollapsibleSection from './crif/CollapsibleSection';
import GroupedLoanTable from './crif/GroupedLoanTable';
import EnquirySummary from './crif/EnquirySummary';
import useCrifReportExports from './crif/useCrifReportExports';

const HIGH_DPD_DAYS = 30;

function VariationBlock({ label, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li
            key={`${label}-${i}`}
            className="text-xs text-slate-800 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5"
          >
            <span className="font-medium break-words">{item.value ?? item}</span>
            {item.reported_date ? (
              <span className="ml-2 text-[10px] text-slate-400 tabular-nums">
                {String(item.reported_date)}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConsumerInfoCard({ consumer }) {
  if (!consumer) return null;
  const phones = Array.isArray(consumer.phones) ? consumer.phones : [];
  const emails = Array.isArray(consumer.emails) ? consumer.emails : [];
  const rows = [
    { label: 'Name', value: consumer.name },
    { label: 'PAN', value: consumer.pan },
    { label: 'Date of birth', value: consumer.dob },
    { label: 'Gender', value: consumer.gender },
    { label: 'Phone', value: phones.length ? phones.join(', ') : null },
    { label: 'Email', value: emails.length ? emails.join(', ') : null },
    { label: 'Voter ID', value: consumer.voterId },
    { label: 'Address', value: consumer.address || (consumer.addresses?.[0] ?? null) },
  ].filter((r) => r.value);

  if (!rows.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
        <User className="w-4 h-4 text-sky-600" />
        <h4 className="text-sm font-semibold text-slate-900">Consumer information</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 px-4 py-4">
        {rows.map((r) => (
          <div key={r.label} className={r.label === 'Address' ? 'sm:col-span-2' : undefined}>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{r.label}</p>
            <p className="text-sm text-slate-900 font-medium mt-0.5 break-words">{r.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const RESULT_CODE_LABELS = {
  101: 'Report found',
  102: 'No record found at the bureau',
  103: 'Record found, name did not match',
};

const VERIFICATION_LABELS = {
  verified: 'Verified report',
  no_record: 'No record (new to credit)',
  name_not_found: 'Name not matched',
  incomplete_payload: 'Incomplete bureau response',
  pending: 'Unclear bureau response',
};

const NO_SCORE_GUIDANCE = {
  ntc: [
    'The bureau (CRIF) has no loan or credit card on record for this customer. This is normal for first-time borrowers.',
    'It is not a negative signal — there are simply no loans to assess, so loan counts and DPD are not shown.',
    'Decide using the bank statement (Account Aggregator), salary / income proof and KYC.',
    'If the CRIF portal shows a report, compare the name, DOB and mobile there with the details sent below. Correct the customer profile or PAN record, then Re-fetch. A "no record" result is not charged.',
  ],
  name_mismatch: [
    'The bureau found a record for this PAN / mobile, but the name sent did not match it.',
    'Compare the name below with the PAN card (spelling, initials, surname order).',
    'Correct the customer profile if needed, then use Re-fetch.',
  ],
  unavailable: [
    'The bureau reply was incomplete, so no usable credit report was stored.',
    'This is a technical issue, not a customer risk signal.',
    'Use Re-fetch to pull the report again. If it keeps failing, contact the tech team with the report ID below.',
  ],
};

const ATTEMPT_VARIANT_LABELS = {
  primary: 'Main details (PAN record first)',
  alternate_name: 'Other name on file',
  alternate_mobile: 'Other mobile on file',
  alternate_dob: 'Other date of birth on file',
};

const NAME_SOURCE_LABELS = {
  pan_document: 'Name and DOB taken from the PAN record (DigiLocker)',
  pan_verification: 'Name taken from PAN verification',
  profile: 'Name taken from the customer profile',
};

function snapshotName(sent) {
  return [sent?.first_name, sent?.last_name]
    .filter((v, i, arr) => v && arr.indexOf(v) === i)
    .join(' ');
}

function BureauNoScorePanel({ state, applicationRef, snapshot }) {
  const [fields, setFields] = useState(null);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const sent = snapshot?.sent || null;
  const attempts = Array.isArray(snapshot?.attempts) ? snapshot.attempts : [];

  useEffect(() => {
    if (!applicationRef || state?.key === 'unavailable' || sent) return undefined;
    let cancelled = false;
    setFieldsLoading(true);
    adminAPI
      .getCreditApplicantFields(applicationRef)
      .then((res) => {
        if (!cancelled && res?.status === 1) setFields(res.data?.fields || null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFieldsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applicationRef, state?.key, sent]);

  const guidance = NO_SCORE_GUIDANCE[state?.key] || [];
  const tone =
    state?.key === 'ntc'
      ? 'border-sky-200 bg-sky-50/70 text-sky-950'
      : state?.key === 'name_mismatch'
        ? 'border-amber-200 bg-amber-50/70 text-amber-950'
        : 'border-slate-200 bg-slate-50 text-slate-900';

  const name = [fields?.first_name, fields?.last_name]
    .filter((v, i, arr) => v && arr.indexOf(v) === i)
    .join(' ');
  const detailRows = sent
    ? [
        { label: 'Name', value: snapshotName(sent) || '—' },
        { label: 'PAN', value: sent.pan || '—' },
        { label: 'Date of birth', value: sent.date_of_birth || '—' },
        { label: 'Mobile', value: sent.mobile_no || '—' },
        { label: 'City', value: sent.city || '—' },
        { label: 'State', value: sent.state || '—' },
        { label: 'PIN code', value: sent.pincode || '—' },
      ]
    : fields
      ? [
          { label: 'Name', value: name || '—' },
          { label: 'PAN', value: maskPan(fields.pan) },
          { label: 'Date of birth', value: fields.date_of_birth || '—' },
          { label: 'Mobile', value: maskMobile(fields.mobile_no) },
        ]
      : [];
  const answered = attempts.filter((a) => a.resultCode != null);
  const allNoRecord = answered.length > 1 && answered.every((a) => Number(a.resultCode) === 102);

  return (
    <div className={cn('rounded-lg border px-4 py-4 space-y-3', tone)}>
      <div>
        <p className="text-sm font-semibold">{state?.title}</p>
        <p className="mt-1 text-xs opacity-90">{state?.sentence}</p>
      </div>
      {guidance.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">What this means</p>
          <ul className="mt-1 list-disc list-inside space-y-1 text-xs leading-relaxed">
            {guidance.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {state?.key !== 'unavailable' && (
        <div className="rounded-md border border-black/5 bg-white/80 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-slate-700">
            {sent ? 'Details sent to the bureau' : 'Customer details on file (used for the bureau search)'}
          </p>
          {sent && (snapshot?.identitySource?.name || allNoRecord) && (
            <p className="mt-0.5 text-[11px] text-slate-500">
              {[
                NAME_SOURCE_LABELS[snapshot?.identitySource?.name],
                allNoRecord
                  ? `Tried ${answered.length} identity variations; all returned no record`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          {fieldsLoading ? (
            <p className="mt-1 text-xs text-slate-500 flex items-center gap-2">
              <Spinner size="sm" /> Loading details…
            </p>
          ) : detailRows.length ? (
            <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5">
              {detailRows.map((r) => (
                <div key={r.label}>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">{r.label}</p>
                  <p className="text-xs font-medium text-slate-900 break-words">{r.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-xs text-slate-500">Details not available.</p>
          )}
        </div>
      )}
    </div>
  );
}

const EMPTY_LOAN_FILTERS = {
  search: '',
  status: 'all',
  overdue: 'all',
  category: 'all',
};

export default function CrifReportTab({ onOpenCreditCheck }) {
  const {
    loanApp,
    applicationId,
    setMessage,
    creditDecisionLoading,
    handleForceCrifRefetch,
    bureauSummary,
    bureauSummaryLoading,
    fetchBureauSummary,
    bureauDetail,
    bureauDetailLoading,
    bureauDetailError,
    fetchBureauDetail,
  } = useApplicationContext();
  const { admin } = useAdminAuth();
  const applicationRef = loanApp?.application_number || applicationId;

  const role = String(admin?.role_code || admin?.role || '').toLowerCase();
  const canRefetch = ['credit_manager', 'super_admin', 'admin'].includes(role);

  const [error, setError] = useState('');
  const [jsonFilter, setJsonFilter] = useState('');
  const [loanFilters, setLoanFilters] = useState(EMPTY_LOAN_FILTERS);
  const [enquiryWindow, setEnquiryWindow] = useState('all');

  const detail = bureauDetail;
  const detailLoading = bureauDetailLoading && !bureauDetail;
  const detailError = bureauDetailError || '';

  const load = useCallback(async (force = false) => {
    if (!applicationRef) return;
    setError('');
    try {
      const [data] = await Promise.all([
        fetchBureauSummary({ force }),
        fetchBureauDetail({ force }),
      ]);
      if (!data && !bureauSummary) setError('No credit report on file yet. Run Credit Check to fetch CIBIL.');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load credit report');
    }
  }, [applicationRef, fetchBureauSummary, fetchBureauDetail, bureauSummary]);

  useEffect(() => {
    if (!bureauSummary || !bureauDetail) {
      load(false);
    }
  }, [load, bureauSummary, bureauDetail]);

  const loading = bureauSummaryLoading && !bureauSummary;
  const summary = detail || bureauSummary;

  const state = useMemo(() => bureauState(summary), [summary]);
  const band = useMemo(
    () => (state ? { label: state.label, tone: state.tone } : { label: 'Unknown', tone: '' }),
    [state]
  );

  const riskSentence = useMemo(() => {
    if (!summary) return '';
    if (state?.sentence) return state.sentence;
    const overdue = Number(summary.summary?.overdueAccounts) || 0;
    const dpd = Number(summary.summary?.daysPastDue) || 0;
    const overdueAmt = summary.summary?.totalOverdueAmount;
    const parts = [`Credit score ${summary.score ?? '—'} (${band.label}).`];
    if (overdue > 0) parts.push(`${overdue} loan${overdue === 1 ? '' : 's'} overdue.`);
    if (dpd > 0) parts.push(`Highest delay ${dpd} days.`);
    if (Number(overdueAmt) > 0) parts.push(`${inr(overdueAmt)} overdue.`);
    if (overdue === 0 && dpd === 0) parts.push('No overdue loans on the report.');
    return parts.join(' ');
  }, [summary, state, band.label]);

  const allTradelines = useMemo(() => {
    if (Array.isArray(detail?.tradelines)) return detail.tradelines;
    if (Array.isArray(summary?.tradelines)) return summary.tradelines;
    return [];
  }, [detail, summary]);

  const filteredTradelines = useMemo(
    () => filterTradelines(allTradelines, loanFilters),
    [allTradelines, loanFilters]
  );

  const loanGroups = useMemo(
    () => groupTradelinesByCategory(filteredTradelines),
    [filteredTradelines]
  );

  const filteredInquiries = useMemo(
    () => filterInquiriesByWindow(detail?.inquiry_history || [], enquiryWindow),
    [detail?.inquiry_history, enquiryWindow]
  );

  const canExportExcel = Boolean(summary) || allTradelines.length > 0 || filteredInquiries.length > 0;

  const consumer = useMemo(() => resolveConsumer(detail), [detail]);

  const scoreTrendPairs = useMemo(() => {
    const trends = detail?.score_trends;
    if (!trends?.dates?.length || !trends?.values?.length) return [];
    return trends.dates.map((d, i) => ({ date: d, value: trends.values[i] })).filter((p) => p.value != null);
  }, [detail]);

  const performAttrs = detail?.accounts_summary?.performAttributes || [];
  const identity = detail?.identity_variations;

  const rawJsonText = useMemo(() => {
    if (!detail?.raw) return '';
    try {
      return JSON.stringify(detail.raw, null, 2);
    } catch {
      return String(detail.raw);
    }
  }, [detail]);

  const filteredJson = useMemo(() => {
    if (!jsonFilter.trim()) return rawJsonText;
    const q = jsonFilter.trim().toLowerCase();
    return rawJsonText
      .split('\n')
      .filter((line) => line.toLowerCase().includes(q))
      .join('\n');
  }, [rawJsonText, jsonFilter]);

  const filtersActive =
    loanFilters.search.trim() !== '' ||
    loanFilters.status !== 'all' ||
    loanFilters.overdue !== 'all' ||
    loanFilters.category !== 'all';

  const {
    pdfLoading,
    pdfDownloading,
    excelExporting,
    refetchOpen,
    setRefetchOpen,
    openPdf,
    downloadPdf,
    exportExcel,
    confirmRefetch,
  } = useCrifReportExports({
    applicationRef,
    loanApp,
    summary,
    detail,
    consumer,
    band,
    loanGroups,
    filteredInquiries,
    canExportExcel,
    setMessage,
    handleForceCrifRefetch,
    load,
  });

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center bg-white rounded-lg border border-slate-200">
        <Spinner size="lg" variant="primary" />
        <p className="text-sm text-slate-500 mt-4">Loading credit report…</p>
      </div>
    );
  }

  const fetchedLabel = formatWhen(summary?.fetchedAt || summary?.reportDate);
  const kpiCards = summary
    ? [
        {
          label: 'Open loans',
          value: summary.summary?.activeAccounts ?? '—',
          tone: 'bg-emerald-50 border-emerald-200 text-emerald-950',
        },
        {
          label: 'Overdue loans',
          value: summary.summary?.overdueAccounts ?? '—',
          tone:
            Number(summary.summary?.overdueAccounts) > 0
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : 'bg-slate-50 border-slate-200 text-slate-900',
        },
        {
          label: 'Max DPD',
          value: summary.summary?.daysPastDue ?? '—',
          tone:
            Number(summary.summary?.daysPastDue) > 0
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : 'bg-slate-50 border-slate-200 text-slate-900',
        },
        {
          label: 'Inquiries (6m)',
          value: summary.summary?.inquiries6m ?? '—',
          tone: 'bg-amber-50 border-amber-200 text-amber-950',
        },
        {
          label: 'Amount overdue',
          value: inr(summary.summary?.totalOverdueAmount),
          tone:
            Number(summary.summary?.totalOverdueAmount) > 0
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : 'bg-emerald-50 border-emerald-200 text-emerald-950',
        },
      ]
    : [];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Sticky scan header */}
      <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 border-b border-slate-200/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 bg-white shadow-sm',
                state?.ring || 'border-slate-200'
              )}
            >
              <span
                className={cn(
                  'font-bold tabular-nums text-slate-900',
                  (state?.ringText || '').length > 3 ? 'text-xs' : 'text-sm'
                )}
              >
                {state?.ringText ?? '—'}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">CIBIL report</h3>
                {summary && (
                  <Badge className={cn('text-[10px] font-medium border-none px-2 py-0.5 normal-case', band.tone)}>
                    {band.label}
                  </Badge>
                )}
                {fetchedLabel && (
                  <span className="text-[11px] text-slate-500 truncate">Fetched {fetchedLabel}</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate" title={riskSentence || undefined}>
                {summary ? riskSentence : 'Bureau report for this application'}
              </p>
              {summary && state && state.key !== 'scored' && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Bureau result: {RESULT_CODE_LABELS[summary.resultCode] || state.label}
                  {summary.resultCode != null ? ` (code ${summary.resultCode})` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs rounded-lg"
              onClick={() => load()}
              disabled={detailLoading || bureauSummaryLoading}
            >
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', (detailLoading || bureauSummaryLoading) && 'animate-spin')} />
              Refresh
            </Button>
            {summary?.hasPdf && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs rounded-lg"
                  disabled={pdfLoading || pdfDownloading}
                  onClick={openPdf}
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  {pdfLoading ? 'Opening…' : 'View PDF'}
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs rounded-lg bg-slate-900 hover:bg-slate-800 text-white"
                  disabled={pdfLoading || pdfDownloading}
                  onClick={downloadPdf}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  {pdfDownloading ? 'Downloading…' : 'Download PDF'}
                </Button>
              </>
            )}
            {canExportExcel && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs rounded-lg border-emerald-300 text-emerald-900 hover:bg-emerald-50"
                disabled={excelExporting || detailLoading}
                onClick={exportExcel}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                {excelExporting ? 'Exporting…' : 'Export Excel'}
              </Button>
            )}
            {summary && canRefetch && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs rounded-lg border-amber-300 text-amber-900 hover:bg-amber-50"
                disabled={creditDecisionLoading}
                onClick={() => setRefetchOpen(true)}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Re-fetch
              </Button>
            )}
            {!summary && onOpenCreditCheck && (
              <Button size="sm" className="h-8 text-xs rounded-lg" onClick={onOpenCreditCheck}>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Open credit check
              </Button>
            )}
          </div>
        </div>
      </div>

      {(error || detailError) && !summary && (
        <Alert variant="destructive" className="rounded-lg">
          <AlertDescription className="text-xs">{error || detailError}</AlertDescription>
        </Alert>
      )}

      {!summary ? (
        <div className="py-14 text-center bg-white rounded-lg border border-slate-200">
          <ShieldCheck className="w-10 h-10 text-slate-200 mx-auto mb-4" />
          <p className="text-sm text-slate-600 font-medium">No credit report on file</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Run Credit Check once to fetch and store the bureau report for this application.
          </p>
          {onOpenCreditCheck && (
            <Button className="mt-6 h-9 text-xs rounded-lg" onClick={onOpenCreditCheck}>
              Open credit check
            </Button>
          )}
        </div>
      ) : (
        <>
          {state?.showKpis ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {kpiCards.map((card) => (
                <div key={card.label} className={cn('rounded-lg border px-3 py-3 shadow-sm', card.tone)}>
                  <p className="text-[11px] font-medium opacity-80">{card.label}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums leading-tight">{card.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <BureauNoScorePanel
              state={state}
              applicationRef={applicationRef}
              snapshot={summary.requestSnapshot}
            />
          )}

          {Number(summary.summary?.daysPastDue) > HIGH_DPD_DAYS && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">
                <span className="font-semibold">High DPD: {summary.summary.daysPastDue} days.</span>{' '}
                The customer can still apply — review the delayed loans below before the credit decision.
              </p>
            </div>
          )}

          {detailLoading && (
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <Spinner size="sm" /> Loading full report details…
            </p>
          )}

          <ConsumerInfoCard consumer={consumer} />

          {/* Loan filters */}
          {(state?.showKpis || allTradelines.length > 0) && (
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Filter className="w-4 h-4 text-slate-400" />
                Loans
                <span className="text-xs font-medium text-slate-500">
                  ({filteredTradelines.length}
                  {filtersActive ? ` of ${allTradelines.length}` : ''})
                </span>
              </div>
              {filtersActive && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setLoanFilters(EMPTY_LOAN_FILTERS)}
                >
                  Clear filters
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="search"
                  value={loanFilters.search}
                  onChange={(e) => setLoanFilters((p) => ({ ...p, search: e.target.value }))}
                  placeholder="Search lender, account, type…"
                  className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs focus:outline-none focus:border-slate-400"
                />
              </div>
              <select
                value={loanFilters.status}
                onChange={(e) => setLoanFilters((p) => ({ ...p, status: e.target.value }))}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs"
              >
                <option value="all">All status</option>
                <option value="open">Open only</option>
                <option value="closed">Closed only</option>
              </select>
              <select
                value={loanFilters.overdue}
                onChange={(e) => setLoanFilters((p) => ({ ...p, overdue: e.target.value }))}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs"
              >
                <option value="all">All overdue</option>
                <option value="overdue">Overdue only</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setLoanFilters((p) => ({ ...p, category: 'all' }))}
                className={cn(
                  'rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors',
                  loanFilters.category === 'all'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                All categories
              </button>
              {CRIF_LOAN_GROUP_ORDER.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLoanFilters((p) => ({ ...p, category: id }))}
                  className={cn(
                    'rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors',
                    loanFilters.category === id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {CRIF_LOAN_GROUP_LABELS[id]}
                </button>
              ))}
            </div>
          </div>
          )}

          {loanGroups.length > 0 ? (
            <div className="space-y-3">
              {loanGroups.map((g) => (
                <GroupedLoanTable key={g.id} group={g} />
              ))}
            </div>
          ) : (
            !detailLoading &&
            state?.showKpis && (
              <p className="text-sm text-slate-500 rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
                {allTradelines.length === 0
                  ? 'No loans listed on the stored report.'
                  : 'No loans match the current filters.'}
              </p>
            )
          )}

          <EnquirySummary
            inquiries={detail?.inquiry_history}
            windowDays={enquiryWindow}
            onWindowChange={setEnquiryWindow}
          />

          {Array.isArray(detail?.score_factors) && detail.score_factors.length > 0 && (
            <CollapsibleSection title="Score factors" defaultOpen={false} count={detail.score_factors.length}>
              <ul className="space-y-2">
                {detail.score_factors.map((f, i) => (
                  <li key={i} className="text-xs text-slate-800 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    {f.type ? (
                      <span className="font-mono text-[10px] text-slate-500 mr-2">{f.type}</span>
                    ) : null}
                    {f.description || '—'}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}

          {scoreTrendPairs.length > 0 && (
            <CollapsibleSection title="Score history" defaultOpen={false} count={scoreTrendPairs.length}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoreTrendPairs.map((p, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 tabular-nums">{p.date}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{p.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(detail.score_trends?.trend_3m != null ||
                detail.score_trends?.trend_6m != null ||
                detail.score_trends?.trend_12m != null) && (
                <p className="mt-2 text-[11px] text-slate-500">
                  Trends — 3m: {detail.score_trends.trend_3m ?? '—'} · 6m:{' '}
                  {detail.score_trends.trend_6m ?? '—'} · 12m: {detail.score_trends.trend_12m ?? '—'}
                </p>
              )}
            </CollapsibleSection>
          )}

          {identity && (
            <CollapsibleSection title="Identity / demog variations" defaultOpen={false}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <VariationBlock label="Names" items={identity.names} />
                <VariationBlock label="Phones" items={identity.phones} />
                <VariationBlock label="Emails" items={identity.emails} />
                <VariationBlock label="PAN" items={identity.pans} />
                <VariationBlock label="DOB" items={identity.dobs} />
                <VariationBlock label="Voter ID" items={identity.voterIds} />
                <div className="md:col-span-2">
                  <VariationBlock label="Addresses" items={identity.addresses} />
                </div>
              </div>
            </CollapsibleSection>
          )}

          {Array.isArray(detail?.employment_details) && detail.employment_details.length > 0 && (
            <CollapsibleSection title="Employment details" defaultOpen={false} count={detail.employment_details.length}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 font-medium">Occupation</th>
                      <th className="px-3 py-2 font-medium">Account type</th>
                      <th className="px-3 py-2 font-medium">Source</th>
                      <th className="px-3 py-2 font-medium">First reported</th>
                      <th className="px-3 py-2 font-medium">Last reported</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.employment_details.map((e, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2">{e.occupation || '—'}</td>
                        <td className="px-3 py-2">{e.account_type || '—'}</td>
                        <td className="px-3 py-2">{e.source || '—'}</td>
                        <td className="px-3 py-2 tabular-nums">{e.first_reported || '—'}</td>
                        <td className="px-3 py-2 tabular-nums">{e.last_reported || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}

          {detail?.accounts_summary && (
            <CollapsibleSection title="Accounts summary & perform attributes" defaultOpen={false}>
              {detail.accounts_summary.primary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  {Object.entries(detail.accounts_summary.primary).map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{k}</p>
                      <p className="text-xs font-semibold text-slate-900 tabular-nums mt-0.5">
                        {v != null && v !== '' ? String(v) : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {performAttrs.length > 0 && (
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 font-medium">Attribute</th>
                        <th className="px-3 py-2 font-medium text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performAttrs.map((a, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-1.5 font-mono text-[10px] text-slate-600">{a.name}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{a.value ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CollapsibleSection>
          )}

          {Array.isArray(detail?.alerts) && detail.alerts.length > 0 && (
            <CollapsibleSection title="Alerts" defaultOpen={false} count={detail.alerts.length}>
              <pre className="text-[10px] font-mono text-slate-700 whitespace-pre-wrap break-all">
                {JSON.stringify(detail.alerts, null, 2)}
              </pre>
            </CollapsibleSection>
          )}

          {detail?.raw && (
            <CollapsibleSection title="Full report JSON" defaultOpen={false}>
              <div className="space-y-2">
                <input
                  type="search"
                  value={jsonFilter}
                  onChange={(e) => setJsonFilter(e.target.value)}
                  placeholder="Filter JSON lines…"
                  className="h-8 w-full rounded-lg border border-slate-200 px-3 text-xs"
                />
                <pre className="text-[10px] font-mono text-slate-700 whitespace-pre-wrap break-all max-h-[480px] overflow-auto rounded-lg border border-slate-100 bg-slate-50 p-3">
                  {filteredJson || '(no matching lines)'}
                </pre>
              </div>
            </CollapsibleSection>
          )}

          {detailError && detail && (
            <p className="text-xs text-amber-700">{detailError}</p>
          )}

          <details className="rounded-lg border border-slate-200 bg-white p-3">
            <summary className="cursor-pointer text-xs font-medium text-slate-600">Technical details</summary>
            <div className="mt-3">
              <DetailTable title="Report metadata">
                <DetailRow label="Report ID" mono>
                  {summary.id ?? '—'}
                </DetailRow>
                <DetailRow label="Provider">{summary.provider || '—'}</DetailRow>
                <DetailRow label="Result code">
                  {summary.resultCode ?? '—'}
                  {RESULT_CODE_LABELS[summary.resultCode] ? ` — ${RESULT_CODE_LABELS[summary.resultCode]}` : ''}
                </DetailRow>
                <DetailRow label="Verification">
                  {VERIFICATION_LABELS[summary.verificationStatus] || summary.verificationStatus || '—'}
                </DetailRow>
                <DetailRow label="PDF available">{summary.hasPdf ? 'Yes' : 'No'}</DetailRow>
              </DetailTable>
              {Array.isArray(summary.requestSnapshot?.attempts) &&
                summary.requestSnapshot.attempts.length > 0 && (
                  <div className="mt-3">
                    <DetailTable title="Bureau attempts">
                      {summary.requestSnapshot.attempts.map((a, i) => (
                        <DetailRow
                          key={a.clientRefNum || i}
                          label={`${i + 1}. ${ATTEMPT_VARIANT_LABELS[a.variant] || a.variant || 'Attempt'}`}
                        >
                          {a.resultCode != null
                            ? `${a.resultCode}${RESULT_CODE_LABELS[a.resultCode] ? ` — ${RESULT_CODE_LABELS[a.resultCode]}` : ''}`
                            : `Failed${a.error ? ` (${a.error})` : ''}`}
                          {a.sent ? ` · ${snapshotName(a.sent) || '—'} · ${a.sent.mobile_no || '—'} · ${a.sent.date_of_birth || '—'}` : ''}
                          {a.requestId ? ` · request ${a.requestId}` : ''}
                        </DetailRow>
                      ))}
                    </DetailTable>
                  </div>
                )}
            </div>
          </details>
        </>
      )}

      <Dialog open={refetchOpen} onOpenChange={setRefetchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Re-fetch CRIF from bureau?</DialogTitle>
            <DialogDescription>
              {state?.key === 'ntc'
                ? 'This asks the bureau again, using the PAN record details first and other details on file if needed. A "no record" result is not charged — only a report found (code 101) is billable.'
                : 'This pulls a new credit report from Digitap and may incur an additional bureau charge. Prefer the stored report unless you have a clear business reason to re-pull.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRefetchOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-700 hover:bg-amber-800 text-white"
              disabled={creditDecisionLoading}
              onClick={confirmRefetch}
            >
              {creditDecisionLoading ? 'Re-fetching…' : 'Yes, re-fetch CRIF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
