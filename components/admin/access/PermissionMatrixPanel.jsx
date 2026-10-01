import React, { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import AccessSummaryCards from './AccessSummaryCards';
import ModuleAccessAccordion from './ModuleAccessAccordion';
import GlobalAccessToggles from './GlobalAccessToggles';
import AccessToggle from './AccessToggle';
import {
  PERMISSION_MODULES,
  countPermissionSummary,
  setPermissionAction,
} from '@/lib/permissionUtils';

export default function PermissionMatrixPanel({
  permissionMap = {},
  onPermissionMapChange,
  disabled = false,
  showCustomizeToggle = false,
  customizeEnabled = false,
  onCustomizeChange,
  inheritRoleName,
  title = 'Module Access Permissions',
  className,
}) {
  const summary = useMemo(() => countPermissionSummary(permissionMap), [permissionMap]);

  const handleChange = (code, action, value) => {
    if (disabled || !onPermissionMapChange) return;
    onPermissionMapChange(setPermissionAction(permissionMap, code, action, value));
  };

  return (
    <Card className={cn('border-slate-200 shadow-sm', className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
          {showCustomizeToggle && (
            <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-md border border-slate-300">
              <Label className="text-xs font-medium text-slate-600">
                Customize for this user
              </Label>
              <AccessToggle
                checked={customizeEnabled}
                aria-label="Customize for this user"
                onCheckedChange={(c) => onCustomizeChange?.(c)}
              />
            </div>
          )}
        </div>
        {disabled && inheritRoleName && (
          <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-800">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            Inherits permissions from role: <strong>{inheritRoleName}</strong>. Enable customize to override.
          </div>
        )}
      </CardHeader>
      <CardContent className={cn('space-y-5', disabled && 'opacity-75')}>
        <AccessSummaryCards summary={summary} />

        <Tabs defaultValue="modules" className="w-full">
          <TabsList className="bg-slate-100 p-1 h-auto rounded-lg">
            <TabsTrigger value="modules" className="text-xs rounded-md data-[state=active]:bg-white">
              Modules
            </TabsTrigger>
            <TabsTrigger value="system" className="text-xs rounded-md data-[state=active]:bg-white">
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="modules" className="mt-4">
            <ModuleAccessAccordion
              modules={PERMISSION_MODULES}
              permissionMap={permissionMap}
              onChange={handleChange}
              onPermissionMapChange={onPermissionMapChange}
              disabled={disabled}
            />
          </TabsContent>

          <TabsContent value="system" className="mt-4">
            <GlobalAccessToggles
              permissionMap={permissionMap}
              onChange={handleChange}
              disabled={disabled}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
