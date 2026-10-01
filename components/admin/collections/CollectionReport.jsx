import React from 'react';
import { 
  FileBarChart2, 
  TrendingUp, 
  AlertTriangle, 
  Download,
  Calendar,
  CheckCircle2,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import PendingCollectionMISPanel from '@/components/admin/collections/PendingCollectionMISPanel';
import CollectorProductivityMISPanel from '@/components/admin/collections/CollectorProductivityMISPanel';

export default function CollectionReport({ data, loading, dashboardData }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-32 gap-4 bg-white rounded-lg border border-slate-100 shadow-sm">
        <Spinner className="w-12 h-12 text-red-600" />
        <p className="text-slate-400 font-medium text-xs uppercase tracking-[0.3em] animate-pulse">Running Portfolio Analytics...</p>
      </div>
    );
  }

  if (!data) return null;

  const totalDueAllBuckets = Number(data?.summary?.totalDue || 0);
  const recoveryPct = dashboardData?.portfolio?.recoveryRatePct;

  const exportReportCsv = () => {
    const buckets = Array.isArray(data?.buckets) ? data.buckets : [];
    const rows = [
      ['Bucket', 'Accounts', 'Principal Due', 'Penalty Due', 'Total Due'],
      ...buckets.map((b) => [
        b.bucket || '',
        b.count || 0,
        b.principalDue || 0,
        b.penaltyDue || 0,
        b.totalDue || 0,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overdue-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
           <div className="p-2.5 bg-slate-900 rounded-lg shadow-lg shadow-slate-200">
              <FileBarChart2 className="w-5 h-5 text-white" />
           </div>
           <div>
              <h3 className="text-lg font-medium text-slate-900 tracking-tight">Overdue Payment Report</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-medium">Daily summary of payments and overdue loans.</p>
           </div>
        </div>
        <Button
          variant="outline"
          onClick={exportReportCsv}
          className="h-10 px-4 rounded-lg border-slate-100 bg-white hover:bg-slate-50 gap-2 font-medium shadow-sm transition-all"
        >
          <Download className="w-4 h-4" /> Export buckets
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Recovery Analytics Card */}
        <div className="bg-white rounded-lg border border-slate-100 p-5 shadow-sm space-y-4">
           <div className="flex items-center gap-3 opacity-60">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] uppercase font-medium tracking-widest">Recovery Success</span>
           </div>
           <div className="space-y-1">
              <p className="text-3xl font-medium tracking-tighter text-slate-900">
                {recoveryPct != null ? `${recoveryPct}%` : '—'}
              </p>
              <p className="text-[11px] text-slate-400 font-medium">Collected vs collected + overdue principal.</p>
           </div>
           <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Late Charge Rate</span>
              <span className="text-[10px] text-red-600 font-semibold uppercase">{data.penaltyRate || '2% per day'}</span>
           </div>
        </div>

        {/* Portfolio Ageing Card */}
        <div className="bg-white rounded-lg border border-slate-100 p-5 shadow-sm space-y-4">
           <div className="flex items-center gap-3 opacity-60">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] uppercase font-medium tracking-widest">Loan Delay Periods</span>
           </div>
           <div className="space-y-4">
              {!data.buckets || data.buckets.length === 0 ? (
                <div className="py-4 text-center border border-dashed border-slate-100 rounded-lg">
                   <p className="text-[10px] text-slate-400 uppercase tracking-widest">No Recent Delays</p>
                </div>
              ) : (
                data.buckets.map((bucket, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">{bucket.bucket || 'Bucket'}</span>
                       <span className="text-sm font-medium text-slate-900 tracking-tighter">₹{parseFloat(bucket.totalDue || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                       <div 
                        className={cn("h-full rounded-full", idx === 0 ? "bg-blue-500" : "bg-amber-500")} 
                        style={{
                          width: `${totalDueAllBuckets > 0
                            ? Math.max(8, (Number(bucket.totalDue || 0) / totalDueAllBuckets) * 100)
                            : 0}%`
                        }}
                       />
                    </div>
                  </div>
                ))
              )}
           </div>
        </div>

        {/* Operational Data */}
        <div className="bg-white rounded-lg border border-slate-100 p-5 shadow-sm space-y-4">
           <div className="flex items-center gap-3 opacity-60">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] uppercase font-medium tracking-widest">Recovery Status</span>
           </div>
           <div className="space-y-4">
              <div className="flex items-start gap-3">
                 <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                 </div>
                 <div>
                    <p className="text-xs font-medium text-slate-900 tracking-tight">Active Cases</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
                       {data.summary?.totalOverdueAccounts || data.totalOverdueAccounts || 0} Open Accounts
                    </p>
                 </div>
              </div>
              <div className="flex items-start gap-3 pt-2">
                 <div className="p-2 bg-red-50 rounded-lg shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                 </div>
                 <div>
                    <p className="text-xs font-medium text-slate-900 tracking-tight">Unique People</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
                       {data.summary?.uniqueBorrowers || data.uniqueBorrowers || 0} Borrowers Overdue
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <PendingCollectionMISPanel />
      <CollectorProductivityMISPanel />
    </div>
  );
}
