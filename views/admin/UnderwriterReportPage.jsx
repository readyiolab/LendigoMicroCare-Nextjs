import { useCallback, useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ReportFilters from '@/components/admin/reports/ReportFilters';
import UnassignedLeadsPanel from '@/components/admin/reports/UnassignedLeadsPanel';
import ReportSummaryCards from '@/components/admin/reports/ReportSummaryCards';
import { usePagedLeads } from '@/components/admin/reports/usePagedLeads';
import { useReportExport } from '@/components/admin/reports/useReportExport';

const EMPTY_FILTERS = {
  city: '', from: '', to: '', underwriterId: '', creditManagerId: '', productId: '',
  applicationStatus: '', offerStatus: '', customerId: '',
};

export default function UnderwriterReportPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryReady, setSummaryReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState('');
  const [assigning, setAssigning] = useState(false);

  const loadCases = useCallback((params, config) => adminAPI.getUnassignedUnderwriterLeads(params, config), []);
  const cases = usePagedLeads(loadCases, filters, summaryReady, refreshKey);
  const exportJob = useReportExport('underwriter', filters);

  const load = useCallback(async () => {
    setSummaryLoading(true);
    setError('');
    try {
      const params = {};
      Object.entries(filters).forEach(([key, value]) => { if (value) params[key] = value; });
      const report = await adminAPI.getUnderwriterReport(params);
      if (report.status === 1) setData(report.data);
      else setError(report.message || 'Failed to load report');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load report');
    } finally {
      setSummaryLoading(false);
      setSummaryReady(true);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const bump = async () => {
    setRefreshKey((value) => value + 1);
    await load();
  };

  const handleAssign = async (applicationIds, adminId) => {
    setAssigning(true);
    setError('');
    try {
      for (const id of applicationIds) {
        await adminAPI.assignUnderwriter(id, adminId);
      }
      await bump();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Assign failed');
    } finally {
      setAssigning(false);
    }
  };

  const rows = data?.underwriters || [];
  const totals = {
    allocated: rows.reduce((sum, row) => sum + Number(row.received || 0), 0),
    pending: rows.reduce((sum, row) => sum + Number(row.current_workload || 0), 0),
    finished: rows.reduce((sum, row) => sum + Number(row.offer_sent || 0), 0),
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[17px] font-bold text-slate-900 tracking-tight">Underwriter report</h1>
        <p className="text-xs text-slate-500">Received through offer, video declaration, and operations handoff</p>
      </div>
      <ReportFilters filters={filters} onApply={setFilters} cities={data?.cities || []} underwriters={rows} />
      {error && <Alert variant="destructive" className="bg-red-50 border-red-200"><AlertDescription className="text-sm">{error}</AlertDescription></Alert>}
      <ReportSummaryCards loading={summaryLoading} allocated={totals.allocated} pending={totals.pending} finished={totals.finished} />
      {summaryLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4"><div className="h-4 w-full bg-slate-100 animate-pulse rounded" /></div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-2.5">Underwriter</th>
                <th className="px-4 py-2.5 text-right">Received</th>
                <th className="px-4 py-2.5 text-right">Offer prep</th>
                <th className="px-4 py-2.5 text-right">Offer sent</th>
                <th className="px-4 py-2.5 text-right">Accepted</th>
                <th className="px-4 py-2.5 text-right">Video decl.</th>
                <th className="px-4 py-2.5 text-right">Video verified</th>
                <th className="px-4 py-2.5 text-right">To Ops</th>
                <th className="px-4 py-2.5 text-right">Workload</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className="px-4 py-2.5 font-semibold">{m.full_name}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.received}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.offer_prep}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.offer_sent}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.offer_accepted}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.video_declaration}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.video_verified}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.moved_to_operations}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.current_workload}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <UnassignedLeadsPanel
        title="Cases"
        leads={cases.leads}
        staff={cases.extra?.underwriters || rows}
        staffLabel="Underwriter"
        ownerField="underwriter_name"
        loading={cases.loading}
        assigning={assigning}
        onAssign={handleAssign}
        searchValue={cases.searchInput}
        onSearchChange={cases.setSearchInput}
        page={cases.page}
        pageSize={cases.pageSize}
        total={cases.total}
        onPageChange={cases.setPage}
        onDownload={exportJob.start}
        onDownloadFile={exportJob.download}
        downloadStatus={exportJob.status}
        downloadMessage={exportJob.message}
        onAutoAssign={async () => {
          setAssigning(true);
          try {
            await adminAPI.autoAssignUnderwriters();
            await bump();
          } finally {
            setAssigning(false);
          }
        }}
      />
    </div>
  );
}
