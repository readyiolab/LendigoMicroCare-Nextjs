import { useCallback, useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import ReportFilters from '@/components/admin/reports/ReportFilters';
import UnassignedLeadsPanel from '@/components/admin/reports/UnassignedLeadsPanel';

const EMPTY_FILTERS = {
  city: '', from: '', to: '', creditManagerId: '', telecallerId: '',
  applicationStatus: '', assignmentStatus: 'all', verificationStatus: '',
  offerStatus: '', disbursalStatus: '', customerId: '',
};

export default function CreditManagerReportPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [unassigned, setUnassigned] = useState({ leads: [], managers: [], telecallers: [] });
  const [teleFilter, setTeleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      Object.entries(filters).forEach(([key, value]) => { if (value) params[key] = value; });
      const [report, unassignedRes] = await Promise.all([
        adminAPI.getCreditManagerReport(params),
        adminAPI.getUnassignedCreditLeads({ ...params, telecallerId: teleFilter || undefined }),
      ]);
      if (report.status === 1) setData(report.data);
      else setError(report.message || 'Failed to load report');
      if (unassignedRes.status === 1) setUnassigned(unassignedRes.data || { leads: [] });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [filters, teleFilter]);

  useEffect(() => { load(); }, [load]);

  const handleAssign = async (applicationIds, adminId) => {
    setAssigning(true);
    setError('');
    try {
      const response = await adminAPI.assignCreditManagersBatch(applicationIds, adminId);
      if (response.status !== 1) setError(response.message || 'Assign failed');
      await load();
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
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Auto-assign failed');
    } finally {
      setAssigning(false);
    }
  };

  const managers = data?.managers || [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[17px] font-bold text-slate-900 tracking-tight">Credit Manager performance</h1>
        <p className="text-xs text-slate-500">Allocated vs completed, verification, underwriting handoff, and workload</p>
      </div>

      <ReportFilters
        filters={filters}
        setFilters={setFilters}
        cities={data?.cities || []}
        creditManagers={managers}
        telecallers={unassigned.telecallers || []}
      />

      {error && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" variant="primary" /></div>
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
        title="Assign / Reassign leads"
        leads={unassigned.leads || []}
        staff={unassigned.managers || managers}
        staffLabel="Credit Manager"
        ownerField="credit_manager_name"
        assigning={assigning}
        onAssign={handleAssign}
        onAutoAssign={handleAutoAssign}
        extraFilterOptions={unassigned.telecallers || []}
        extraFilterValue={teleFilter}
        onExtraFilterChange={setTeleFilter}
        extraFilterLabel="Filter by telecaller"
        managerFilterOptions={unassigned.managers || managers}
        managerFilterValue={filters.creditManagerId || (filters.assignmentStatus === 'all' ? 'all' : filters.assignmentStatus) || ''}
        onManagerFilterChange={(val) => {
          if (val === 'unassigned') {
            setFilters((prev) => ({ ...prev, creditManagerId: '', assignmentStatus: 'unassigned' }));
          } else if (val === 'assigned') {
            setFilters((prev) => ({ ...prev, creditManagerId: '', assignmentStatus: 'assigned' }));
          } else if (val === 'all' || val === '') {
            setFilters((prev) => ({ ...prev, creditManagerId: '', assignmentStatus: 'all' }));
          } else {
            setFilters((prev) => ({ ...prev, creditManagerId: val, assignmentStatus: '' }));
          }
        }}
        managerFilterLabel="Filter by Credit Manager"
      />
    </div>
  );
}
