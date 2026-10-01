import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Database,
  ShieldCheck,
  FileDown,
  Upload,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

export default function CibilCycleToolbar({
  filters,
  onFiltersChange,
  reconciliation,
  busy,
  onCreateAndLoad,
  onValidateHint,
  onGenerate,
  onDownload,
  onSubmit,
  cycle,
  onlyInvalid,
  onOnlyInvalidChange,
}) {
  const set = (key, value) => onFiltersChange?.({ ...filters, [key]: value });
  const r = reconciliation || {};

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 border border-slate-200 bg-white p-3">
        <div>
          <Label className="text-[10px] font-bold uppercase text-slate-500">Disbursed from</Label>
          <Input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => set('startDate', e.target.value)}
            className="h-9 mt-1 rounded-none text-sm"
          />
        </div>
        <div>
          <Label className="text-[10px] font-bold uppercase text-slate-500">Disbursed to</Label>
          <Input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => set('endDate', e.target.value)}
            className="h-9 mt-1 rounded-none text-sm"
          />
        </div>
        <div>
          <Label className="text-[10px] font-bold uppercase text-slate-500">State filter (optional)</Label>
          <Input
            value={filters.state || ''}
            onChange={(e) => set('state', e.target.value)}
            placeholder="e.g. Maharashtra"
            className="h-9 mt-1 rounded-none text-sm"
          />
        </div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-600 pb-2">
            <input
              type="checkbox"
              checked={!!onlyInvalid}
              onChange={(e) => onOnlyInvalidChange?.(e.target.checked)}
            />
            Show invalid only
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          className="h-9 rounded-none bg-[#1D2B44] hover:bg-[#152238]"
          disabled={busy}
          onClick={onCreateAndLoad}
        >
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
          Load from LOS
        </Button>
        <Button type="button" variant="outline" className="h-9 rounded-none" disabled={busy} onClick={onValidateHint}>
          <ShieldCheck className="w-4 h-4 mr-2" />
          Check mandatory
        </Button>
        <Button type="button" variant="outline" className="h-9 rounded-none" disabled={busy || !cycle} onClick={onGenerate}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Generate TUDF
        </Button>
        <Button type="button" variant="outline" className="h-9 rounded-none" disabled={busy || !cycle} onClick={onDownload}>
          <FileDown className="w-4 h-4 mr-2" />
          Download Excel
        </Button>
        <p className="w-full text-[11px] text-slate-500">
          Order: Load from LOS → Download Excel (exact CIBIL columns). Generate TUDF is optional for official text submission.
        </p>
        <Button type="button" variant="outline" className="h-9 rounded-none" disabled={busy || !cycle} onClick={onSubmit}>
          <Upload className="w-4 h-4 mr-2" />
          Submit
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: 'Eligible', value: r.eligible ?? '—' },
          { label: 'Validated', value: r.validated ?? '—' },
          { label: 'Invalid', value: r.failed ?? '—' },
          { label: 'Generated', value: r.generated ?? '—' },
          { label: 'Cycle status', value: cycle?.status || '—' },
        ].map((k) => (
          <div key={k.label} className="border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{k.label}</p>
            <p className="text-sm font-semibold text-slate-900 tabular-nums mt-0.5">{k.value}</p>
          </div>
        ))}
      </div>

      {Number(r.failed) > 0 && (
        <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Note: Check Mandatory Fields has data before submission. {r.failed} row(s) failed validation —
            Generate still emits valid rows only; Submit stays blocked until failures are cleared (or
            CIBIL_ALLOW_PARTIAL_GENERATE / official spec rules apply).
          </span>
        </div>
      )}
    </div>
  );
}
