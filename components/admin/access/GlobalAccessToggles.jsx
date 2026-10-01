import React from 'react';
import { Label } from '@/components/ui/label';
import { SYSTEM_TOGGLES } from '@/lib/permissionUtils';
import AccessToggle from './AccessToggle';

export default function GlobalAccessToggles({
  permissionMap = {},
  onChange,
  disabled = false,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {SYSTEM_TOGGLES.map((toggle) => {
        const access = permissionMap[toggle.code] || {};
        const enabled = !!access.can_view;
        return (
          <div
            key={toggle.code}
            className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-white"
          >
            <Label className="text-xs font-medium text-slate-700 cursor-pointer">
              {toggle.label}
            </Label>
            <AccessToggle
              checked={enabled}
              disabled={disabled}
              aria-label={toggle.label}
              onCheckedChange={(val) => {
                if (!onChange) return;
                onChange(toggle.code, 'can_view', val);
                onChange(toggle.code, 'can_create', val);
                onChange(toggle.code, 'can_edit', val);
                onChange(toggle.code, 'can_delete', val);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
