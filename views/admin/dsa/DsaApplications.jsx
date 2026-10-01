import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@/lib/router';
import { dsaAPI, unwrapDsaResponse } from '@/lib/api/dsa';
import { useDsaFilters } from '@/hooks/useDsaFilters';
import DsaFilterBar from '@/components/admin/dsa/DsaFilterBar';
import { PageLoader } from '@/components/ui/PageLoader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { RefreshCw, FileText, Search, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const PHASE_STYLES = {
  under_review: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-violet-50 text-violet-800 border-violet-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  disbursed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

const PHASE_CHIPS = [
  { id: '', label: 'All' },
  { id: 'under_review', label: 'Under review' },
  { id: 'approved', label: 'Approved' },
  { id: 'disbursed', label: 'Disbursed' },
  { id: 'rejected', label: 'Rejected' },
];

const formatAmount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
};

export default function DsaApplications() {
  const navigate = useNavigate();
  const { apiParams, phase, setPhase } = useDsaFilters();
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apps, setApps] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    const delay = search.trim() ? 350 : 0;
    const t = setTimeout(() => setDebouncedSearch(search.trim()), delay);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (opts = {}) => {
      const silent = opts.silent === true;
      if (!silent) setRefreshing(true);
      try {
        const res = await dsaAPI.listApplications({
          ...apiParams,
          search: debouncedSearch || undefined,
        });
        const { ok, data } = unwrapDsaResponse(res);
        if (ok) {
          setApps(data?.applications || []);
          setTotal(data?.pagination?.total ?? data?.applications?.length ?? 0);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch, apiParams]
  );

  useEffect(() => {
    load({ silent: hasLoadedOnce.current });
    hasLoadedOnce.current = true;
  }, [load]);

  if (initialLoading) return <PageLoader text="Loading applications…" />;

  return (
    <div className="space-y-8 pb-12 max-w-[1400px]">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 -ml-2 rounded-lg text-slate-600"
            onClick={() => navigate('/admin/dsa')}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            DSA home
          </Button>
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600">
              DSA Partner
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Loan applications
            </h1>
            <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
              {total} submitted application{total === 1 ? '' : 's'}. Draft or in-progress leads do
              not appear here until you submit.
            </p>
          </div>
        </div>
      </div>

      <DsaFilterBar showPhase />

      <div className="flex flex-wrap gap-2">
        {PHASE_CHIPS.map((chip) => (
          <button
            key={chip.id || 'all'}
            type="button"
            onClick={() => setPhase(chip.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all',
              (phase || '') === chip.id
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search name, mobile, app #, DSA code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 pl-10 rounded-lg border-slate-200 bg-white focus:bg-white"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => load()}
            disabled={refreshing}
            className="h-11 rounded-lg px-4 gap-2 border-slate-200 shrink-0"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white overflow-hidden relative min-h-[240px]">
        {refreshing && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <Spinner className="w-8 h-8" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                {['Application', 'Customer', 'DSA partner', 'Lead', 'Amount', 'Status', 'Submitted', ''].map((h) => (
                  <th
                    key={h || 'action'}
                    className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {apps.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-slate-800">
                    {a.application_number || `#${a.id}`}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900 capitalize">{a.customer_name || '—'}</p>
                    <p className="text-xs text-slate-500 mt-1 tabular-nums">{a.customer_mobile}</p>
                  </td>
                  <td className="px-5 py-4 text-xs">
                    <p className="font-medium text-slate-800">{a.dsa_name || '—'}</p>
                    {a.dsa_partner_code && (
                      <p className="text-[10px] font-mono text-slate-400">{a.dsa_partner_code}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-600">{a.lead_code || '—'}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900 tabular-nums">
                    {formatAmount(a.principal_amount || a.approved_amount)}
                  </td>
                  <td className="px-5 py-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        'font-medium',
                        PHASE_STYLES[a.display?.phase] || PHASE_STYLES.under_review
                      )}
                    >
                      {a.display?.title || 'Under review'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600">
                    {a.submitted_at
                      ? new Date(a.submitted_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg"
                      onClick={() => navigate(`/admin/dsa/applications/${a.id}/status`)}
                    >
                      View status
                    </Button>
                  </td>
                </tr>
              ))}
              {!apps.length && !refreshing && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <FileText className="w-10 h-10 opacity-40" />
                      <p className="text-sm font-medium text-slate-600">No submitted applications yet</p>
                      <p className="text-xs max-w-sm">
                        Complete and submit a lead application to see it here.
                      </p>
                      <Button
                        className="mt-2 rounded-lg"
                        variant="outline"
                        onClick={() => navigate('/admin/dsa/leads')}
                      >
                        Go to leads
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
