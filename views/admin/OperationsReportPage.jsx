import { useCallback, useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import ReportFilters from '@/components/admin/reports/ReportFilters';
import UnassignedLeadsPanel from '@/components/admin/reports/UnassignedLeadsPanel';
import { formatStatusLabel } from '@/utils/statusUtils';

const EMPTY_FILTERS = {
  city: '', from: '', to: '', opsManagerId: '', underwriterId: '',
  applicationStatus: '', disbursalStatus: '', customerId: '',
};

export default function OperationsReportPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [unassigned, setUnassigned] = useState({ leads: [], managers: [] });
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
        adminAPI.getOperationsReport(params),
        adminAPI.getUnassignedOpsLeads(params),
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
        await adminAPI.assignOpsManager(id, adminId);
      }
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Assign failed');
    } finally {
      setAssigning(false);
    }
  };

  const rows = data?.managers || [];
  const applications = data?.applications || [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[17px] font-bold text-slate-900 tracking-tight">Operations report</h1>
        <p className="text-xs text-slate-500">Sign, e-mandate, disbursal sheet, bank transfer, and amount disbursed</p>
      </div>
      <ReportFilters filters={filters} setFilters={setFilters} cities={data?.cities || []} opsManagers={rows} />
      {error && <Alert variant="destructive" className="bg-red-50 border-red-200"><AlertDescription className="text-sm">{error}</AlertDescription></Alert>}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" variant="primary" /></div>
      ) : (
        <>
          <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[12px] text-slate-500 border-b bg-slate-50">
                  <th className="px-4 py-2.5">Operations</th>
                  <th className="px-4 py-2.5 text-right">Received</th>
                  <th className="px-4 py-2.5 text-right">Sign init</th>
                  <th className="px-4 py-2.5 text-right">Sign done</th>
                  <th className="px-4 py-2.5 text-right">Mandate init</th>
                  <th className="px-4 py-2.5 text-right">Mandate done</th>
                  <th className="px-4 py-2.5 text-right">Disbursal init</th>
                  <th className="px-4 py-2.5 text-right">Disbursed</th>
                  <th className="px-4 py-2.5 text-right">Pending</th>
                  <th className="px-4 py-2.5 text-right">Failed</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100">
                    <td className="px-4 py-2.5 font-semibold">{m.full_name}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{m.received}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{m.sign_initiated}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{m.sign_completed}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{m.emandate_initiated}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{m.emandate_completed}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{m.disbursal_initiated}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{m.disbursal_completed}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{m.pending}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{m.failed}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{Number(m.amount_disbursed || 0).toLocaleString('en-IN')}</td>
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
                  <th className="px-4 py-2.5">Ops owner</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Sheet</th>
                  <th className="px-4 py-2.5">UTR / bank</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{row.customer_name || row.customer_code}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{row.lead_id}</p>
                    </td>
                    <td className="px-4 py-2.5 text-[13px]">{row.ops_name || '—'}</td>
                    <td className="px-4 py-2.5 text-[12px]">{formatStatusLabel(row.application_status)}</td>
                    <td className="px-4 py-2.5 text-[12px]">{row.sheet_status || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-[12px]">{row.utr_number || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{Number(row.disbursed_amount || row.disbursement_amount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <UnassignedLeadsPanel
        title="Assign unassigned operations leads"
        leads={unassigned.leads || []}
        staff={unassigned.managers || rows}
        staffLabel="Operations Manager"
        ownerField="ops_name"
        assigning={assigning}
        onAssign={handleAssign}
        onAutoAssign={async () => {
          setAssigning(true);
          try {
            await adminAPI.autoAssignOpsManagers();
            await load();
          } finally {
            setAssigning(false);
          }
        }}
      />
    </div>
  );
}
