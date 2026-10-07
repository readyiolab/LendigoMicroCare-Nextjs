import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import ReportFilters from '@/components/admin/reports/ReportFilters';
import UnassignedLeadsPanel from '@/components/admin/reports/UnassignedLeadsPanel';
import ReassignTelecallerLeadsPanel from '@/components/admin/reports/ReassignTelecallerLeadsPanel';
import ReportSummaryCards, { averageHours } from '@/components/admin/reports/ReportSummaryCards';
import { usePagedLeads } from '@/components/admin/reports/usePagedLeads';
import { useReportExport } from '@/components/admin/reports/useReportExport';

const EMPTY_FILTERS = {
  city: '', from: '', to: '', telecallerId: '', creditManagerId: '', productId: '',
  applicationStatus: '', assignmentStatus: '', customerId: '',
};

export default function TelecallerReportPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [sourceId, setSourceId] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryReady, setSummaryReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [absentTarget, setAbsentTarget] = useState(null);

  const loadUnassigned = useCallback((params, config) => adminAPI.getUnassignedTelecallerLeads(params, config), []);
  const cases = usePagedLeads(loadUnassigned, filters, summaryReady, refreshKey);
  const assignedFilters = useMemo(() => ({ ...filters, telecallerId: sourceId }), [filters, sourceId]);
  const loadAssignedCases = useCallback((params, config) => adminAPI.getAssignedTelecallerLeads(params, config), []);
  const assignedCases = usePagedLeads(loadAssignedCases, assignedFilters, summaryReady && !!sourceId, refreshKey);
  const exportJob = useReportExport('telecaller', filters);

  const load = useCallback(async () => {
    setSummaryLoading(true);
    setError('');
    try {
      const params = {};
      Object.entries(filters).forEach(([key, value]) => { if (value) params[key] = value; });
      const report = await adminAPI.getTelecallerReport(params);
      if (report.status === 1) setData(report.data);
      else setError(report.message || 'Failed to load report');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load report');
    } finally {
      setSummaryLoading(false);
      setSummaryReady(true);
    }
  }, [filters]);

  const bump = async () => {
    setRefreshKey((value) => value + 1);
    await load();
  };

  useEffect(() => { load(); }, [load]);

  const handleAssign = async (applicationIds, adminId) => {
    setAssigning(true);
    setError('');
    try {
      for (const id of applicationIds) {
        await adminAPI.assignApplication(id, adminId);
      }
      await bump();
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
      await adminAPI.autoAssignApplications({ status: 'draft' });
      await adminAPI.autoAssignApplications({ status: 'pending_eligibility' });
      await bump();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Auto-assign failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleReassign = async (applicationIds, adminId) => {
    setAssigning(true);
    setError('');
    try {
      await adminAPI.reassignTelecallerApplications(applicationIds, adminId);
      await bump();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Reassign failed');
    } finally {
      setAssigning(false);
    }
  };

  const confirmMarkAbsent = async () => {
    const telecaller = absentTarget;
    if (!telecaller) return;
    setStatusUpdatingId(telecaller.id);
    setError('');
    try {
      const res = await adminAPI.markTelecallerAbsent(telecaller.id);
      if (res.status !== 1) throw new Error(res.message || 'Failed to mark absent');
      setAbsentTarget(null);
      await bump();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to mark absent');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleMarkAvailable = async (telecaller) => {
    setStatusUpdatingId(telecaller.id);
    setError('');
    try {
      const res = await adminAPI.markTelecallerAvailable(telecaller.id);
      if (res.status !== 1) throw new Error(res.message || 'Failed to mark available');
      await bump();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to mark available');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const rows = data?.telecallers || [];
  const staffList = cases.extra?.telecallers?.length ? cases.extra.telecallers : rows;
  const reassignStaff = assignedCases.extra?.telecallers?.length ? assignedCases.extra.telecallers : staffList;
  const totals = {
    allocated: rows.reduce((sum, row) => sum + Number(row.allocated || 0), 0),
    pending: rows.reduce((sum, row) => sum + Number(row.pending || 0), 0),
    finished: rows.reduce((sum, row) => sum + Number(row.completed || 0), 0),
    hours: averageHours(rows, 'avg_completion_hours'),
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[17px] font-bold text-slate-900 tracking-tight">Telecaller performance</h1>
        <p className="text-xs text-slate-500">Allocation, contacts, completion, abandoned leads, and active workload</p>
      </div>
      <ReportFilters filters={filters} onApply={setFilters} cities={data?.cities || []} telecallers={rows} />
      {error && <Alert variant="destructive" className="bg-red-50 border-red-200"><AlertDescription className="text-sm">{error}</AlertDescription></Alert>}
      <ReportSummaryCards loading={summaryLoading} allocated={totals.allocated} pending={totals.pending} finished={totals.finished} averageHours={totals.hours} />
      {summaryLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4"><div className="h-4 w-full bg-slate-100 animate-pulse rounded" /></div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-2.5">Telecaller</th>
                <th className="px-4 py-2.5 text-right">Allocated</th>
                <th className="px-4 py-2.5 text-right">Started</th>
                <th className="px-4 py-2.5 text-right">Completed</th>
                <th className="px-4 py-2.5 text-right">Pending</th>
                <th className="px-4 py-2.5 text-right">Abandoned</th>
                <th className="px-4 py-2.5 text-right">Connected</th>
                <th className="px-4 py-2.5 text-right">Missed</th>
                <th className="px-4 py-2.5 text-right">Completion %</th>
                <th className="px-4 py-2.5 text-right">Avg hours</th>
                <th className="px-4 py-2.5 text-right">Workload</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-slate-900">{m.full_name}</p>
                    <p className="text-[11px] text-slate-400 capitalize">{m.status}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.allocated}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.started}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.completed}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.pending}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.abandoned}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.successful_contacts}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.unsuccessful_contacts}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{m.completion_percent}%</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.avg_completion_hours}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{m.current_workload}</td>
                  <td className="px-4 py-2.5 text-right">
                    {m.status === 'inactive' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        disabled={statusUpdatingId === m.id || assigning}
                        onClick={() => handleMarkAvailable(m)}
                      >
                        {statusUpdatingId === m.id ? 'Updating…' : 'Mark available'}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        disabled={statusUpdatingId === m.id || assigning}
                        onClick={() => setAbsentTarget(m)}
                      >
                        {statusUpdatingId === m.id ? 'Updating…' : 'Mark absent'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AlertDialog open={!!absentTarget} onOpenChange={(open) => { if (!open && !statusUpdatingId) setAbsentTarget(null); }}>
        <AlertDialogContent className="rounded-lg p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              Mark {absentTarget?.full_name} as absent?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-slate-600">
              Their {Number(absentTarget?.current_workload || absentTarget?.pending || 0)} open telecaller
              lead(s) will be redistributed to other active telecallers. They will not receive new auto-assignments until marked available again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-md" disabled={!!statusUpdatingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-md"
              disabled={!!statusUpdatingId}
              onClick={(e) => {
                e.preventDefault();
                confirmMarkAbsent();
              }}
            >
              {statusUpdatingId ? 'Updating…' : 'Mark absent'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <UnassignedLeadsPanel
        title="Cases"
        leads={cases.leads}
        staff={(cases.extra?.telecallers || rows).filter((t) => t.status === 'active')}
        staffLabel="Telecaller"
        ownerField="telecaller_name"
        loading={cases.loading}
        assigning={assigning}
        onAssign={handleAssign}
        onAutoAssign={handleAutoAssign}
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
      <ReassignTelecallerLeadsPanel
        telecallers={reassignStaff}
        leads={assignedCases.leads}
        sourceId={sourceId}
        onSourceChange={setSourceId}
        loading={assignedCases.loading}
        assigning={assigning}
        onReassign={handleReassign}
        page={assignedCases.page}
        pageSize={assignedCases.pageSize}
        total={assignedCases.total}
        onPageChange={assignedCases.setPage}
      />
    </div>
  );
}
