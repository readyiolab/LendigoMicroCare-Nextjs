import { useCallback, useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import ReportFilters from '@/components/admin/reports/ReportFilters';
import UnassignedLeadsPanel from '@/components/admin/reports/UnassignedLeadsPanel';
import { formatStatusLabel } from '@/utils/statusUtils';

const EMPTY_FILTERS = {
  city: '', from: '', to: '', underwriterId: '', creditManagerId: '',
  applicationStatus: '', offerStatus: '', customerId: '',
};

export default function UnderwriterReportPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [unassigned, setUnassigned] = useState({ leads: [], underwriters: [] });
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
        adminAPI.getUnderwriterReport(params),
        adminAPI.getUnassignedUnderwriterLeads(params),
      ]);
      if (report.status === 1) setData(report.data);
      else setError(report.message || 'Failed to load report');
      if (unassignedRes.status === 1) setUnassigned(unassignedRes.data || { leads: [] });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleAssign = async (applicationIds, adminId) => {
    setAssigning(true);
    setError('');
    try {
      for (const id of applicationIds) {
        await adminAPI.assignUnderwriter(id, adminId);
      }
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Assign failed');
    } finally {
      setAssigning(false);
    }
  };

  const rows = data?.underwriters || [];
  const applications = data?.applications || [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[17px] font-bold text-slate-900 tracking-tight">Underwriter report</h1>
        <p className="text-xs text-slate-500">Received through offer, video declaration, and operations handoff</p>
      </div>
      <ReportFilters filters={filters} setFilters={setFilters} cities={data?.cities || []} underwriters={rows} creditManagers={[]} />
      {error && <Alert variant="destructive" className="bg-red-50 border-red-200"><AlertDescription className="text-sm">{error}</AlertDescription></Alert>}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" variant="primary" /></div>
      ) : (
        <>
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
          <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[12px] text-slate-500 border-b bg-slate-50">
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5">Credit Manager</th>
                  <th className="px-4 py-2.5">Underwriter</th>
                  <th className="px-4 py-2.5">Offer</th>
                  <th className="px-4 py-2.5">Accepted</th>
                  <th className="px-4 py-2.5">Video declaration</th>
                  <th className="px-4 py-2.5">Video verified</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{row.customer_name || row.customer_code}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{row.lead_id}</p>
                    </td>
                    <td className="px-4 py-2.5 text-[13px]">{row.credit_manager_name || '—'}</td>
                    <td className="px-4 py-2.5 text-[13px]">{row.underwriter_name || '—'}</td>
                    <td className="px-4 py-2.5 text-[13px]">{row.offer}</td>
                    <td className="px-4 py-2.5 text-[13px]">{row.accepted}</td>
                    <td className="px-4 py-2.5 text-[13px]">{row.video_declaration}</td>
                    <td className="px-4 py-2.5 text-[13px]">{row.video_verified}</td>
                    <td className="px-4 py-2.5 text-[12px]">{formatStatusLabel(row.application_status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <UnassignedLeadsPanel
        title="Assign unassigned underwriting leads"
        leads={unassigned.leads || []}
        staff={unassigned.underwriters || rows}
        staffLabel="Underwriter"
        ownerField="underwriter_name"
        assigning={assigning}
        onAssign={handleAssign}
        onAutoAssign={async () => {
          setAssigning(true);
          try {
            await adminAPI.autoAssignUnderwriters();
            await load();
          } finally {
            setAssigning(false);
          }
        }}
      />
    </div>
  );
}
