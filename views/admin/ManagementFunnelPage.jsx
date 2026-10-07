import { useCallback, useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ReportFilters from '@/components/admin/reports/ReportFilters';

const EMPTY_FILTERS = {
  city: '', from: '', to: '', creditManagerId: '', telecallerId: '', productId: '',
  underwriterId: '', opsManagerId: '', applicationStatus: '', assignmentStatus: '',
  verificationStatus: '', offerStatus: '', disbursalStatus: '', customerId: '',
};

export default function ManagementFunnelPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      Object.entries(filters).forEach(([key, value]) => { if (value) params[key] = value; });
      const response = await adminAPI.getManagementFunnel(params);
      if (response.status === 1) setData(response.data);
      else setError(response.message || 'Failed to load funnel');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load funnel');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const stages = data?.stages || [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[17px] font-bold text-slate-900 tracking-tight">Management funnel</h1>
        <p className="text-xs text-slate-500">Lead through bank transfer — totals, pending, and completed at each stage</p>
      </div>
      <ReportFilters filters={filters} onApply={setFilters} cities={[]} />
      {error && <Alert variant="destructive" className="bg-red-50 border-red-200"><AlertDescription className="text-sm">{error}</AlertDescription></Alert>}
      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
          <div className="h-4 w-full bg-slate-100 animate-pulse rounded" />
          <div className="h-4 w-full bg-slate-100 animate-pulse rounded" />
          <div className="h-4 w-2/3 bg-slate-100 animate-pulse rounded" />
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-2.5">Stage</th>
                <th className="px-4 py-2.5 text-right">Total</th>
                <th className="px-4 py-2.5 text-right">Pending</th>
                <th className="px-4 py-2.5 text-right">Completed</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((row) => (
                <tr key={row.stage} className="border-b border-slate-100">
                  <td className="px-4 py-2.5 font-medium">{row.label}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{row.total}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{row.pending}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{row.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
