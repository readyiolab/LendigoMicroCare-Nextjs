import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@/lib/router';
import {
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
  Send,
} from 'lucide-react';
import { adminAPI } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { adminUi } from '@/config/adminUiTokens';
import BulkPunchDialog from '@/components/admin/disbursal/BulkPunchDialog';
import {
  getStatusBadgeConfig,
  resolveApplicationDisplayStatus,
} from '@/utils/statusUtils';

const TABS = [
  { id: 'eligible', label: 'Ready for payout', tone: 'blue' },
  { id: 'exported', label: 'Sent to bank', tone: 'amber' },
  { id: 'queued', label: 'Added to sheet', tone: 'indigo' },
  { id: 'completed', label: 'Disbursed', tone: 'emerald' },
];

const TAB_TONES = {
  blue: 'bg-blue-600 text-white border-blue-600',
  amber: 'bg-amber-500 text-white border-amber-500',
  indigo: 'bg-indigo-600 text-white border-indigo-600',
  emerald: 'bg-emerald-600 text-white border-emerald-600',
};

const FILTER_DEBOUNCE_MS = 300;

const money = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function SheetStatusBadge({ status, mandateStatus }) {
  const displayKey = resolveApplicationDisplayStatus(status, mandateStatus);
  const cfg = getStatusBadgeConfig(displayKey);
  const value = String(displayKey || '').toLowerCase();
  const styles = {
    eligible: 'bg-blue-50 text-blue-700 border-blue-100',
    queued: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    exported: 'bg-amber-50 text-amber-700 border-amber-100',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    disbursed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    payment_pending: 'bg-yellow-50 text-yellow-800 border-yellow-100',
    mandate_pending: 'bg-violet-50 text-violet-700 border-violet-100',
    mandate_failed: 'bg-rose-50 text-rose-700 border-rose-100',
    approved: 'bg-green-50 text-green-700 border-green-100',
    failed: 'bg-rose-50 text-rose-700 border-rose-100',
  };
  const match = Object.keys(styles).find((k) => value === k || value.includes(k));
  return (
    <Badge
      className={cn(
        'text-[10px] font-medium border shadow-none',
        styles[match] || 'bg-slate-50 text-slate-600 border-slate-100'
      )}
    >
      {cfg.label || status || '—'}
    </Badge>
  );
}

