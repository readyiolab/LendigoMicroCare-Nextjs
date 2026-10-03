import { useCallback, useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import { adminAPI } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

const STATUS_OPTIONS = ['Active', 'Overdue', 'Closed'];
const DPD_BUCKET_OPTIONS = ['Closed', 'Current', '1-7', '8-30', '31-60', '61-90', '91-180', '181+'];
const LOAN_TYPE_OPTIONS = ['Fresh', 'Repeat'];

const STATUS_TONES = {
  Closed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Active: 'bg-blue-50 text-blue-700 border-blue-200',
  Overdue: 'bg-red-50 text-red-700 border-red-200',
};

function todayIst() {
  return new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
}

const emptyFilters = () => ({
  asOnDate: todayIst(),
  fromDate: '',
  toDate: '',
  status: '',
  dpdBucket: '',
  loanType: '',
  loanAccount: '',
  cmId: '',
});

function toParams(filters) {
  const params = {
    as_on_date: filters.asOnDate,
    from_date: filters.fromDate,
    to_date: filters.toDate,
    status: filters.status,
    dpd_bucket: filters.dpdBucket,
    loan_type: filters.loanType,
    loan_account: filters.loanAccount.trim(),
    cm_id: filters.cmId.trim(),
  };
  Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
  return params;
}

const inr = (v) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

function displayDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return d && m && y ? `${d}-${m}-${y}` : iso;
}

async function blobErrorMessage(err) {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      if (parsed?.message) return parsed.message;
    } catch {
      /* not JSON */
    }
  }
  return err?.response?.data?.message || err?.message || 'Download failed';
}

function fileNameFrom(res, fallback) {
  const header = res?.headers?.['content-disposition'] || '';
  const match = /filename="?([^";]+)"?/i.exec(header);
  return match ? match[1] : fallback;
}

