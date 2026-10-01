import { useEffect, useState } from 'react';
import { dsaAPI, unwrapDsaResponse } from '@/lib/api/dsa';
import { DsaTableSkeleton } from '@/components/admin/dsa/DsaStatSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DsaSettlements() {
  const [loading, setLoading] = useState(true);
  const [settlements, setSettlements] = useState([]);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));

  const load = async (opts = {}) => {
    if (!opts.silent) setLoading(true);
    try {
      const res = await dsaAPI.listSettlements();
      const { ok, data } = unwrapDsaResponse(res);
      if (ok) setSettlements(data?.settlements || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createBatch = async () => {
    try {
      await dsaAPI.createSettlement({ period_month: period });
      load({ silent: true });
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  const approve = async (id) => {
    await dsaAPI.approveSettlement(id, true);
    load({ silent: true });
  };

  const markPaid = async (id) => {
    await dsaAPI.markSettlementPaid(id);
    load({ silent: true });
  };

  return (
    <div className="space-y-6 pb-10">
      <h1 className="text-2xl font-bold">Settlement reports</h1>
      <div className="flex gap-2 items-end">
        <div>
          <label className="text-xs text-slate-500">Period (YYYY-MM)</label>
          <Input value={period} onChange={(e) => setPeriod(e.target.value)} className="max-w-[140px]" />
        </div>
        <Button onClick={createBatch}>Create settlement batch</Button>
      </div>
      {loading ? (
        <DsaTableSkeleton rows={5} cols={5} />
      ) : (
      <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white text-left text-[10px] uppercase text-slate-500">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Period</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-mono text-xs">{s.settlement_code}</td>
                <td className="p-3">{s.period_month}</td>
                <td className="p-3 font-semibold">₹{Number(s.total_amount).toLocaleString('en-IN')}</td>
                <td className="p-3">{s.status}</td>
                <td className="p-3 space-x-2">
                  {s.status === 'pending_approval' && (
                    <Button size="sm" variant="outline" onClick={() => approve(s.id)}>Approve</Button>
                  )}
                  {s.status === 'approved' && (
                    <Button size="sm" onClick={() => markPaid(s.id)}>Mark paid</Button>
                  )}
                </td>
              </tr>
            ))}
            {!settlements.length && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">No settlements</td></tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
