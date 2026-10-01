import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatStatusLabel } from '@/utils/statusUtils';

export default function UnassignedLeadsPanel({
  title = 'Assign / Reassign leads',
  leads = [],
  staff = [],
  staffLabel = 'Owner',
  ownerField = null,
  loading = false,
  assigning = false,
  onAssign,
  onAutoAssign,
  extraFilterOptions = [],
  extraFilterValue = '',
  onExtraFilterChange,
  extraFilterLabel = 'Filter',
  managerFilterOptions = [],
  managerFilterValue = '',
  onManagerFilterChange,
  managerFilterLabel = 'Filter by manager',
}) {
  const [selected, setSelected] = useState([]);
  const [staffId, setStaffId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setSelected([]);
  }, [leads]);

  const allIds = useMemo(() => leads.map((l) => l.id), [leads]);
  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleAll = () => {
    setSelected((prev) => (prev.length === allIds.length ? [] : allIds));
  };

  const hasAssignedSelection = useMemo(() => {
    if (!selected.length) {
      return leads.some((l) => (ownerField ? l[ownerField] : (l.credit_manager_name || l.underwriter_name || l.ops_name)));
    }
    return leads.some((l) => selected.includes(l.id) && (ownerField ? l[ownerField] : (l.credit_manager_name || l.underwriter_name || l.ops_name)));
  }, [leads, selected, ownerField]);

  const submit = async () => {
    if (!staffId) {
      setError(`Select a ${staffLabel.toLowerCase()}.`);
      return;
    }
    if (!selected.length) {
      setError('Select at least one lead.');
      return;
    }
    setError('');
    await onAssign(selected, Number(staffId));
    setSelected([]);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="text-[11px] text-slate-500">
            {leads.length} lead{leads.length === 1 ? '' : 's'} · select cases to assign or reassign to any {staffLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {managerFilterOptions.length > 0 && onManagerFilterChange && (
            <select
              value={managerFilterValue}
              onChange={(e) => onManagerFilterChange(e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[12px]"
            >
              <option value="">{managerFilterLabel}</option>
              <option value="unassigned">Unassigned only</option>
              <option value="assigned">All assigned</option>
              <option value="all">All (Assigned & Unassigned)</option>
              {managerFilterOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.full_name}</option>
              ))}
            </select>
          )}
          {extraFilterOptions.length > 0 && (
            <select
              value={extraFilterValue}
              onChange={(e) => onExtraFilterChange?.(e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[12px]"
            >
              <option value="">{extraFilterLabel}</option>
              {extraFilterOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.full_name}</option>
              ))}
            </select>
          )}
          <select
            value={staffId}
            onChange={(e) => { setStaffId(e.target.value); setError(''); }}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[12px]"
          >
            <option value="">Select {staffLabel.toLowerCase()}</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs font-medium"
            onClick={submit}
            disabled={assigning || loading || !selected.length}
          >
            {assigning
              ? 'Saving…'
              : hasAssignedSelection
              ? `Reassign selected${selected.length ? ` (${selected.length})` : ''}`
              : `Assign selected${selected.length ? ` (${selected.length})` : ''}`}
          </Button>
          {onAutoAssign && (
            <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={onAutoAssign} disabled={assigning}>
              Auto-assign
            </Button>
          )}
        </div>
      </div>
      {error && <p className="px-4 py-2 text-[12px] text-red-600 bg-red-50 border-b border-red-100">{error}</p>}
      <div className="overflow-x-auto max-h-80">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[12px] text-slate-500 border-b bg-slate-50">
              <th className="px-4 py-2">
                <input type="checkbox" checked={selected.length > 0 && selected.length === allIds.length} onChange={toggleAll} />
              </th>
              <th className="px-4 py-2">Lead</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Telecaller</th>
              <th className="px-4 py-2">Current owner</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-xs">
                  No leads found matching current filter (select a Credit Manager above or choose &ldquo;All assigned&rdquo; to reassign)
                </td>
              </tr>
            ) : leads.map((lead) => (
              <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                <td className="px-4 py-2">
                  <input type="checkbox" checked={selected.includes(lead.id)} onChange={() => toggle(lead.id)} />
                </td>
                <td className="px-4 py-2 font-mono text-[12px]">{lead.lead_id || lead.application_number}</td>
                <td className="px-4 py-2">
                  <p className="text-[13px] font-medium">{lead.customer_name || '—'}</p>
                  <p className="text-[11px] text-slate-400">{lead.customer_code}</p>
                </td>
                <td className="px-4 py-2 text-[12px]">{formatStatusLabel(lead.application_status)}</td>
                <td className="px-4 py-2 text-[12px]">{lead.telecaller_name || '—'}</td>
                <td className="px-4 py-2 text-[12px]">
                  <span className={lead[ownerField] || lead.credit_manager_name ? 'font-medium text-slate-800' : 'text-slate-400 italic'}>
                    {ownerField ? (lead[ownerField] || 'Unassigned') : (lead.credit_manager_name || lead.underwriter_name || lead.ops_name || 'Unassigned')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
