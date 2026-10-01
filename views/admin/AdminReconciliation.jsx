import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  FileUp,
  Search,
  ArrowLeft,
  Check,
  History,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { adminAPI } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';

const MATCH_TYPE_LABELS = {
  ID: 'LNREP ref',
  UTR_SUBSTRING: 'UTR match',
  APP_NUM: 'App number',
  NAME_AMOUNT: 'Name + amount',
  UNIQUE_AMOUNT: 'Unique amount',
};

const BATCH_STATUS_STYLES = {
  pending: 'bg-slate-100 text-slate-600',
  processing: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  committed: 'bg-indigo-50 text-indigo-700',
};

const ROW_STATUS_LABELS = {
  ready: 'Ready',
  ready_settlement: 'Settlement',
  amount_mismatch: 'Mismatch',
};

const buildCommitPayload = (results, selectedIds) => {
  const allMatches = [...(results?.matches || []), ...(results?.amountMismatch || [])];
  return allMatches
    .filter((match) => selectedIds.includes(match.repaymentId))
    .map((match) => ({
      repaymentId: match.repaymentId,
      utrNumber: match.utrNumber,
      amount: match.amount,
      settlementId: match.settlementId || null,
      matchType: match.matchType,
      status: match.status,
    }));
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DEFAULT_SUMMARY = {
  totalRows: 0,
  processed: 0,
  ready: 0,
  mismatch: 0,
  unmatchedCount: 0,
  autoSelectable: 0,
};

const formatInr = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const normalizeBatchData = (data = {}) => {
  const matches = data.matches || [];
  const amountMismatch = data.amountMismatch || [];
  const unmatched = data.unmatched || [];

  const summary = {
    ...DEFAULT_SUMMARY,
    ...(data.summary || {
      totalRows: data.totalRows || 0,
      processed: matches.length + amountMismatch.length,
      ready: data.pagination?.matchTotal ?? matches.length,
      mismatch: data.pagination?.mismatchTotal ?? amountMismatch.length,
      unmatchedCount: data.pagination?.unmatchedTotal ?? unmatched.length,
      autoSelectable: matches.filter((m) => m.autoSelectable).length,
    }),
  };

  return {
    batchId: data.batchId,
    status: data.status,
    summary,
    matches,
    amountMismatch,
    unmatched,
    errorMessage: data.errorMessage || null,
  };
};

function StatusBadge({ status, map = BATCH_STATUS_STYLES, labels = {} }) {
  const label = labels[status] || status?.replace(/_/g, ' ') || '—';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        map[status] || 'bg-slate-100 text-slate-600'
      )}
    >
      {label}
    </span>
  );
}

function ConfidenceBadge({ confidence }) {
  const isHigh = confidence === 'high';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        isHigh ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
      )}
    >
      {isHigh ? 'High' : 'Review'}
    </span>
  );
}

