import React from 'react';
import { 
  Shield, 
  Trash2, 
  Plus,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { adminUi } from '@/config/adminUiTokens';

const getRoleBadgeColor = (roleCode) => {
  const colors = {
    super_admin: 'bg-purple-50 text-purple-700 border-purple-100',
    telecaller: 'bg-blue-50 text-blue-700 border-blue-100',
    credit_manager: 'bg-amber-50 text-amber-700 border-amber-100',
    underwriter: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    operations: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    operations_manager: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    collection_manager: 'bg-orange-50 text-orange-700 border-orange-100',
  };
  return colors[roleCode] || 'bg-slate-50 text-slate-700 border-slate-100';
};

export default function RoleTable({ roles, onDeleteRole, onAddRole, onEditRole }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">User Roles</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Core flow: Credit Manager → Underwriter → Operations. Module screens are separate from stage authority.
          </p>
        </div>
        <Button onClick={onAddRole} className={cn('h-9 px-3 rounded-md gap-2 text-xs', adminUi.accent)}>
          <Plus className="w-4 h-4" /> Create New Role
        </Button>
      </div>

      <div className={adminUi.tableShell}>
        <div className="[&_[data-slot=table-container]]:border-0">
        <Table>
          <TableHeader>
            <tr className={adminUi.tableHeader}>
              <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide">Role Name</TableHead>
              <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide">System Code</TableHead>
              <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide">Journey</TableHead>
              <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide">Description</TableHead>
              <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-right">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-500 font-medium">
                  No roles found in the list.
                </TableCell>
              </TableRow>
            ) : roles.map((role) => (
              <TableRow key={role.id} className={cn('group transition-colors', adminUi.tableRowHover)}>
                <TableCell className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-white border border-slate-200 rounded-md">
                       <Shield className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <span className="text-sm font-medium text-slate-900 tracking-tight">{role.role_name}</span>
                  </div>
                </TableCell>
                <TableCell className="px-3 py-2.5">
                   <Badge className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide border shadow-none", getRoleBadgeColor(role.role_code))}>
                    {role.role_code}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 py-2.5">
                  {role.workflow?.primary_flow ? (
                    <Badge className="px-2 py-0.5 rounded-md text-[10px] font-medium border shadow-none bg-slate-900 text-white border-slate-900">
                      Core · {role.workflow.stage}
                    </Badge>
                  ) : role.workflow?.stage ? (
                    <span className="text-[11px] text-slate-500 capitalize">{role.workflow.stage}</span>
                  ) : (
                    <span className="text-[11px] text-slate-400">custom</span>
                  )}
                </TableCell>
                <TableCell className="px-3 py-2.5 text-slate-500 text-xs font-medium max-w-xs truncate">
                  {role.workflow?.summary || role.description || 'N/A'}
                </TableCell>
                <TableCell className="px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onEditRole?.(role.id)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onDeleteRole?.(role.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}
