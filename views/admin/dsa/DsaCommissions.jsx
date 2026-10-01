import { useEffect, useState } from 'react';
import { dsaAPI, unwrapDsaResponse } from '@/lib/api/dsa';
import { DsaStatSkeleton, DsaTableSkeleton } from '@/components/admin/dsa/DsaStatSkeleton';
import { Badge } from '@/components/ui/badge';

export default function DsaCommissions() {
  const [loadingMain, setLoadingMain] = useState(true);
  const [loadingMonthly, setLoadingMonthly] = useState(true);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({});
  const [monthly, setMonthly] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const listRes = await dsaAPI.listCommissions();
        if (cancelled) return;
        const list = unwrapDsaResponse(listRes);
        if (list.ok) {
          setEntries(list.data?.entries || []);
          setSummary(list.data?.summary || {});
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingMain(false);
      }
    })();
    const monthlyTimer = setTimeout(async () => {
      try {
        const monthRes = await dsaAPI.monthlyEarnings(6);
        if (cancelled) return;
        const month = unwrapDsaResponse(monthRes);
        if (month.ok) setMonthly(month.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingMonthly(false);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(monthlyTimer);
    };
  }, []);

  return (
    <div className="space-y-6 pb-10">
      <h1 className="text-2xl font-bold text-slate-900">Commission management</h1>

      {loadingMain ? (
        <DsaStatSkeleton count={3} />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border p-5 bg-white">
          <p className="text-xs uppercase text-slate-500 font-bold">Total earned</p>
          <p className="text-2xl font-bold">₹{Number(summary.total || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="rounded-lg border p-5 bg-white">
          <p className="text-xs uppercase text-slate-500 font-bold">Pending (accrued)</p>
          <p className="text-2xl font-bold text-amber-600">₹{Number(summary.accrued || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="rounded-lg border p-5 bg-white">
          <p className="text-xs uppercase text-slate-500 font-bold">Paid</p>
          <p className="text-2xl font-bold text-emerald-600">₹{Number(summary.paid || 0).toLocaleString('en-IN')}</p>
        </div>
      </div>
      )}

      {loadingMonthly ? (
        <div className="rounded-lg border bg-white p-5 h-24 animate-pulse" />
      ) : monthly.length > 0 && (
        <div className="rounded-lg border bg-white p-5">
          <h2 className="font-semibold mb-3">Monthly earnings</h2>
          <div className="flex flex-wrap gap-3">
            {monthly.map((m) => (
              <div key={m.month} className="px-4 py-2 rounded-lg bg-slate-50 border text-sm">
                <span className="font-mono text-slate-500">{m.month}</span>
                <span className="ml-2 font-bold">₹{Number(m.earned).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loadingMain ? (
        <DsaTableSkeleton rows={8} cols={5} />
      ) : (
      <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white text-left text-[10px] uppercase text-slate-500">
            <tr>
              <th className="p-3">App #</th>
              <th className="p-3">DSA</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3">{e.application_number}</td>
                <td className="p-3">{e.dsa_name || e.dsa_admin_id}</td>
                <td className="p-3 font-semibold">₹{e.commission_amount}</td>
                <td className="p-3"><Badge variant="outline">{e.status}</Badge></td>
                <td className="p-3 text-xs text-slate-500">{new Date(e.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {!entries.length && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">No commission entries</td></tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
