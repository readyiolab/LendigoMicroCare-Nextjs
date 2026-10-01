import React from 'react';
import { Eye, Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PERM_ACTIONS, PERM_ACTION_LABELS } from '@/lib/permissionUtils';

const ACTION_ICONS = {
  can_view: Eye,
  can_create: Plus,
  can_edit: Pencil,
  can_delete: Trash2,
};

const ACTION_COLORS = {
  can_view: 'bg-blue-50 text-blue-700 border-blue-100',
  can_create: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  can_edit: 'bg-amber-50 text-amber-700 border-amber-100',
  can_delete: 'bg-red-50 text-red-700 border-red-100',
};

export default function AccessSummaryCards({ summary, className }) {
  const { counts = {}, total = 0 } = summary || {};

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-3', className)}>
      {PERM_ACTIONS.map((action) => {
        const Icon = ACTION_ICONS[action];
        const count = counts[action] || 0;
        return (
          <div
            key={action}
            className={cn(
              'rounded-md border px-3 py-2.5 flex items-center gap-2.5',
              ACTION_COLORS[action]
            )}
          >
            <div className="p-1.5 rounded-md bg-white/60">
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                {PERM_ACTION_LABELS[action]}
              </p>
              <p className="text-base font-bold leading-tight">
                {count}/{total}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
