import { useEffect, useState } from 'react';
import { dsaAPI, unwrapDsaResponse } from '@/lib/api/dsa';
import { useDsaFilters } from '@/hooks/useDsaFilters';
import DsaFilterBar from '@/components/admin/dsa/DsaFilterBar';
import DsaFunnelDiagram from '@/components/admin/dsa/DsaFunnelDiagram';
import { DsaStatSkeleton } from '@/components/admin/dsa/DsaStatSkeleton';

export default function DsaReports() {
  const { apiParams } = useDsaFilters();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await dsaAPI.getReports(apiParams);
        const { ok, data } = unwrapDsaResponse(res);
        if (ok) setReports(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [apiParams]);

  const c = reports?.conversion || {};
  const d = reports?.disbursed || {};
  const a = reports?.approval || {};

  return (
    <div className="space-y-6 pb-10 max-w-[1400px]">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600">DSA Partner</p>
        <h1 className="text-2xl font-bold text-slate-900">DSA reports</h1>
        <p className="text-sm text-slate-500">Filtered analytics and per-partner breakdown</p>
      </div>

      <DsaFilterBar />

      {loading ? (
        <DsaStatSkeleton count={3} />
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-800 mb-2">Lead conversion</h2>
              <p className="text-3xl font-bold text-blue-600">{c.conversionRatio ?? 0}%</p>
              <p className="text-sm text-slate-500 mt-1">
                {c.convertedLeads} / {c.totalLeads} leads converted
              </p>
            </div>
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-800 mb-2">Disbursed amount</h2>
              <p className="text-3xl font-bold text-emerald-600">
                ₹{Number(d.disbursedAmount || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-sm text-slate-500 mt-1">{d.disbursedCount} loans disbursed</p>
            </div>
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-800 mb-2">Approval rate</h2>
              <p className="text-3xl font-bold text-violet-600">{a.approvalPercentage ?? 0}%</p>
              <p className="text-sm text-slate-500 mt-1">
                {a.approved} approved · {a.rejected} rejected
              </p>
            </div>
          </div>

          <DsaFunnelDiagram funnel={reports?.funnel} />

          {reports?.partnerRows?.length > 0 && (
            <div className="rounded-md border border-slate-200 bg-white overflow-x-auto">
              <h3 className="text-sm font-semibold text-slate-900 p-4 border-b">By partner</h3>
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="bg-white text-left text-[10px] uppercase text-slate-500">
                    <th className="p-3">Partner</th>
                    <th className="p-3">Leads</th>
                    <th className="p-3">Submitted</th>
                    <th className="p-3">Disbursed</th>
                    <th className="p-3">Rejected</th>
                    <th className="p-3">Conv.%</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.partnerRows.map((m) => {
                    const s = m.stats || {};
                    return (
                      <tr key={m.id} className="border-t">
                        <td className="p-3 font-medium">{m.fullName}</td>
                        <td className="p-3">{s.totalLeads}</td>
                        <td className="p-3">{s.submittedApps}</td>
                        <td className="p-3 text-emerald-700 font-semibold">{s.disbursedCount}</td>
                        <td className="p-3 text-red-600">{s.rejectedApps}</td>
                        <td className="p-3">{s.leadConversionPct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
