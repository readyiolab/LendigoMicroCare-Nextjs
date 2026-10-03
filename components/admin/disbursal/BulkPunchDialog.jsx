import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { adminAPI } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const PAGE_SIZE = 25;
const TERMINAL = new Set(['COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'CANCELLED']);

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? {};
}

function errMessage(err) {
  return err?.response?.data?.message || err.message || 'Request failed';
}

function seedLines(rows) {
  return (rows || []).map((row) => ({
    lan: String(row.loanNo || row.lan || '').trim(),
    bankReference: String(row.bankReference || row.utr || '').trim(),
    disbursalDate: row.disbursalDate || today(),
    remark: row.remark || '',
    name: row.name || '',
  }));
}

function clientFlags(lines) {
  const lanCount = new Map();
  const utrCount = new Map();
  for (const line of lines) {
    if (line.lan) lanCount.set(line.lan, (lanCount.get(line.lan) || 0) + 1);
    const utr = line.bankReference.trim().toUpperCase();
    if (utr) utrCount.set(utr, (utrCount.get(utr) || 0) + 1);
  }
  return lines.map((line) => {
    const notes = [];
    if (!line.lan) notes.push('LAN is empty');
    else if ((lanCount.get(line.lan) || 0) > 1) notes.push('Duplicate LAN');
    const utr = line.bankReference.trim();
    if (utr.length < 5) notes.push('UTR must be at least 5 characters');
    else if ((utrCount.get(utr.toUpperCase()) || 0) > 1) notes.push('Duplicate UTR');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(line.disbursalDate || '')) notes.push('Date must be YYYY-MM-DD');
    return notes.join('. ');
  });
}

function parseTableText(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.split(/\t|,/).map((cell) => cell.trim().replace(/^"|"$/g, '')))
    .filter((cells) => cells.some(Boolean))
    .filter((cells) => !/^lan$/i.test(cells[0] || ''))
    .map((cells) => ({
      lan: cells[0] || '',
      bankReference: cells[1] || '',
      disbursalDate: cells[2] || today(),
      remark: cells[3] || '',
      name: '',
    }));
}

