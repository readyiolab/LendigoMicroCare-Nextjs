import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ReportFilters from '@/components/admin/reports/ReportFilters';
import UnassignedLeadsPanel from '@/components/admin/reports/UnassignedLeadsPanel';
import ReportSummaryCards, { averageHours } from '@/components/admin/reports/ReportSummaryCards';
import { usePagedLeads } from '@/components/admin/reports/usePagedLeads';
import { useReportExport } from '@/components/admin/reports/useReportExport';

const EMPTY_FILTERS = {
  city: '', from: '', to: '', creditManagerId: '', telecallerId: '', productId: '',
  applicationStatus: '', assignmentStatus: 'all', verificationStatus: '',
  offerStatus: '', disbursalStatus: '', customerId: '',
};

export default function CreditManagerReportPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [summaryReady, setSummaryReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [teleFilter, setTeleFilter] = useState('');

  const caseFilters = useMemo(
    () => ({ ...filters, telecallerId: teleFilter || filters.telecallerId }),
    [filters, teleFilter]
  );
  const loadCases = useCallback((params, config) => adminAPI.getUnassignedCreditLeads(params, config), []);
  const cases = usePagedLeads(loadCases, caseFilters, summaryReady, refreshKey);
  const exportJob = useReportExport('credit', { ...filters, search: cases.searchInput });

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setError('');
    try {
      const params = {};
      Object.entries(filters).forEach(([key, value]) => { if (value) params[key] = value; });
      const report = await adminAPI.getCreditManagerReport(params);
      if (report.status === 1) setData(report.data);
      else setError(report.message || 'Failed to load report');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load report');
    } finally {
      setSummaryLoading(false);
      setSummaryReady(true);
    }
  }, [filters]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const refresh = async () => {
    setRefreshKey((value) => value + 1);
    await loadSummary();
  };

  const handleAssign = async (applicationIds, adminId) => {
    setAssigning(true);
    setError('');
    try {
      const response = await adminAPI.assignCreditManagersBatch(applicationIds, adminId);
      if (response.status !== 1) setError(response.message || 'Assign failed');
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Assign failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleAutoAssign = async () => {
    setAssigning(true);
    setError('');
    try {
      const response = await adminAPI.autoAssignCreditManagers();
      if (response.status !== 1) setError(response.message || 'Auto-assign failed');
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Auto-assign failed');
    } finally {
      setAssigning(false);
    }
  };

  const managers = data?.managers || [];
  const caseStaff = cases.extra?.managers || managers;
  const totals = useMemo(() => ({
    allocated: managers.reduce((sum, row) => sum + Number(row.allocated || 0), 0),
    pending: managers.reduce((sum, row) => sum + Number(row.pending || 0), 0),
    finished: managers.reduce((sum, row) => sum + Number(row.completed || 0), 0),
    hours: averageHours(managers, 'avg_processing_hours'),
  }), [managers]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[17px] font-bold text-slate-900 tracking-tight">Credit Manager performance</h1>
        <p className="text-xs text-slate-500">Allocated vs completed, verification, underwriting handoff, and workload</p>
      </div>

      <ReportFilters
        filters={filters}
        onApply={setFilters}
        cities={data?.cities || []}
        creditManagers={managers}
        telecallers={cases.extra?.telecallers || []}
      />

      {error && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
      {cases.error && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertDescription className="text-sm">{cases.error}</AlertDescription>
        </Alert>
      )}

      <ReportSummaryCards
        loading={summaryLoading}
        allocated={totals.allocated}
        pending={totals.pending}
        finished={totals.finished}
        averageHours={totals.hours}
      />

      {summaryLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
          <div className="h-4 w-48 bg-slate-100 animate-pulse rounded" />
          <div className="h-4 w-full bg-slate-100 animate-pulse rounded" />
          <div className="h-4 w-full bg-slate-100 animate-pulse rounded" />
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-2.5">Credit Manager</th>
                <th className="px-4 py-2.5 text-right">Allocated</th>
                <th className="px-4 py-2.5 text-right">Pending</th>
                <th className="px-4 py-2.5 text-right">Completed</th>
                <th className="px-4 py-2.5 text-right">Rejected</th>
                <th className="px-4 py-2.5 text-right">Verification</th>
                <th className="px-4 py-2.5 text-right">To UW</th>
                <th className="px-4 py-2.5 text-right">Completion %</th>
                <th className="px-4 py-2.5 text-right">Avg hours</th>
                <th className="px-4 py-2.5 text-right">Workload</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((m) => (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-slate-900">{m.full_name}</p>
                    <p className="text-[11px] text-slate-400 capitalize">{m.status}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.allocated}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.pending}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.completed}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.rejected}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.verification_completed}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.moved_to_underwriting}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{m.completion_percent}%</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.avg_processing_hours}</td>
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
        staff={caseStaff}
        staffLabel="Credit Manager"
        ownerField="credit_manager_name"
        loading={cases.loading}
        assigning={assigning}
        onAssign={handleAssign}
        onAutoAssign={handleAutoAssign}
        extraFilterOptions={cases.extra?.telecallers || []}
        extraFilterValue={teleFilter}
        onExtraFilterChange={setTeleFilter}
        extraFilterLabel="Telecaller"
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
      />
    </div>
  );
}
