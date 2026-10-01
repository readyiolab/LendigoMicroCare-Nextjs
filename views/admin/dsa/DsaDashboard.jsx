import { useEffect, useState } from 'react';
import { useNavigate } from '@/lib/router';
import { dsaAPI, unwrapDsaResponse } from '@/lib/api/dsa';
import { useDsaFilters } from '@/hooks/useDsaFilters';
import DsaFilterBar from '@/components/admin/dsa/DsaFilterBar';
import DsaFunnelDiagram from '@/components/admin/dsa/DsaFunnelDiagram';
import DsaHierarchyTree from '@/components/admin/dsa/DsaHierarchyTree';
import { DsaStatSkeleton } from '@/components/admin/dsa/DsaStatSkeleton';
import { Button } from '@/components/ui/button';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
  FileText,
  Plus,
  Send,
  Banknote,
} from 'lucide-react';

const Stat = ({ label, value, sub, icon: Icon, color }) => (
  <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
    {sub && <p className="text-[11px] text-slate-500 mt-1">{sub}</p>}
  </div>
);

export default function DsaDashboard() {
  const navigate = useNavigate();
  const { apiParams, withDsaQuery } = useDsaFilters();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [hierarchy, setHierarchy] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [dashRes, hierRes] = await Promise.all([
          dsaAPI.getDashboard(apiParams),
          dsaAPI.getHierarchy(apiParams),
        ]);
        if (cancelled) return;
        const dash = unwrapDsaResponse(dashRes);
        const hier = unwrapDsaResponse(hierRes);
        if (dash.ok) setData(dash.data);
        if (hier.ok) setHierarchy(hier.data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiParams]);

  const d = data || {};
  const funnel = d.funnel || hierarchy?.funnel || {};

  return (
    <div className="space-y-6 pb-10 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600">DSA Partner</p>
          <h1 className="text-2xl font-bold text-slate-900">DSA dashboard</h1>
          <p className="text-sm text-slate-500">Hierarchy, funnel, and partner performance</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-lg" onClick={() => navigate(withDsaQuery('/admin/dsa/team'))}>
            Full hierarchy
          </Button>
          <Button variant="outline" className="rounded-lg" onClick={() => navigate(withDsaQuery('/admin/dsa/applications'))}>
            Applications
          </Button>
          <Button className="rounded-lg" onClick={() => navigate('/admin/dsa/leads?new=1')}>
            <Plus className="w-4 h-4 mr-2" /> Add lead
          </Button>
        </div>
      </div>

      <DsaFilterBar />

      {loading ? (
        <>
          <DsaStatSkeleton count={4} />
          <DsaStatSkeleton count={4} />
        </>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Leads</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Total leads" value={d.totalLeads ?? 0} icon={Users} color="bg-blue-50 text-blue-600" />
            <Stat label="Pending leads" value={d.pendingLeads ?? 0} icon={Clock} color="bg-amber-50 text-amber-600" />
            <Stat label="Converted" value={d.convertedLeads ?? 0} sub={`${d.leadConversionRatio ?? 0}% conversion`} icon={Send} color="bg-indigo-50 text-indigo-600" />
            <Stat label="Leads rejected" value={d.rejectedLeads ?? 0} icon={XCircle} color="bg-red-50 text-red-600" />
          </div>

          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 pt-2">Applications & loans</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Submitted" value={d.submittedApps ?? 0} icon={FileText} color="bg-slate-50 text-slate-700" />
            <Stat label="Under review" value={d.underReview ?? 0} icon={Clock} color="bg-amber-50 text-amber-700" />
            <Stat label="Approved pipeline" value={d.approvedPipeline ?? 0} icon={CheckCircle2} color="bg-violet-50 text-violet-700" />
            <Stat label="Disbursed" value={d.disbursedLoans ?? 0} sub={`₹${Number(d.disbursedAmount || 0).toLocaleString('en-IN')}`} icon={Banknote} color="bg-emerald-50 text-emerald-700" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Stat label="Apps rejected" value={d.rejectedApps ?? 0} icon={XCircle} color="bg-red-50 text-red-600" />
            <Stat
              label="Commission earned"
              value={`₹${Number(d.commissionEarned || 0).toLocaleString('en-IN')}`}
              icon={IndianRupee}
              color="bg-indigo-50 text-indigo-600"
            />
            <Stat label="Disbursal rate" value={`${d.disbursalRatePct ?? 0}%`} sub="Of submitted apps" icon={CheckCircle2} color="bg-teal-50 text-teal-700" />
          </div>

          <DsaFunnelDiagram funnel={funnel} />

          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Partner hierarchy</h2>
            <DsaHierarchyTree tree={hierarchy?.tree || []} loading={false} />
          </div>
        </>
      )}
    </div>
  );
}
