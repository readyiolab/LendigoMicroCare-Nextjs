import { useNavigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import { useDsaFilters } from '@/hooks/useDsaFilters';
import { ChevronDown, ChevronRight, User, Users } from 'lucide-react';
import { useState } from 'react';

const ROLE_LABEL = {
  dsa: 'DSA Agent',
  sales_manager: 'Sales Manager',
  branch_manager: 'Branch Manager',
  relationship_manager: 'Relationship Manager',
  super_admin: 'Super Admin',
  admin: 'Admin',
};

function StatPill({ label, value, highlight }) {
  return (
    <span
      className={cn(
        'inline-flex flex-col items-center px-2 py-1 rounded-md text-[10px] min-w-[52px]',
        highlight ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-600'
      )}
    >
      <span className="font-bold tabular-nums text-sm">{value}</span>
      <span className="uppercase tracking-tighter opacity-80">{label}</span>
    </span>
  );
}

function NodeCard({ node, depth, defaultOpen }) {
  const navigate = useNavigate();
  const { from, to } = useDsaFilters();
  const [open, setOpen] = useState(defaultOpen ?? depth < 2);
  const hasChildren = node.children?.length > 0;
  const s = node.rollupStats || node.stats || {};

  const goApps = () => {
    const sp = new URLSearchParams();
    sp.set('dsa', String(node.id));
    if (from) sp.set('from', from);
    if (to) sp.set('to', to);
    navigate(`/admin/dsa/applications?${sp.toString()}`);
  };

  return (
    <div className={cn('relative', depth > 0 && 'ml-6 pl-4 border-l-2 border-slate-200')}>
      <div
        className={cn(
          'rounded-lg border bg-white p-4 mb-3 shadow-sm hover:shadow-md transition-shadow',
          depth === 0 ? 'border-blue-200' : 'border-slate-200'
        )}
      >
        <div className="flex items-start gap-3">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="mt-1 p-1 rounded hover:bg-slate-100"
            >
              {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center mt-0.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-900">{node.fullName}</p>
              {node.dsaCode && (
                <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                  {node.dsaCode}
                </span>
              )}
              <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {ROLE_LABEL[node.roleCode] || node.roleCode}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <StatPill label="Leads" value={s.totalLeads ?? 0} />
              <StatPill label="Submit" value={s.submittedApps ?? 0} />
              <StatPill label="Review" value={s.underReview ?? 0} />
              <StatPill label="Approved" value={s.approvedPipeline ?? 0} />
              <StatPill label="Disbursed" value={s.disbursedCount ?? 0} highlight />
              <StatPill label="Rej.app" value={s.rejectedApps ?? 0} />
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
              <span>Lead conv. {s.leadConversionPct ?? 0}%</span>
              <span>Disbursal rate {s.disbursalRatePct ?? 0}%</span>
              {s.disbursedAmount > 0 && (
                <span className="font-semibold text-emerald-700">
                  ₹{Number(s.disbursedAmount).toLocaleString('en-IN')} disbursed
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={goApps}
            className="text-xs font-semibold text-blue-600 hover:underline shrink-0"
          >
            View apps →
          </button>
        </div>
      </div>
      {hasChildren && open && (
        <div className="space-y-0">
          {node.children.map((child) => (
            <NodeCard key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DsaHierarchyTree({ tree = [], loading }) {
  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-sm text-slate-400">
        Loading hierarchy…
      </div>
    );
  }

  if (!tree.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-600">No DSA partners in your scope.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500 mb-3 flex items-center gap-2">
        <span className="inline-block w-3 h-3 border-l-2 border-b-2 border-slate-300" />
        Hierarchy — managers roll up team totals. Click a row to view their applications.
      </p>
      {tree.map((root) => (
        <NodeCard key={root.id} node={root} depth={0} defaultOpen />
      ))}
    </div>
  );
}