function SummaryCard({ label, value, hint, tone = 'text-slate-900' }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-[12px] text-slate-500">{label}</p>
      <p className={cn('text-lg font-semibold font-mono mt-0.5', tone)}>{value}</p>
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
      >
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function LoanBookMisPage() {
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [summary, setSummary] = useState(null);
  const [dpd, setDpd] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = toParams(applied);
      const [listRes, summaryRes, dpdRes] = await Promise.all([
        adminAPI.getLoanBook({ ...params, page, limit: PAGE_SIZE }),
        adminAPI.getLoanBookSummary(params),
        adminAPI.getLoanBookDpdSummary(params),
      ]);
      if (listRes.status !== 1) throw new Error(listRes.message || 'Failed to load Loan Book');
      setRows(listRes.data?.rows || []);
      setMeta(listRes.data?.meta || { total: 0, totalPages: 0 });
      setSummary(summaryRes.status === 1 ? summaryRes.data : null);
      setDpd(dpdRes.status === 1 ? dpdRes.data || [] : []);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load Loan Book');
    } finally {
      setLoading(false);
    }
  }, [applied, page]);

  useEffect(() => { load(); }, [load]);

  const setField = (key) => (value) => setDraft((p) => ({ ...p, [key]: value }));

  const applyFilters = (e) => {
    e?.preventDefault();
    setPage(1);
    setApplied({ ...draft, asOnDate: draft.asOnDate || todayIst() });
  };

  const resetFilters = () => {
    const fresh = emptyFilters();
    setDraft(fresh);
    setApplied(fresh);
    setPage(1);
  };

  const download = async (format) => {
    setDownloading(format);
    setError('');
    try {
      const res = await adminAPI.exportLoanBook({ ...toParams(applied), format });
      const type = format === 'csv'
        ? 'text/csv;charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileNameFrom(res, `Loan_Book_MIS_${applied.asOnDate}.${format}`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(await blobErrorMessage(err));
    } finally {
      setDownloading('');
    }
  };

  return (
    <div className="space-y-5 pb-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Loan Book MIS</h1>
            <p className="text-sm text-slate-500 mt-1">
              One row per loan account, calculated as on the selected date. Downloads include all 43 columns (A:AQ) for the current filters.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button type="button" variant="outline" className="h-10 px-4 rounded-lg text-sm border-slate-200" onClick={load} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button type="button" variant="outline" className="h-10 px-4 rounded-lg text-sm border-slate-200" onClick={() => download('csv')} disabled={!!downloading}>
            {downloading === 'csv' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Download CSV
          </Button>
          <Button type="button" className="h-10 px-4 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => download('xlsx')} disabled={!!downloading}>
            {downloading === 'xlsx' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
            Download Excel
          </Button>
        </div>
      </div>

      <form onSubmit={applyFilters} className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">As-on date</label>
            <Input type="date" value={draft.asOnDate} onChange={(e) => setField('asOnDate')(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Disbursed from</label>
            <Input type="date" value={draft.fromDate} onChange={(e) => setField('fromDate')(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Disbursed to</label>
            <Input type="date" value={draft.toDate} onChange={(e) => setField('toDate')(e.target.value)} className="h-10" />
          </div>
          <SelectField label="Status" value={draft.status} options={STATUS_OPTIONS} onChange={setField('status')} />
          <SelectField label="DPD bucket" value={draft.dpdBucket} options={DPD_BUCKET_OPTIONS} onChange={setField('dpdBucket')} />
          <SelectField label="Loan type" value={draft.loanType} options={LOAN_TYPE_OPTIONS} onChange={setField('loanType')} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Loan A/C</label>
            <Input placeholder="Exact LAN" value={draft.loanAccount} onChange={(e) => setField('loanAccount')(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">CM ID</label>
            <Input placeholder="Customer code" value={draft.cmId} onChange={(e) => setField('cmId')(e.target.value)} className="h-10" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <Button type="button" variant="outline" className="h-9 px-3 text-sm border-slate-200" onClick={resetFilters}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button type="submit" className="h-9 px-4 text-sm">Apply filters</Button>
        </div>
      </form>

      {error && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          <SummaryCard label="Total loans" value={summary.totalLoans} hint={`${summary.freshLoans} fresh · ${summary.repeatLoans} repeat`} />
          <SummaryCard label="Net disbursed" value={inr(summary.totalDisbursed)} hint={`Sanctioned ${inr(summary.totalSanctioned)}`} />
          <SummaryCard label="Repayment due" value={inr(summary.totalRepaymentDue)} />
          <SummaryCard label="Received" value={inr(summary.totalReceived)} hint={`Rebate / waiver ${inr(summary.totalRebateWaiver)}`} />
          <SummaryCard label="Outstanding" value={inr(summary.totalOutstanding)} tone="text-red-700" />
          <SummaryCard label="Collection %" value={`${summary.collectionPercent}%`} />
          <SummaryCard label="Active / Overdue / Closed" value={`${summary.activeLoans} / ${summary.overdueLoans} / ${summary.closedLoans}`} />
          <SummaryCard
            label="Data check errors"
            value={summary.dataCheckErrors}
            tone={summary.dataCheckErrors ? 'text-amber-700' : 'text-emerald-700'}
          />
        </div>
      )}

      {dpd.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-2.5">DPD bucket</th>
                {dpd.map((b) => <th key={b.bucket} className="px-4 py-2.5 text-right">{b.bucket}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-2.5 font-medium">Loans</td>
                {dpd.map((b) => <td key={b.bucket} className="px-4 py-2.5 text-right font-mono">{b.loanCount}</td>)}
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium">Outstanding</td>
                {dpd.map((b) => <td key={b.bucket} className="px-4 py-2.5 text-right font-mono">{inr(b.outstanding)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-12">No loans match these filters as on {displayDate(applied.asOnDate)}.</p>
        ) : (
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="text-left text-[12px] text-slate-500 border-b bg-slate-50">
                <th className="px-3 py-2.5">S.No</th>
                <th className="px-3 py-2.5">Loan A/C</th>
                <th className="px-3 py-2.5">CM ID</th>
                <th className="px-3 py-2.5">Customer</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Disbursed</th>
                <th className="px-3 py-2.5">Due date</th>
                <th className="px-3 py-2.5 text-right">Sanctioned</th>
                <th className="px-3 py-2.5 text-right">Due</th>
                <th className="px-3 py-2.5 text-right">Received</th>
                <th className="px-3 py-2.5 text-right">Rebate</th>
                <th className="px-3 py-2.5 text-right">Outstanding</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Closure</th>
                <th className="px-3 py-2.5 text-right">DPD</th>
                <th className="px-3 py-2.5">Bucket</th>
                <th className="px-3 py-2.5">Data check</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.loanId} className="border-b border-slate-100 hover:bg-slate-50/60">
                  <td className="px-3 py-2 text-slate-500">{r.sNo}</td>
                  <td className="px-3 py-2 font-mono text-[12px]">
                    {r.loanAccount ? (
                      <a href={`/admin/accounts/${encodeURIComponent(r.loanAccount)}`} className="text-blue-700 hover:underline">{r.loanAccount}</a>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-[12px]">{r.cmId || '—'}</td>
                  <td className="px-3 py-2">{r.cmName || '—'}</td>
                  <td className="px-3 py-2 text-[12px]">{r.loanType}{r.loanCycle ? ` #${r.loanCycle}` : ''}</td>
                  <td className="px-3 py-2 text-[12px]">{displayDate(r.disbursalDate)}</td>
                  <td className="px-3 py-2 text-[12px]">{displayDate(r.repaymentDueDate)}</td>
                  <td className="px-3 py-2 text-right font-mono">{inr(r.loanSanctioned)}</td>
                  <td className="px-3 py-2 text-right font-mono">{inr(r.repaymentAmountDue)}</td>
                  <td className="px-3 py-2 text-right font-mono">{inr(r.totalReceived)}</td>
                  <td className="px-3 py-2 text-right font-mono">{inr(r.rebateWaiver)}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold">{inr(r.outstanding)}</td>
                  <td className="px-3 py-2">
                    <span className={cn('inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium', STATUS_TONES[r.status])}>{r.status}</span>
                  </td>
                  <td className="px-3 py-2 text-[12px]">{r.closureType || '—'}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.dpd ?? '—'}</td>
                  <td className="px-3 py-2 text-[12px]">{r.dpdBucket || '—'}</td>
                  <td className="px-3 py-2 text-[12px]">
                    {r.dataCheck === 'OK' ? (
                      <span className="text-emerald-700 font-medium">OK</span>
                    ) : (
                      <span className="text-amber-700 font-medium" title={(r.dataCheckErrors || []).map((e) => e.message).join('\n')}>
                        {(r.dataCheckErrors || []).map((e) => e.message).join('; ') || 'ERROR'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {meta.total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, meta.total)} of {meta.total} loans
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="h-8 px-3 text-sm border-slate-200" disabled={loading || page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-[12px]">Page {page} of {meta.totalPages}</span>
            <Button type="button" variant="outline" className="h-8 px-3 text-sm border-slate-200" disabled={loading || page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
