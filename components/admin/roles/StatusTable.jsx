import React from 'react';
import { AlertCircle } from 'lucide-react';
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

export default function StatusTable({ statuses }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Workflow Statuses</h3>
        <p className="text-xs text-slate-500 mt-0.5">Step-by-step application tracking and status labels.</p>
      </div>

      <div className={adminUi.tableShell}>
        <div className="[&_[data-slot=table-container]]:border-0">
        <Table>
          <TableHeader>
            <tr className={adminUi.tableHeader}>
              <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide">Order</TableHead>
              <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide">System Code</TableHead>
              <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide">User View</TableHead>
              <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide">Admin View</TableHead>
              <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-right">Color Code</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {statuses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-500 font-medium">
                   <span className="inline-flex items-center justify-center gap-2">
                     <AlertCircle className="w-4 h-4 text-slate-300" /> No statuses found.
                   </span>
                </TableCell>
              </TableRow>
            ) : statuses.map((status) => (
              <TableRow key={status.id} className={cn('group transition-colors', adminUi.tableRowHover)}>
                <TableCell className="px-3 py-2.5">
                   <span className="font-mono text-xs font-medium text-slate-500">#{String(status.status_order).padStart(2, '0')}</span>
                </TableCell>
                <TableCell className="px-3 py-2.5">
                   <span className="font-medium bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-600 tracking-wide text-[11px]">
                      {status.status_code}
                   </span>
                </TableCell>
                <TableCell className="px-3 py-2.5 text-[13px] font-medium text-slate-800 tracking-tight uppercase">
                    {status.customer_display_name}
                </TableCell>
                <TableCell className="px-3 py-2.5">
                   <Badge className="bg-white text-[10px] font-medium text-slate-600 border border-slate-200 px-2 py-0.5 uppercase tracking-wide shadow-none rounded-md">
                      {status.admin_display_name}
                   </Badge>
                </TableCell>
                <TableCell className="px-3 py-2.5 text-right">
                   <div className="flex items-center justify-end gap-2">
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{status.color_code}</span>
                      <div 
                         className="w-7 h-7 rounded-md border border-slate-200 shadow-sm" 
                         style={{ backgroundColor: status.color_code }} 
                      />
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