export default function AdminReconciliation() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [recentBatches, setRecentBatches] = useState([]);
  const [processingMessage, setProcessingMessage] = useState('');
  const [activeTab, setActiveTab] = useState('matches');
  const pollRef = useRef(null);
  const { toast } = useNotifications();

  const MAX_FILE_BYTES = 5 * 1024 * 1024;

  const loadRecentBatches = useCallback(async () => {
    try {
      const response = await adminAPI.listReconciliationBatches({ limit: 20 });
      if (response.status === 1) {
        setRecentBatches(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load reconciliation history', error);
    }
  }, []);

  useEffect(() => {
    loadRecentBatches();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadRecentBatches]);

  const applyScanResults = (data) => {
    const normalized = normalizeBatchData(data);
    setResults(normalized);
    setActiveTab('matches');

    const autoIds = normalized.matches
      .filter((m) => m.autoSelectable)
      .map((m) => m.repaymentId);
    setSelectedMatches(autoIds);
  };

  const pollBatchUntilReady = async (batchId) => {
    const maxAttempts = 90;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await adminAPI.getReconciliationBatch(batchId, { limit: 100 });
      const data = response.data;

      if (data.status === 'completed' || data.status === 'committed') {
        return data;
      }
      if (data.status === 'failed') {
        throw new Error(data.errorMessage || 'Background reconciliation failed');
      }

      setProcessingMessage(
        `Processing ${data.totalRows?.toLocaleString('en-IN') || ''} rows... (${attempt + 1}/${maxAttempts})`
      );
      await sleep(2000);
    }

    throw new Error('Reconciliation is taking longer than expected. Check batch history shortly.');
  };

  const handleFileChange = (e) => {
    const nextFile = e.target.files?.[0];
    if (!nextFile) return;

    if (nextFile.size > MAX_FILE_BYTES) {
      toast('File too large', 'Maximum upload size is 5 MB.');
      e.target.value = '';
      setFile(null);
      return;
    }

    setFile(nextFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      setLoading(true);
      setProcessingMessage('');
      const formData = new FormData();
      formData.append('file', file);

      const response = await adminAPI.reconcileStatement(formData);
      if (response.status !== 1) return;

      let payload = response.data;

      if (payload.async && payload.status === 'processing') {
        setProcessingMessage('Large file detected. Processing in background...');
        payload = await pollBatchUntilReady(payload.batchId);
      }

      applyScanResults(payload);

      const autoCount = payload.summary?.autoSelectable ?? 0;
      toast(
        'Scan complete',
        `Found ${payload.summary?.ready || 0} matches. ${autoCount} high-confidence match${autoCount === 1 ? '' : 'es'} auto-selected.`
      );
      loadRecentBatches();
    } catch (error) {
      console.error('Upload error', error);
      toast('Processing failed', error?.message || 'Failed to process bank statement.');
    } finally {
      setLoading(false);
      setProcessingMessage('');
    }
  };

  const handleOpenBatch = async (batchId) => {
    try {
      setLoading(true);
      const response = await adminAPI.getReconciliationBatch(batchId, { limit: 100 });
      if (response.status !== 1) return;

      const data = response.data;

      if (data.status === 'failed') {
        toast('Batch failed', data.errorMessage || 'This reconciliation batch failed to process.');
        return;
      }

      if (data.status === 'processing' || data.status === 'pending') {
        const ready = await pollBatchUntilReady(batchId);
        applyScanResults(ready);
        return;
      }

      if (data.status === 'completed' || data.status === 'committed') {
        applyScanResults(data);
        return;
      }

      toast('Batch unavailable', 'This batch cannot be opened yet.');
    } catch (error) {
      toast('Could not open batch', error?.message || 'Failed to load reconciliation batch.');
    } finally {
      setLoading(false);
      setProcessingMessage('');
    }
  };

  const handleCommit = async () => {
    if (selectedMatches.length === 0 || !results) return;
    try {
      setCommitting(true);
      const dataToCommit = buildCommitPayload(results, selectedMatches);
      const response = await adminAPI.commitReconciliation({
        matchIds: dataToCommit,
        batchId: results.batchId,
      });

      if (response.status === 1) {
        const { success = 0, failed = 0 } = response.data || {};
        if (failed > 0) {
          toast(
            'Partial reconciliation',
            `${success} succeeded, ${failed} failed. Review errors and retry remaining rows.`
          );
        } else {
          toast('Reconciliation successful', `Processed ${success} repayment${success === 1 ? '' : 's'}.`);
          setResults(null);
          setFile(null);
          setSelectedMatches([]);
          loadRecentBatches();
        }
      }
    } catch (error) {
      console.error('Commit error', error);
      toast('Update failed', error?.message || 'Could not commit reconciliation.');
    } finally {
      setCommitting(false);
    }
  };

  const toggleMatch = (match) => {
    if (match.status === 'amount_mismatch') return;

    setSelectedMatches((prev) =>
      prev.includes(match.repaymentId)
        ? prev.filter((id) => id !== match.repaymentId)
        : [...prev, match.repaymentId]
    );
  };

  const selectableRows = useMemo(
    () => (results?.matches || []).filter((m) => m.status !== 'amount_mismatch'),
    [results]
  );

  const allSelectableSelected =
    selectableRows.length > 0 &&
    selectableRows.every((row) => selectedMatches.includes(row.repaymentId));

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedMatches([]);
      return;
    }
    setSelectedMatches(selectableRows.map((row) => row.repaymentId));
  };

  const matchRows = useMemo(
    () => [...(results?.matches || []), ...(results?.amountMismatch || [])],
    [results]
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Statement Reconciliation</h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload bank statements, review matches, and commit verified repayments.
          </p>
        </div>
        {results && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setResults(null);
                setSelectedMatches([]);
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              New upload
            </Button>
            <Button size="sm" onClick={handleCommit} disabled={selectedMatches.length === 0 || committing}>
              {committing ? <Spinner className="w-4 h-4 mr-2" /> : null}
              Commit selected ({selectedMatches.length})
            </Button>
          </div>
        )}
      </div>

      {!results && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-md bg-slate-100">
                  <FileSpreadsheet className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Upload statement</h2>
                  <p className="text-xs text-slate-500">CSV, XLS, XLSX — max 5 MB</p>
                </div>
              </div>

              <div className="relative mb-4">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="border border-dashed border-slate-300 rounded-lg px-4 py-8 text-center hover:border-slate-400 hover:bg-slate-50 transition-colors">
                  <FileUp className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {file ? file.name : 'Choose file'}
                  </p>
                </div>
              </div>

              {processingMessage && (
                <p className="text-xs text-blue-600 mb-3">{processingMessage}</p>
              )}

              <Button className="w-full" disabled={!file || loading} onClick={handleUpload}>
                {loading ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" /> Processing...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" /> Analyze statement
                  </>
                )}
              </Button>
            </div>

            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-500" />
                  <h2 className="text-sm font-semibold text-slate-900">Recent batches</h2>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={loadRecentBatches}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Refresh
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-slate-200">
                      <TableHead className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Batch
                      </TableHead>
                      <TableHead className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        File
                      </TableHead>
                      <TableHead className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                        Rows
                      </TableHead>
                      <TableHead className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                        Matches
                      </TableHead>
                      <TableHead className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Status
                      </TableHead>
                      <TableHead className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Uploaded
                      </TableHead>
                      <TableHead className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentBatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                          No reconciliation batches yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentBatches.map((batch) => (
                        <TableRow key={batch.batchId} className="border-b border-slate-50 hover:bg-slate-50">
                          <TableCell className="px-5 py-3 font-mono text-xs text-slate-600">
                            #{batch.batchId}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-sm text-slate-900 max-w-[180px] truncate">
                            {batch.fileName}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-sm text-slate-800 text-right tabular-nums">
                            {batch.totalRows?.toLocaleString('en-IN') ?? '—'}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-sm text-slate-800 text-right tabular-nums">
                            {batch.summary?.ready ?? '—'}
                          </TableCell>
                          <TableCell className="px-5 py-3">
                            <StatusBadge status={batch.status} />
                          </TableCell>
                          <TableCell className="px-5 py-3 text-xs text-slate-500">
                            {formatDate(batch.createdAt)}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              disabled={loading || batch.status === 'processing' || batch.status === 'pending'}
                              onClick={() => handleOpenBatch(batch.batchId)}
                            >
                              Open
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </>
      )}

      {results && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Batch', value: `#${results.batchId}` },
              { label: 'Statement rows', value: results.summary?.totalRows ?? 0 },
              { label: 'Ready matches', value: results.summary?.ready ?? 0 },
              { label: 'Mismatch', value: results.summary?.mismatch ?? 0 },
              { label: 'Unmatched', value: results.summary?.unmatchedCount ?? 0 },
            ].map((item) => (
              <div key={item.label} className="bg-white border border-slate-200 rounded-lg px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
                <p className="text-lg font-semibold text-slate-900 mt-1 tabular-nums">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-slate-200">
              {[
                { id: 'matches', label: 'Matches', count: matchRows.length },
                { id: 'unmatched', label: 'Unmatched', count: results.unmatched?.length || 0 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
              <p className="ml-auto text-xs text-slate-500">
                {results.summary?.autoSelectable ?? 0} high-confidence rows auto-selected
              </p>
            </div>

            {activeTab === 'matches' && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-slate-200 bg-white">
                      <TableHead className="px-4 py-3 w-10">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center',
                            allSelectableSelected
                              ? 'bg-slate-900 border-slate-900 text-white'
                              : 'border-slate-300 bg-white'
                          )}
                        >
                          {allSelectableSelected && <Check className="w-3 h-3" />}
                        </button>
                      </TableHead>
                      <TableHead className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Customer
                      </TableHead>
                      <TableHead className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Application
                      </TableHead>
                      <TableHead className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        EMI
                      </TableHead>
                      <TableHead className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        UTR
                      </TableHead>
                      <TableHead className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                        Statement amt.
                      </TableHead>
                      <TableHead className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                        Expected amt.
                      </TableHead>
                      <TableHead className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Match type
                      </TableHead>
                      <TableHead className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Confidence
                      </TableHead>
                      <TableHead className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="px-4 py-10 text-center text-sm text-slate-500">
                          No matches found in this batch.
                        </TableCell>
                      </TableRow>
                    ) : (
                      matchRows.map((row, idx) => {
                        const canSelect = row.status !== 'amount_mismatch';
                        const isSelected = selectedMatches.includes(row.repaymentId);

                        return (
                          <TableRow
                            key={`${row.repaymentId}-${idx}`}
                            className={cn(
                              'border-b border-slate-50',
                              row.status === 'amount_mismatch' && 'bg-amber-50/40',
                              isSelected && 'bg-blue-50/40'
                            )}
                          >
                            <TableCell className="px-4 py-3">
                              <button
                                type="button"
                                disabled={!canSelect}
                                onClick={() => toggleMatch(row)}
                                className={cn(
                                  'w-4 h-4 rounded border flex items-center justify-center',
                                  !canSelect && 'opacity-40 cursor-not-allowed',
                                  isSelected
                                    ? 'bg-slate-900 border-slate-900 text-white'
                                    : 'border-slate-300 bg-white'
                                )}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </button>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm font-medium text-slate-900">
                              {row.customerName || '—'}
                            </TableCell>
                            <TableCell className="px-4 py-3 font-mono text-xs text-slate-600">
                              {row.applicationNumber || '—'}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm text-slate-800">
                              {row.emiNumber ?? '—'}
                            </TableCell>
                            <TableCell className="px-4 py-3 font-mono text-xs text-slate-600 max-w-[140px] truncate">
                              {row.utrNumber || '—'}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm text-slate-900 text-right tabular-nums font-medium">
                              {formatInr(row.amount)}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm text-right tabular-nums">
                              <span
                                className={cn(
                                  row.status === 'amount_mismatch'
                                    ? 'text-amber-700 font-medium'
                                    : 'text-slate-700'
                                )}
                              >
                                {formatInr(row.expectedAmount)}
                              </span>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-xs text-slate-600">
                              {MATCH_TYPE_LABELS[row.matchType] || row.matchType || '—'}
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <ConfidenceBadge confidence={row.confidence} />
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <StatusBadge
                                status={row.status}
                                map={{
                                  ready: 'bg-emerald-50 text-emerald-700',
                                  ready_settlement: 'bg-emerald-50 text-emerald-700',
                                  amount_mismatch: 'bg-amber-50 text-amber-700',
                                }}
                                labels={ROW_STATUS_LABELS}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {activeTab === 'unmatched' && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-slate-200 bg-white">
                      <TableHead className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Bank narration
                      </TableHead>
                      <TableHead className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                        Amount
                      </TableHead>
                      <TableHead className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Reason
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(results.unmatched || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="px-4 py-10 text-center text-sm text-slate-500">
                          All credit rows were matched or filtered.
                        </TableCell>
                      </TableRow>
                    ) : (
                      results.unmatched.map((row, idx) => (
                        <TableRow key={idx} className="border-b border-slate-50">
                          <TableCell className="px-4 py-3 text-sm text-slate-800 max-w-xl">
                            {row.narrationPreview || '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-slate-900 text-right tabular-nums font-medium">
                            {row.amount ? formatInr(row.amount) : '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-xs text-slate-600">
                            {row.reason || '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
