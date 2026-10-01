import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatStatusLabel } from '@/utils/statusUtils';

export default function ReassignTelecallerLeadsPanel({
  telecallers = [],
  leads = [],
  sourceId = '',
  onSourceChange,
  loading = false,
  assigning = false,
  onReassign,
}) {
  const [selected, setSelected] = useState([]);
  const [targetId, setTargetId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setSelected([]);
    setError('');
  }, [leads, sourceId]);

  const allIds = useMemo(() => leads.map((l) => l.id), [leads]);
  const targetOptions = useMemo(
    () => telecallers.filter((t) => String(t.id) !== String(sourceId) && t.status === 'active'),
    [telecallers, sourceId]
  );

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleAll = () => {
    setSelected((prev) => (prev.length === allIds.length ? [] : allIds));
  };

  const submit = async (ids) => {
    if (!sourceId) {
      setError('Select a source telecaller.');
      return;
    }
    if (!targetId) {
      setError('Select a target telecaller.');
      return;
    }
    if (!ids.length) {
      setError('Select at least one lead.');
      return;
    }
    setError('');
    await onReassign(ids, Number(targetId));
    setSelected([]);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Reassign telecaller leads</h2>
          <p className="text-[11px] text-slate-500">
            Move open draft / pending eligibility leads from an absent telecaller to someone available
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sourceId}
            onChange={(e) => onSourceChange?.(e.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[12px]"
          >
            <option value="">Source telecaller</option>
            {telecallers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}{s.status !== 'active' ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
          <select
            value={targetId}
            onChange={(e) => { setTargetId(e.target.value); setError(''); }}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[12px]"
          >
            <option value="">Target telecaller</option>
            {targetOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            onClick={() => submit(selected)}
            disabled={assigning || loading || !sourceId}
          >
            {assigning ? 'Reassigning…' : 'Assign selected'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => submit(allIds)}
            disabled={assigning || loading || !sourceId || !allIds.length}
          >
            Reassign all shown
          </Button>
        </div>
      </div>
      {error && <p className="px-4 py-2 text-[12px] text-red-600">{error}</p>}
      <div className="overflow-x-auto max-h-80">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[12px] text-slate-500 border-b bg-slate-50">
              <th className="px-4 py-2">
                <input
                  type="checkbox"
                  checked={selected.length > 0 && selected.length === allIds.length}
                  onChange={toggleAll}
                  disabled={!allIds.length}
                />
              </th>
              <th className="px-4 py-2">Lead</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Current owner</th>
            </tr>
          </thead>
          <tbody>
            {!sourceId ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-xs">
                  Select a source telecaller to load their open leads
                </td>
              </tr>
            ) : loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-xs">Loading…</td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-xs">
                  No open leads for this telecaller
                </td>
              </tr>
            ) : leads.map((lead) => (
              <tr key={lead.id} className="border-b border-slate-100">
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(lead.id)}
                    onChange={() => toggle(lead.id)}
                  />
                </td>
                <td className="px-4 py-2 font-mono text-[12px]">{lead.lead_id || lead.application_number}</td>
                <td className="px-4 py-2">
                  <p className="text-[13px] font-medium">{lead.customer_name || '—'}</p>
                  <p className="text-[11px] text-slate-400">{lead.customer_code}</p>
                </td>
                <td className="px-4 py-2 text-[12px]">{formatStatusLabel(lead.application_status)}</td>
                <td className="px-4 py-2 text-[12px]">{lead.telecaller_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
