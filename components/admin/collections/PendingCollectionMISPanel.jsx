import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { collectionAPI } from '@/lib/api/collection';
import { downloadBlob, filenameFromContentDisposition } from '@/utils/downloadBlob';

function monthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

export default function PendingCollectionMISPanel({
  defaultStartDate,
  defaultEndDate,
  compact = false,
  onDownloaded,
}) {
  const defaults = useMemo(() => monthBounds(), []);
  const [startDate, setStartDate] = useState(defaultStartDate || defaults.startDate);
  const [endDate, setEndDate] = useState(defaultEndDate || defaults.endDate);
  const [status, setStatus] = useState('all');
  const [format, setFormat] = useState('csv');
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [lastCount, setLastCount] = useState(null);

  const runExport = async (params, fallbackName) => {
    setDownloading(true);
    setError('');
    try {
      const response = await collectionAPI.exportPendingCollectionMIS(params);

      const blob = response?.data instanceof Blob
        ? response.data
        : response instanceof Blob
          ? response
          : new Blob([response?.data || response]);
      const header = response?.headers?.['content-disposition'] || response?.headers?.['Content-Disposition'];
      const fileName = filenameFromContentDisposition(header, fallbackName);
      const mime =
        params.format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv';
      downloadBlob(blob, fileName, mime);
      setLastCount(null);
      onDownloaded?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        err.message ||
        'Download failed';
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          setError(parsed.message || msg);
        } catch {
          setError(msg);
        }
      } else {
        setError(typeof msg === 'string' ? msg : 'Download failed');
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleDownload = async () => {
    const isDueNotOverdue = status === 'due_not_overdue';
    await runExport(
      {
        startDate,
        endDate,
        status,
        format: isDueNotOverdue ? 'xlsx' : format,
        search: search.trim() || undefined,
        ...(isDueNotOverdue
          ? { columns: 'due_not_overdue', asOfToday: '0' }
          : {}),
      },
      isDueNotOverdue
        ? `LMS_Due_Not_Overdue_${new Date().toISOString().slice(0, 10)}.xlsx`
        : `Pending_Collection_MIS_${startDate}_${endDate}.${format === 'xlsx' ? 'xlsx' : 'csv'}`
    );
  };

  const handleDownloadAsOfToday = async () => {
    setStatus('due_not_overdue');
    setFormat('xlsx');
    const today = new Date().toISOString().slice(0, 10);
    await runExport(
      {
        status: 'due_not_overdue',
        format: 'xlsx',
        asOfToday: '1',
        columns: 'due_not_overdue',
        search: search.trim() || undefined,
      },
      `LMS_Due_Not_Overdue_${today}.xlsx`
    );
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    if (value === 'due_not_overdue') {
      setFormat('xlsx');
    }
  };

  return (
    <div
      className={
        compact
          ? 'rounded-lg border border-slate-100 bg-white p-4 space-y-3'
          : 'rounded-lg border border-slate-100 bg-white p-5 shadow-sm space-y-4'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-lg">
            <FileSpreadsheet className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
              Pending Collection MIS
            </h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
              Due-date filtered · one row per loan account
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleDownloadAsOfToday}
            disabled={downloading}
            className="h-9 px-4 rounded-lg gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            {downloading ? 'Preparing…' : 'Download as of today'}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleDownload}
            disabled={downloading || !startDate || !endDate}
            className="h-9 px-4 rounded-lg gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            {downloading ? 'Preparing…' : 'Download'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">From (due date)</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 h-9 text-xs"
          />
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">To (due date)</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 h-9 text-xs"
          />
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Status</label>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
          >
            <option value="all">All pending</option>
            <option value="overdue">Overdue</option>
            <option value="due_today">Due today</option>
            <option value="upcoming">Upcoming</option>
            <option value="due_not_overdue">Due (not overdue)</option>
            <option value="partial">Partial</option>
          </select>
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
          >
            <option value="csv">CSV</option>
            <option value="xlsx">Excel (XLSX)</option>
          </select>
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Search</label>
          <Input
            placeholder="LAN / name / mobile"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-1 h-9 text-xs"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}
      {lastCount != null && (
        <p className="text-[11px] text-slate-500">{lastCount} rows exported</p>
      )}
    </div>
  );
}
