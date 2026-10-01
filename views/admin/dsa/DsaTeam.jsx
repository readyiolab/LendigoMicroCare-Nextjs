import { useEffect, useState } from 'react';
import { useNavigate } from '@/lib/router';
import { dsaAPI, unwrapDsaResponse } from '@/lib/api/dsa';
import { useDsaFilters } from '@/hooks/useDsaFilters';
import DsaFilterBar from '@/components/admin/dsa/DsaFilterBar';
import DsaFunnelDiagram from '@/components/admin/dsa/DsaFunnelDiagram';
import DsaHierarchyTree from '@/components/admin/dsa/DsaHierarchyTree';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';

export default function DsaTeam() {
  const navigate = useNavigate();
  const { apiParams } = useDsaFilters();
  const [loading, setLoading] = useState(true);
  const [hierarchy, setHierarchy] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await dsaAPI.getHierarchy(apiParams);
        const { ok, data } = unwrapDsaResponse(res);
        if (ok) setHierarchy(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [apiParams]);

  const exportCsv = () => {
    const rows = hierarchy?.members || [];
    if (!rows.length) return;
    const header = [
      'Name',
      'Code',
      'Role',
      'Leads',
      'Submitted',
      'Under Review',
      'Approved',
      'Disbursed',
      'Rejected Apps',
      'Disbursed Amount',
    ];
    const lines = rows.map((m) => {
      const s = m.stats || {};
      return [
        m.fullName,
        m.dsaCode || '',
        m.roleCode,
        s.totalLeads,
        s.submittedApps,
        s.underReview,
        s.approvedPipeline,
        s.disbursedCount,
        s.rejectedApps,
        s.disbursedAmount,
      ].join(',');
    });
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dsa-partners.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const t = hierarchy?.totals || {};

  return (
    <div className="space-y-6 pb-10 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => navigate('/admin/dsa')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Partners & hierarchy</h1>
          <p className="text-sm text-slate-500 max-w-xl">
            Tree view of DSA agents and managers. Stats roll up from agents to sales / branch managers.
          </p>
        </div>
        <Button variant="outline" className="rounded-lg shrink-0" onClick={exportCsv} disabled={!hierarchy?.members?.length}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <DsaFilterBar />

      {!loading && hierarchy?.totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            ['Leads', t.totalLeads],
            ['Submitted', t.submittedApps],
            ['Review', t.underReview],
            ['Approved', t.approvedPipeline],
            ['Disbursed', t.disbursedCount],
            ['Rejected', t.rejectedApps],
          ].map(([label, val]) => (
            <div key={label} className="rounded-lg border bg-white px-3 py-2 text-center shadow-sm">
              <p className="text-lg font-bold text-slate-900 tabular-nums">{val ?? 0}</p>
              <p className="text-[10px] uppercase font-bold text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      <DsaFunnelDiagram funnel={hierarchy?.funnel} />

      <DsaHierarchyTree tree={hierarchy?.tree || []} loading={loading} />

      {!loading && hierarchy?.members?.length > 0 && (
        <div className="rounded-md border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-white text-left text-[10px] uppercase text-slate-500">
                <th className="p-3">Partner</th>
                <th className="p-3">Role</th>
                <th className="p-3">Leads</th>
                <th className="p-3">Submitted</th>
                <th className="p-3">Under review</th>
                <th className="p-3">Approved</th>
                <th className="p-3">Disbursed</th>
                <th className="p-3">Rejected</th>
                <th className="p-3">₹ Disbursed</th>
              </tr>
            </thead>
            <tbody>
              {hierarchy.members.map((m) => {
                const s = m.stats || {};
                return (
                  <tr key={m.id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-medium">
                      {m.fullName}
                      {m.dsaCode && <span className="block text-[10px] font-mono text-slate-400">{m.dsaCode}</span>}
                    </td>
                    <td className="p-3 text-xs">{m.roleCode}</td>
                    <td className="p-3 tabular-nums">{s.totalLeads}</td>
                    <td className="p-3 tabular-nums">{s.submittedApps}</td>
                    <td className="p-3 tabular-nums">{s.underReview}</td>
                    <td className="p-3 tabular-nums">{s.approvedPipeline}</td>
                    <td className="p-3 tabular-nums font-semibold text-emerald-700">{s.disbursedCount}</td>
                    <td className="p-3 tabular-nums text-red-600">{s.rejectedApps}</td>
                    <td className="p-3 tabular-nums">₹{Number(s.disbursedAmount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
