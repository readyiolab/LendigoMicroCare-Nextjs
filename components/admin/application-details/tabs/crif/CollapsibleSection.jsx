import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function CollapsibleSection({ title, defaultOpen = false, children, count }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-sm font-semibold text-slate-900 tracking-wide">
          {title}
          {count != null ? (
            <span className="ml-2 text-xs font-medium text-slate-500">({count})</span>
          ) : null}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>
      {open ? <div className="px-4 py-3 border-t border-slate-100">{children}</div> : null}
    </div>
  );
}
