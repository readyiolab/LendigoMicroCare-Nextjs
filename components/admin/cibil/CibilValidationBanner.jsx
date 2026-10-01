import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function CibilValidationBanner({ errors = [], max = 25 }) {
  if (!errors.length) {
    return (
      <div className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 font-medium">
        Note: Check Mandatory Fields has data before submission — no validation errors on this page.
      </div>
    );
  }

  const shown = errors.slice(0, max);

  return (
    <div className="border border-red-200 bg-red-50">
      <div className="px-3 py-2 border-b border-red-100 flex items-center gap-2 text-xs font-bold text-red-800">
        <AlertCircle className="w-4 h-4" />
        Note: Check Mandatory Fields has data before submission — {errors.length} error(s)
      </div>
      <ul className="max-h-40 overflow-auto divide-y divide-red-100">
        {shown.map((e) => (
          <li key={e.id || `${e.loan_application_id}-${e.field}-${e.error_code}`} className="px-3 py-2 text-[11px] text-red-900">
            <span className="font-mono font-semibold">{e.account_number || e.loan_application_id}</span>
            {' · '}
            <span className="font-semibold">{e.segment}</span> / {e.field}: {e.error_message}
            {e.recommended_action ? (
              <span className="block text-red-700/80 mt-0.5">Action: {e.recommended_action}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
