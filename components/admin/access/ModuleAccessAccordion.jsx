import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PERM_ACTIONS, PERM_ACTION_LABELS, setAllForModule, setAllForSubmodule } from '@/lib/permissionUtils';
import AccessToggle from './AccessToggle';

const ACTION_COLORS = {
  can_view: 'blue',
  can_create: 'emerald',
  can_edit: 'amber',
  can_delete: 'red',
};

export default function ModuleAccessAccordion({
  modules = [],
  permissionMap = {},
  onChange,
  onPermissionMapChange,
  disabled = false,
}) {
  const applyMap = (next) => {
    if (onPermissionMapChange) onPermissionMapChange(next);
  };

  const handleToggle = (code, action, checked) => {
    if (disabled || !onChange) return;
    onChange(code, action, checked);
  };

  const handleRowSelectAll = (code, value) => {
    if (disabled || !onPermissionMapChange) return;
    applyMap(setAllForSubmodule(permissionMap, code, value));
  };

  const handleModuleSelectAll = (moduleId, value) => {
    if (disabled || !onPermissionMapChange) return;
    applyMap(setAllForModule(permissionMap, moduleId, value));
  };

  return (
    <div className={cn(disabled && 'opacity-60 pointer-events-none')}>
      <Accordion type="multiple" className="space-y-2">
        {modules.map((mod) => (
          <AccordionItem
            key={mod.id}
            value={mod.id}
            className="border border-slate-200 rounded-lg overflow-hidden bg-white"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 text-sm font-semibold text-slate-900">
              <div className="flex flex-1 items-center justify-between gap-2 pr-2">
                <span>
                  {mod.label}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    ({mod.submodules.length})
                  </span>
                </span>
                {!disabled && onPermissionMapChange && (
                  <span className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => handleModuleSelectAll(mod.id, true)}
                    >
                      All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] text-slate-400"
                      onClick={() => handleModuleSelectAll(mod.id, false)}
                    >
                      Clear
                    </Button>
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-0 pb-0">
              <div className={cn('overflow-x-auto', 'rounded-md border border-zinc-800 bg-white')}>
                <table className="w-full text-sm bg-white text-slate-900">
                  <thead>
                    <tr className="bg-white border-b border-zinc-800">
                      <th className="text-left px-4 py-2 text-[10px] font-semibold uppercase text-slate-700">
                        Submodule
                      </th>
                      {PERM_ACTIONS.map((action) => (
                        <th
                          key={action}
                          className="text-center px-2 py-2 text-[10px] font-semibold uppercase text-slate-700 w-20"
                        >
                          {PERM_ACTION_LABELS[action]}
                        </th>
                      ))}
                      <th className="text-center px-2 py-2 text-[10px] font-semibold uppercase text-slate-700 w-16">
                        Row
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mod.submodules.map((sub) => {
                      const access = permissionMap[sub.code] || {};
                      const rowAllOn = PERM_ACTIONS.every((a) => access[a]);
                      return (
                        <tr key={sub.code} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 bg-white">
                          <td className="px-4 py-2.5 text-slate-800 text-xs font-medium">
                            {sub.label}
                          </td>
                          {PERM_ACTIONS.map((action) => (
                            <td key={action} className="px-2 py-3 text-center">
                              <div className="flex justify-center">
                                <AccessToggle
                                  checked={!!access[action]}
                                  disabled={disabled}
                                  color={ACTION_COLORS[action]}
                                  aria-label={`${sub.label} ${PERM_ACTION_LABELS[action]}`}
                                  onCheckedChange={(c) => handleToggle(sub.code, action, c)}
                                />
                              </div>
                            </td>
                          ))}
                          <td className="px-2 py-3 text-center">
                            <div className="flex justify-center">
                              <AccessToggle
                                checked={rowAllOn}
                                disabled={disabled}
                                color="default"
                                aria-label={`${sub.label} all permissions`}
                                onCheckedChange={(c) => handleRowSelectAll(sub.code, c)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
