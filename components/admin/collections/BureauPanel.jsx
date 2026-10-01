import { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  RefreshCw, 
  History, 
  Calendar, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { collectionAPI } from '@/lib/api/collection';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function BureauPanel() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState(null);

  const resolveDownloadUrl = (filePath) => {
    if (!filePath) return '#';
    if (/^https?:\/\//i.test(filePath)) return filePath;

    const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const envBase = process.env.NEXT_PUBLIC_API_BASE_URL || window.location.origin;
    const apiOrigin = new URL(envBase, window.location.origin).origin;
    return `${apiOrigin}${cleanPath}`;
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await collectionAPI.getBureauExportHistory();
      if (response.status === 1) {
        setHistory(response.data);
      }
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const response = await collectionAPI.exportBureauReport({});
      if (response.status === 1) {
        setMessage({ type: 'success', text: 'Bureau report generated successfully!' });
        fetchHistory();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to generate report' });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Action Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-medium text-slate-900 leading-tight">CIBIL TUDF Reporting</h3>
            <p className="text-sm text-slate-500 mt-1 font-medium">Generate official TransUnion Data Format (TUDF) pipe-delimited files.</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => window.location.href = '/admin/cibil'}
            className="flex items-center justify-center gap-2.5 bg-white text-slate-900 border border-slate-200 px-6 py-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:bg-slate-50 active:scale-95"
          >
            Advanced Options
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center justify-center gap-2.5 bg-indigo-600 text-white px-8 py-4 rounded-lg text-xs font-bold uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
          >
            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Generating...' : 'Export (Current Month)'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Step 1</p>
          <p className="text-sm text-slate-700 mt-1">Click <strong>Export (Current Month)</strong> to generate TUDF.</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Step 2</p>
          <p className="text-sm text-slate-700 mt-1">Wait for success message, then check Export History.</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Step 3</p>
          <p className="text-sm text-slate-700 mt-1">Download TUDF text file and upload to bureau portal.</p>
        </div>
      </div>

      {message && (
        <div className={cn(
          "p-4 rounded-lg flex items-center gap-3 border text-sm font-medium animate-in zoom-in-95 duration-300",
          message.type === 'success' ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700"
        )}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* History Table */}
      <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium uppercase tracking-[0.15em] text-slate-500">Export History</span>
          </div>
          <button onClick={fetchHistory} className="text-slate-400 hover:text-slate-950 transition-colors">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-slate-500">Month/Year</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-slate-500">Records</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-slate-500">Generated At</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-slate-500 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                   <td colSpan="4" className="px-6 py-12 text-center text-slate-500 text-sm italic font-medium">Fetching history...</td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                   <td colSpan="4" className="px-6 py-12 text-center text-slate-500 text-sm italic font-medium">No exports generated yet.</td>
                </tr>
              ) : history.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-white border border-transparent group-hover:border-slate-100">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <span className="text-sm font-semibold text-slate-900">
                        {format(new Date(item.period_year, item.period_month - 1, 1), 'MMMM yyyy')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                      {item.record_count} Records
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500 tracking-tight">
                    {format(new Date(item.created_at), 'dd MMM, hh:mm a')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <a
                      href={resolveDownloadUrl(item.file_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-bold text-xs uppercase tracking-widest"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download TUDF (.txt)
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