export default function BulkPunchDialog({ open, onOpenChange, rows, onFinished }) {
  const [stage, setStage] = useState('prepare');
  const [lines, setLines] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [paste, setPaste] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [validated, setValidated] = useState([]);
  const [batch, setBatch] = useState(null);
  const [items, setItems] = useState([]);
  const [itemPage, setItemPage] = useState(1);
  const [itemTotal, setItemTotal] = useState(0);
  const [parentBatchId, setParentBatchId] = useState(null);
  const fileRef = useRef(null);
  const pollRef = useRef(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setStage('prepare');
      setLines(seedLines(rows));
      setSearch('');
      setPage(1);
      setPaste('');
      setError('');
      setSummary(null);
      setValidated([]);
      setBatch(null);
      setItems([]);
      setParentBatchId(null);
    }
    wasOpen.current = open;
  }, [open, rows]);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const flags = useMemo(() => clientFlags(lines), [lines]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lines
      .map((line, index) => ({ line, index, flag: flags[index] }))
      .filter(({ line }) => !q || line.lan.toLowerCase().includes(q) || (line.name || '').toLowerCase().includes(q));
  }, [lines, flags, search]);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const updateLine = (index, patch) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const applyPaste = () => {
    const parsed = parseTableText(paste);
    if (!parsed.length) {
      setError('Paste LAN, UTR, date, and remark from Excel');
      return;
    }
    setLines((prev) => {
      const byLan = new Map(prev.map((line) => [line.lan, { ...line }]));
      const order = prev.map((line) => line.lan);
      for (const row of parsed) {
        if (byLan.has(row.lan)) byLan.set(row.lan, { ...byLan.get(row.lan), ...row, name: byLan.get(row.lan).name });
        else {
          byLan.set(row.lan, row);
          order.push(row.lan);
        }
      }
      return order.map((lan) => byLan.get(lan));
    });
    setPaste('');
    setError('');
  };

  const downloadTemplate = () => {
    const header = 'LAN,UTR,Disbursal Date,Remark';
    const body = lines.map((line) => [line.lan, line.bankReference, line.disbursalDate, line.remark]
      .map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`)
      .join(','));
    const blob = new Blob([[header, ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-punch-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const onCsv = async (file) => {
    const text = await file.text();
    const parsed = parseTableText(text);
    if (!parsed.length) {
      setError('CSV has no data rows');
      return;
    }
    setLines(parsed);
    setPage(1);
    setError('');
  };

  const runValidate = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await adminAPI.validateBulkPunch(lines.map((line) => ({
        lan: line.lan,
        bankReference: line.bankReference,
        disbursalDate: line.disbursalDate,
        remark: line.remark,
      })));
      const data = unwrap(res);
      setSummary(data.summary || null);
      setValidated(data.rows || []);
      setStage('validate');
    } catch (err) {
      const rows = err?.response?.data?.errors?.rows;
      if (rows) {
        setValidated(rows);
        setStage('validate');
      }
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const loadItems = async (batchId, pageNo = 1) => {
    const res = await adminAPI.getBulkPunchItems(batchId, { page: pageNo, limit: 25 });
    const data = unwrap(res);
    setItems(data.items || []);
    setItemPage(data.page || pageNo);
    setItemTotal(data.total || 0);
  };

  const startPoll = (batchId) => {
    stopPoll();
    const tick = async () => {
      try {
        const res = await adminAPI.getBulkPunch(batchId);
        const data = unwrap(res);
        setBatch(data);
        if (TERMINAL.has(data.status)) {
          stopPoll();
          await loadItems(batchId, 1);
          onFinished?.();
        }
      } catch (err) {
        setError(errMessage(err));
      }
    };
    tick();
    pollRef.current = setInterval(tick, 2000);
  };

  const submit = async (validOnly) => {
    setBusy(true);
    setError('');
    const payloadItems = (validOnly ? validated.filter((row) => row.ok) : validated).map((row) => ({
      lan: row.lan,
      bankReference: row.bankReference,
      disbursalDate: row.disbursalDate,
      remark: row.remark,
    }));
    try {
      const body = {
        items: payloadItems.length ? payloadItems : lines,
        submitValidOnly: validOnly,
        idempotencyKey: `bulk-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      };
      const res = parentBatchId
        ? await adminAPI.retryBulkPunch(parentBatchId, body)
        : await adminAPI.createBulkPunch(body);
      const data = unwrap(res);
      setBatch(data);
      setStage('processing');
      startPoll(data.batchId);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const cancelBatch = async () => {
    if (!batch?.batchId) return;
    setBusy(true);
    try {
      const res = await adminAPI.cancelBulkPunch(batch.batchId);
      setBatch(unwrap(res));
      stopPoll();
      await loadItems(batch.batchId, 1);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const retryFailed = async () => {
    if (!batch?.batchId) return;
    setBusy(true);
    setError('');
    try {
      const failed = [];
      let pageNo = 1;
      let total = 0;
      do {
        const res = await adminAPI.getBulkPunchItems(batch.batchId, { status: 'FAILED', page: pageNo, limit: 100 });
        const data = unwrap(res);
        total = data.total || 0;
        for (const row of data.items || []) {
          failed.push({
            lan: row.lan,
            bankReference: row.bankReference || '',
            disbursalDate: row.disbursalDate ? String(row.disbursalDate).slice(0, 10) : today(),
            remark: row.remark || '',
            name: '',
          });
        }
        pageNo += 1;
      } while (failed.length < total && pageNo <= 20);
      if (!failed.length) {
        setError('This batch has no failed rows');
        return;
      }
      setParentBatchId(batch.batchId);
      setLines(failed);
      setValidated([]);
      setSummary(null);
      setStage('prepare');
      setPage(1);
      stopPoll();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const readyCount = summary?.ready ?? validated.filter((row) => row.ok).length;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) stopPoll(); onOpenChange(next); }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-900">Bulk punch</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {stage === 'prepare' && 'Enter UTR, disbursal date, and an optional remark. The server decides which loans can be punched.'}
            {stage === 'validate' && 'Review ready, duplicate, and invalid rows before submitting.'}
            {stage === 'processing' && 'The batch is punching in the background. This page updates every few seconds.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>
        )}

        {stage === 'prepare' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search LAN"
                className="h-9 max-w-xs"
              />
              <Button type="button" variant="outline" className="h-9" onClick={downloadTemplate}>CSV template</Button>
              <Button type="button" variant="outline" className="h-9" onClick={() => fileRef.current?.click()}>Upload CSV</Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onCsv(file);
                  e.target.value = '';
                }}
              />
            </div>
            <div className="flex gap-2">
              <Input
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder="Paste from Excel: LAN, UTR, date, remark"
                className="h-9"
              />
              <Button type="button" variant="outline" className="h-9" onClick={applyPaste}>Apply paste</Button>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LAN</TableHead>
                    <TableHead>UTR</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Remark</TableHead>
                    <TableHead>Check</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map(({ line, index, flag }) => (
                    <TableRow key={`${line.lan}-${index}`}>
                      <TableCell className="text-xs font-medium">{line.lan || '—'}</TableCell>
                      <TableCell>
                        <Input className="h-8" value={line.bankReference} onChange={(e) => updateLine(index, { bankReference: e.target.value })} />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8" type="date" value={String(line.disbursalDate || '').slice(0, 10)} onChange={(e) => updateLine(index, { disbursalDate: e.target.value })} />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8" value={line.remark} onChange={(e) => updateLine(index, { remark: e.target.value })} />
                      </TableCell>
                      <TableCell className="text-xs text-amber-700">{flag || 'Looks complete'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{filtered.length} rows</span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="h-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <span className="self-center">{page} / {pageCount}</span>
                <Button type="button" variant="outline" className="h-8" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </div>
        )}

        {stage === 'validate' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-md bg-emerald-50 text-emerald-800 px-2 py-1">Ready {summary?.ready ?? 0}</span>
              <span className="rounded-md bg-amber-50 text-amber-800 px-2 py-1">Duplicate {summary?.duplicate ?? 0}</span>
              <span className="rounded-md bg-rose-50 text-rose-800 px-2 py-1">Invalid {summary?.invalid ?? 0}</span>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LAN</TableHead>
                    <TableHead>UTR</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validated.slice(0, 100).map((row, index) => (
                    <TableRow key={`${row.lan}-${index}`}>
                      <TableCell className="text-xs">{row.lan || '—'}</TableCell>
                      <TableCell className="text-xs">{row.bankReference || '—'}</TableCell>
                      <TableCell className="text-xs">{String(row.disbursalDate || '').slice(0, 10) || '—'}</TableCell>
                      <TableCell className="text-xs">{row.ok ? 'Ready' : `${row.errorCode || 'Invalid'}: ${row.errorMessage || ''}`}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {stage === 'processing' && (
          <div className="space-y-3">
            <div className="text-sm text-slate-700">
              Batch <span className="font-semibold">{batch?.batchId}</span> · {batch?.status || 'PROCESSING'}
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-md bg-slate-100 px-2 py-1">Total {batch?.totalRecords ?? 0}</span>
              <span className="rounded-md bg-emerald-50 text-emerald-800 px-2 py-1">Success {batch?.successRecords ?? 0}</span>
              <span className="rounded-md bg-rose-50 text-rose-800 px-2 py-1">Failed {batch?.failedRecords ?? 0}</span>
              <span className="rounded-md bg-blue-50 text-blue-800 px-2 py-1">Pending {(batch?.pendingRecords ?? 0) + (batch?.processingRecords ?? 0)}</span>
            </div>
            {TERMINAL.has(batch?.status) && (
              <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>LAN</TableHead>
                      <TableHead>UTR</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((row) => (
                      <TableRow key={`${row.lan}-${row.status}`}>
                        <TableCell className="text-xs">{row.lan}</TableCell>
                        <TableCell className="text-xs">{row.bankReference || '—'}</TableCell>
                        <TableCell className="text-xs">{row.status}</TableCell>
                        <TableCell className="text-xs">{row.errorMessage || row.errorCode || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end gap-2 p-2">
                  <Button type="button" variant="outline" className="h-8" disabled={itemPage <= 1} onClick={() => loadItems(batch.batchId, itemPage - 1)}>Previous</Button>
                  <Button type="button" variant="outline" className="h-8" disabled={itemPage * 25 >= itemTotal} onClick={() => loadItems(batch.batchId, itemPage + 1)}>Next</Button>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {stage === 'prepare' && (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button type="button" className="bg-slate-900 text-white" onClick={runValidate} disabled={busy || !lines.length}>
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Validate
              </Button>
            </>
          )}
          {stage === 'validate' && (
            <>
              <Button type="button" variant="outline" onClick={() => setStage('prepare')}>Fix errors</Button>
              <Button type="button" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => submit(true)} disabled={busy || readyCount === 0}>
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit {readyCount} valid records
              </Button>
            </>
          )}
          {stage === 'processing' && (
            <>
              {!TERMINAL.has(batch?.status) && (
                <Button type="button" variant="outline" onClick={cancelBatch} disabled={busy}>Cancel remaining</Button>
              )}
              {TERMINAL.has(batch?.status) && (batch?.failedRecords || 0) > 0 && (
                <Button type="button" variant="outline" onClick={retryFailed} disabled={busy}>Retry failed</Button>
              )}
              <Button type="button" className="bg-slate-900 text-white" onClick={() => onOpenChange(false)}>Close</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