export default function AdminDisbursalSheet() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('eligible');
  const rowKey = tab === 'eligible' ? 'applicationId' : 'disbursementId';
  const [leads, setLeads] = useState([]);
  const batchesRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState(() => new Map());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState({
    mobile: '',
    search: '',
    fromDate: '',
    toDate: '',
    page: 1,
    limit: 10,
  });
  const [mobileInput, setMobileInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [punchOpen, setPunchOpen] = useState(false);
  const [punchRow, setPunchRow] = useState(null);
  const [punchForm, setPunchForm] = useState({
    bankReferenceNo: '',
    disbursalDate: '',
    remark: '',
  });
  const fetchGenRef = useRef(0);

  const columns = useMemo(
    () => [
      { key: 'check', label: '' },
      { key: 'sno', label: 'S.No.' },
      { key: 'leadId', label: 'Lead ID' },
      { key: 'loanNo', label: 'Loan No' },
      { key: 'sanctionAmount', label: 'Sanction Amt' },
      { key: 'disbursalAmount', label: 'Disbursal Amt' },
      { key: 'totalDeduction', label: 'Total Deduction' },
      { key: 'bankHolderName', label: 'Bank Holder Name' },
      { key: 'accountNo', label: 'Account No' },
      { key: 'ifsc', label: 'IFSC' },
      { key: 'bankName', label: 'Bank Name' },
      { key: 'customerId', label: 'Customer ID' },
      { key: 'disbursalDate', label: 'Date of Disb' },
      { key: 'pennyDropName', label: 'Penny drop' },
      { key: 'referenceCheck', label: 'Reference' },
      { key: 'riskGrade', label: 'Risk' },
      { key: 'caseType', label: 'Case type' },
      { key: 'name', label: 'Name' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'status', label: 'Status' },
      { key: 'remark', label: 'Remark' },
      { key: 'callBy', label: 'Call by' },
      ...(tab === 'exported' || tab === 'completed'
        ? [
            { key: 'bankReferenceNo', label: 'Disbursal ref' },
            { key: 'actions', label: 'Action' },
          ]
        : []),
    ],
    [tab]
  );

  const loadBatches = useCallback(async (force = false) => {
    if (!force && batchesRef.current.length > 0) return batchesRef.current;
    const batchRes = await adminAPI.getDisbursalBatches();
    const batchPayload = batchRes?.data?.data || batchRes?.data || {};
    const next = batchPayload.batches || [];
    batchesRef.current = next;
    return next;
  }, []);

  const fetchData = useCallback(async () => {
    const gen = ++fetchGenRef.current;
    setLoading(true);
    setError('');
    try {
      const res =
        tab === 'eligible'
          ? await adminAPI.getDisbursalEligible(filters)
          : await adminAPI.getDisbursalSheet({ ...filters, tab });
      if (gen !== fetchGenRef.current) return;

      const payload = res?.data?.data || res?.data || {};
      setLeads(payload.leads || []);
      setPagination(payload.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      if (gen !== fetchGenRef.current) return;
      setError(err?.response?.data?.message || err.message || 'Failed to load disbursal sheet');
      setLeads([]);
    } finally {
      if (gen === fetchGenRef.current) setLoading(false);
    }
  }, [tab, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounce mobile / search so typing does not fire a request per keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => {
        if (prev.mobile === mobileInput && prev.search === searchInput) return prev;
        return { ...prev, mobile: mobileInput, search: searchInput, page: 1 };
      });
    }, FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [mobileInput, searchInput]);

  const applySearchNow = () => {
    setFilters((prev) => ({
      ...prev,
      mobile: mobileInput,
      search: searchInput,
      page: 1,
    }));
  };

  const toggleRow = (row) => {
    const id = row[rowKey];
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, row);
      return next;
    });
  };

  const toggleAll = () => {
    const pageIds = leads.map((r) => r[rowKey]).filter(Boolean);
    const allOnPage = pageIds.length > 0 && pageIds.every((id) => picked.has(id));
    setPicked((prev) => {
      const next = new Map(prev);
      if (allOnPage) pageIds.forEach((id) => next.delete(id));
      else leads.forEach((row) => { if (row[rowKey]) next.set(row[rowKey], row); });
      return next;
    });
  };

  const selectAllExported = async () => {
    setSelectingAll(true);
    setError('');
    try {
      const next = new Map();
      let page = 1;
      let totalPages = 1;
      while (page <= totalPages && next.size < 2000) {
        const res = await adminAPI.getDisbursalSheet({ ...filters, tab: 'exported', page, limit: 100 });
        const payload = res?.data?.data || res?.data || {};
        for (const row of payload.leads || []) {
          if (row.disbursementId) next.set(row.disbursementId, row);
        }
        totalPages = payload.pagination?.totalPages || 1;
        page += 1;
      }
      setPicked(next);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Could not select sent-to-bank loans');
    } finally {
      setSelectingAll(false);
    }
  };

  const handleMove = async () => {
    if (picked.size === 0) {
      setError('Select at least one lead');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await adminAPI.moveToDisbursalSheet([...picked.keys()]);
      const payload = res?.data?.data || res?.data || {};
      setMessage(
        `Moved ${payload.queued?.length || 0} lead(s) to Added to sheet (${payload.batchCode || 'batch'})`.trim()
      );
      await loadBatches(true);
      setPicked(new Map());
      setTab('queued');
      setFilters((p) => ({ ...p, page: 1 }));
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Move failed');
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async (batchId) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const currentBatches = await loadBatches(batchesRef.current.length === 0);
      const id =
        batchId ||
        currentBatches.find((b) => b.status === 'draft' || b.status === 'exported')?.id ||
        'latest';
      const res = await adminAPI.exportDisbursalBatch(id);
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `disbursal_export_${Date.now()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      setMessage('Bank file downloaded. Rows moved to Sent to bank.');
      await loadBatches(true);
      setTab('exported');
      setFilters((p) => ({ ...p, page: 1 }));
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadMis = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await adminAPI.exportDisbursalMis({
        tab,
        mobile: filters.mobile || undefined,
        search: filters.search || undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const tabSlug = (TABS.find((t) => t.id === tab)?.label || tab).replace(/\s+/g, '_');
      a.download = `Disbursal_MIS_${tabSlug}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      setMessage('MIS downloaded for the current tab and filters.');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'MIS download failed');
    } finally {
      setBusy(false);
    }
  };

  const openPunch = (row) => {
    setPunchRow(row);
    setPunchForm({
      bankReferenceNo: '',
      disbursalDate: new Date().toISOString().slice(0, 10),
      remark: '',
    });
    setPunchOpen(true);
  };

  const savePunch = async () => {
    if (!punchRow?.disbursementId) return;
    if (!punchForm.bankReferenceNo.trim()) {
      setError('Disbursal Reference No is required');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await adminAPI.punchDisbursal(punchRow.disbursementId, punchForm);
      setPunchOpen(false);
      setMessage(`Punched ${punchRow.loanNo}`);
      await fetchData();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Punch failed');
    } finally {
      setBusy(false);
    }
  };

  const activeTab = TABS.find((t) => t.id === tab);

  return (
    <div className="space-y-6 pb-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Disbursal Sheet</h1>
            <p className="text-sm text-slate-500 mt-1">
              Ready for payout → add to sheet → export for bank → punch UTR when money is sent. Use Download MIS for the ops report.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4 rounded-lg text-sm border-slate-200"
            onClick={fetchData}
            disabled={loading || busy}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4 rounded-lg text-sm border-slate-200"
            onClick={handleDownloadMis}
            disabled={loading || busy}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Download MIS
          </Button>
          {tab === 'eligible' && (
            <Button
              type="button"
              className="h-10 px-4 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleMove}
              disabled={busy || picked.size === 0}
            >
              <Send className="w-4 h-4 mr-2" />
              Move selected
            </Button>
          )}
          {tab === 'exported' && (
            <Button
              type="button"
              className="h-10 px-4 rounded-lg text-sm bg-emerald-700 hover:bg-emerald-800 text-white"
              onClick={() => setBulkOpen(true)}
              disabled={busy || picked.size === 0}
            >
              Bulk punch ({picked.size})
            </Button>
          )}
          {(tab === 'queued' || tab === 'exported') && (
            <Button
              type="button"
              className="h-10 px-4 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleExport()}
              disabled={busy}
            >
              <Download className="w-4 h-4 mr-2" />
              Export for bank
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setPicked(new Map());
              setFilters((p) => ({ ...p, page: 1 }));
            }}
            className={cn(
              'h-9 px-3.5 rounded-lg border text-sm font-medium transition-colors',
              tab === t.id
                ? TAB_TONES[t.tone]
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Mobile</label>
            <Input
              placeholder="Enter mobile no."
              value={mobileInput}
              onChange={(e) => setMobileInput(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">From date</label>
            <Input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters((p) => ({ ...p, fromDate: e.target.value, page: 1 }))}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">To date</label>
            <Input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters((p) => ({ ...p, toDate: e.target.value, page: 1 }))}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Name, loan no, email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-10 pl-9"
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              className="h-10 w-full rounded-lg text-sm bg-slate-900 hover:bg-slate-800 text-white"
              onClick={applySearchNow}
            >
              Search
            </Button>
          </div>
        </div>
      </div>

      {(error || message) && (
        <div
          className={cn(
            'rounded-lg border px-4 py-3 text-sm font-medium',
            error
              ? 'border-rose-100 bg-rose-50 text-rose-800'
              : 'border-emerald-100 bg-emerald-50 text-emerald-800'
          )}
        >
          {error || message}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">
            {activeTab?.label || 'Leads'}
          </span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
            {pagination.total || leads.length} leads
          </span>
          {picked.size > 0 && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
              {picked.size} selected
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {tab === 'exported' && (
            <Button
              type="button"
              variant="outline"
              className="h-9 px-3 text-sm border-slate-200"
              onClick={selectAllExported}
              disabled={selectingAll || loading}
            >
              {selectingAll && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Select all sent to bank
            </Button>
          )}
          {leads.length > 0 && (
            <Button type="button" variant="outline" className="h-9 px-3 text-sm border-slate-200" onClick={toggleAll}>
              {leads.every((row) => picked.has(row[rowKey])) ? 'Clear page' : 'Select page'}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <tr className={adminUi.tableHeader}>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className="text-[10px] font-semibold uppercase whitespace-nowrap"
                  >
                    {col.label}
                  </TableHead>
                ))}
              </tr>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Loading leads...
                  </TableCell>
                </TableRow>
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-slate-500">
                    No leads found.
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((row) => {
                  const id = row[rowKey];
                  return (
                    <TableRow key={`${tab}-${id}`} className="hover:bg-slate-50">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={picked.has(id)}
                          onChange={() => toggleRow(row)}
                          className="h-4 w-4 accent-blue-600"
                        />
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 tabular-nums">{row.sno}</TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="text-sm font-semibold text-blue-700 hover:underline"
                          onClick={() => navigate(`/admin/applications/${row.applicationId}`)}
                        >
                          {row.leadId}
                        </button>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-900">{row.loanNo || '—'}</TableCell>
                      <TableCell className="text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {money(row.sanctionAmount)}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-emerald-700 tabular-nums whitespace-nowrap">
                        {money(row.disbursalAmount)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {money(row.totalDeduction)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-800 whitespace-nowrap">{row.bankHolderName || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-600 tabular-nums">{row.accountNo || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-600">{row.ifsc || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-800 whitespace-nowrap">{row.bankName || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-600">{row.customerId || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">{row.disbursalDate || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-800 whitespace-nowrap">{row.pennyDropName || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-800">{row.referenceCheck || '—'}</TableCell>
                      <TableCell className="text-xs font-medium text-slate-900">{row.riskGrade || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-800">{row.caseType || '—'}</TableCell>
                      <TableCell className="text-sm font-medium text-slate-900 whitespace-nowrap">{row.name}</TableCell>
                      <TableCell className="text-xs text-slate-600 tabular-nums">{row.mobile}</TableCell>
                      <TableCell>
                        <SheetStatusBadge status={row.status} mandateStatus={row.mandateStatus} />
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-[140px] truncate">{row.remark || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-600">{row.callBy || '—'}</TableCell>
                      {(tab === 'exported' || tab === 'completed') && (
                        <>
                          <TableCell className="text-xs font-medium text-slate-900">{row.bankReferenceNo || '—'}</TableCell>
                          <TableCell>
                            {tab === 'exported' && (
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => openPunch(row)}
                                disabled={busy}
                              >
                                Disbursement punching
                              </Button>
                            )}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {leads.length > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {filters.page} of {pagination.totalPages || 1}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 border-slate-200"
              disabled={filters.page <= 1}
              onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 border-slate-200"
              disabled={filters.page >= (pagination.totalPages || 1)}
              onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <BulkPunchDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        rows={[...picked.values()]}
        onFinished={fetchData}
      />

      <Dialog open={punchOpen} onOpenChange={setPunchOpen}>
        <DialogContent className="sm:max-w-md rounded-lg border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900">Apply Reference</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Enter the bank reference for {punchRow?.loanNo || 'this loan'}. Disbursement date defaults to today.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Bank reference / UTR</label>
              <Input
                value={punchForm.bankReferenceNo}
                onChange={(e) => setPunchForm((p) => ({ ...p, bankReferenceNo: e.target.value }))}
                className="h-10"
                placeholder="UTR / bank ref"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Disbursal date</label>
              <Input
                type="date"
                value={punchForm.disbursalDate}
                onChange={(e) => setPunchForm((p) => ({ ...p, disbursalDate: e.target.value }))}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Remark</label>
              <Textarea
                value={punchForm.remark}
                onChange={(e) => setPunchForm((p) => ({ ...p, remark: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="h-10" onClick={() => setPunchOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={savePunch}
              disabled={busy}
            >
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Apply Reference
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
