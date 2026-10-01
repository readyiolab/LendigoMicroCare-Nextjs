import { useEffect, useState } from 'react';
import { dsaAPI, unwrapDsaResponse } from '@/lib/api/dsa';
import { useDsaFilters } from '@/hooks/useDsaFilters';
import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DsaFilterBar({ showPhase = false, className }) {
  const { dsaAdminId, from, to, phase, apiParams, setDsa, setFrom, setTo, setPhase, clearFilters } =
    useDsaFilters();
  const [partners, setPartners] = useState([]);
  const [canFilter, setCanFilter] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await dsaAPI.listPartners();
        const { ok, data } = unwrapDsaResponse(res);
        if (ok) {
          setPartners(data?.options || []);
          setCanFilter(data?.canFilterByPartner !== false);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const hasActive = dsaAdminId || from || to || (phase && phase !== 'all');

  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3',
        className
      )}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Filter className="w-3.5 h-3.5" />
        Filters
        {hasActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto text-[11px] font-medium text-slate-600 hover:text-slate-900 normal-case flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {canFilter && (
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">DSA partner</label>
            <select
              value={dsaAdminId}
              onChange={(e) => setDsa(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {partners.map((p) => (
                <option key={p.id || 'all'} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-[11px] font-medium text-slate-500 block mb-1">From date</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-500 block mb-1">To date</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm"
          />
        </div>
        {showPhase && (
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">Application status</label>
            <select
              value={phase || 'all'}
              onChange={(e) => setPhase(e.target.value === 'all' ? '' : e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-sm"
            >
              <option value="all">All submitted</option>
              <option value="under_review">Under review</option>
              <option value="approved">Approved (pipeline)</option>
              <option value="disbursed">Disbursed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
