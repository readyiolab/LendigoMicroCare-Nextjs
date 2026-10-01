import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Excel-style Header Segment (TUDF) chrome for CIBIL Data Submission Form.
 */
export default function CibilSubmissionFormHeader({ header, onChange, passwordSet }) {
  const set = (key, value) => onChange?.({ ...header, [key]: value });

  const fields = [
    { key: 'memberId', label: 'Reporting Member ID' },
    { key: 'shortName', label: 'Short Name' },
    { key: 'cycleCode', label: 'Cycle Ident' },
    { key: 'reportingDateDdmmyyyy', label: 'Date Reported' },
    { key: 'reportingPassword', label: 'Reporting Password', type: 'password', placeholder: passwordSet ? '•••••••• (set)' : '' },
    { key: 'authenticationMethod', label: 'Authentication Meth' },
    { key: 'futureUse', label: 'Future Use' },
    { key: 'memberData', label: 'Member Data' },
  ];

  return (
    <div className="border border-slate-300 bg-white">
      <div className="text-center py-3 border-b border-slate-200 bg-slate-50">
        <p className="text-sm font-bold tracking-wide text-slate-900 uppercase">Data Submission Form</p>
        <p className="text-[11px] font-semibold text-slate-600 mt-0.5">CIBIL Intellectual Property</p>
        <p className="text-[10px] text-slate-500">Credit Information Bureau (India) Limited</p>
        <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">All Rights Reserved</p>
      </div>

      <div className="px-3 py-2 border-b border-slate-200 bg-amber-50/80">
        <p className="text-xs font-bold text-slate-800">Header Segment (TUDF)</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-0 border-b border-slate-200">
        {fields.map((f) => (
          <div key={f.key} className="border-r border-slate-200 last:border-r-0 p-2 min-w-0">
            <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide block mb-1 truncate">
              {f.label}
            </Label>
            <Input
              type={f.type || 'text'}
              value={header?.[f.key] ?? ''}
              placeholder={f.placeholder || ''}
              onChange={(e) => set(f.key, e.target.value)}
              className="h-8 text-xs font-mono rounded-none border-slate-200"
              autoComplete="off"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
