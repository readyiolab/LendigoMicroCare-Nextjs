import { MessageSquareText } from 'lucide-react';

export default function BREExplanationPanel({ explanation, title = 'Decision Summary', compact = false }) {
  const reasons = Array.isArray(explanation?.reasons) ? explanation.reasons : [];

  if (!explanation) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <MessageSquareText className="h-4 w-4" />
          {title}
        </div>
        <div className="mt-2 text-sm font-medium text-slate-950">{explanation.summary}</div>
        {!compact && reasons.length > 0 && (
          <div className="mt-3 space-y-1">
            {reasons.map((reason, index) => (
              <div key={`${reason}_${index}`} className="text-xs text-slate-700">
                {reason}
              </div>
            ))}
          </div>
        )}
        {explanation.next_step && (
          <div className="mt-3 text-xs text-slate-600">Next step: {explanation.next_step}</div>
        )}
      </div>
    </div>
  );
}
