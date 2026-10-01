import { useMemo, useState } from 'react';
import { Download, Users } from 'lucide-react';
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

export default function CollectorProductivityMISPanel() {
  const defaults = useMemo(() => monthBounds(), []);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [format, setFormat] = useState('csv');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    setDownloading(true);
    setError('');
    try {
      const response = await collectionAPI.exportCollectorProductivity({
        startDate,
        endDate,
        format,
      });
      const blob =
        response?.data instanceof Blob
          ? response.data
          : response instanceof Blob
            ? response
            : new Blob([response?.data || response]);
      const header =
        response?.headers?.['content-disposition'] || response?.headers?.['Content-Disposition'];
      const fallback = `Collector_Productivity_${startDate}_${endDate}.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
      downloadBlob(blob, filenameFromContentDisposition(header, fallback));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-100 p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-slate-900 rounded-lg">
          <Users className="w-4 h-4 text-white" />
        </div>
        <div>
          <h4 className="text-sm font-medium text-slate-900">Collector productivity MIS</h4>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
            Collections / PTP kept% / punches by agent
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 text-xs" />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 text-xs" />
        <select
          className="h-9 border border-slate-200 rounded-lg text-xs px-2 bg-white"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        >
          <option value="csv">CSV</option>
          <option value="xlsx">XLSX</option>
        </select>
        <Button type="button" size="sm" className="h-9 gap-1.5" onClick={handleDownload} disabled={downloading}>
          <Download className="w-3.5 h-3.5" />
          {downloading ? 'Exporting…' : 'Export'}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
