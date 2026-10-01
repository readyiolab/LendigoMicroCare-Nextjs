import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

const formatChangeSummary = (audit) => {
  if (audit.change_reason) return audit.change_reason;
  
  if (audit.action === 'activated') return 'Rule was enabled for evaluation.';
  if (audit.action === 'deactivated') return 'Rule was disabled.';
  
  const oldVal = typeof audit.old_value === 'string' ? JSON.parse(audit.old_value) : (audit.old_value || {});
  const newVal = typeof audit.new_value === 'string' ? JSON.parse(audit.new_value) : (audit.new_value || {});
  
  const changes = [];
  
  // Specific fields we care about
  const fields = [
    { key: 'expected_value', label: 'Expected Value' },
    { key: 'operator', label: 'Operator' },
    { key: 'failure_action', label: 'Failure Action' },
    { key: 'is_mandatory', label: 'Mandatory' },
    { key: 'priority', label: 'Priority' }
  ];
  
  fields.forEach(field => {
    if (newVal[field.key] !== undefined && newVal[field.key] !== oldVal[field.key]) {
      let oldDisplay = oldVal[field.key];
      let newDisplay = newVal[field.key];
      
      if (field.key === 'is_mandatory') {
        oldDisplay = oldDisplay ? 'Yes' : 'No';
        newDisplay = newDisplay ? 'Yes' : 'No';
      }
      
      changes.push(`${field.label}: ${oldDisplay} → ${newDisplay}`);
    }
  });
  
  return changes.length > 0 ? changes.join(', ') : 'Rule configuration updated.';
};

export default function AuditHistory({ auditHistory }) {
  return (
    <Card className="border-none shadow-none">
        <CardHeader className="px-0 py-4">
             <CardTitle className="text-lg">Audit Logs</CardTitle>
             <CardDescription className="text-xs">History of all rule and policy changes</CardDescription>
        </CardHeader>
         <CardContent className="p-0">
            <div className="overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-white border-b border-slate-200">
                            <TableHead className="text-[11px] text-slate-500 uppercase tracking-widest pl-6">Timestamp</TableHead>
                            <TableHead className="text-[11px] text-slate-500 uppercase tracking-widest">Entity</TableHead>
                            <TableHead className="text-[11px] text-slate-500 uppercase tracking-widest">Action</TableHead>
                            <TableHead className="text-[11px] text-slate-500 uppercase tracking-widest">Changes</TableHead>
                            <TableHead className="text-[11px] text-slate-500 uppercase tracking-widest pr-6">Performed By</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-50">
                        {!auditHistory || auditHistory.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">
                                    No audit history found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            auditHistory.map((audit) => {
                                const timestamp = audit.changed_at || audit.created_at;
                                return (
                                    <TableRow key={audit.id} className="hover:bg-slate-50 transition-colors border-b border-slate-200 last:border-none">
                                        <TableCell className="py-5 pl-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900">{timestamp ? new Date(timestamp).toLocaleDateString() : 'N/A'}</span>
                                                <span className="text-[10px] text-gray-400 uppercase tracking-tighter mt-1">{timestamp ? new Date(timestamp).toLocaleTimeString() : ''}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-gray-900 font-medium uppercase">{audit.rule_name || audit.entity_type || 'Rule'}</span>
                                                <span className="text-[10px] text-gray-400 tracking-tighter mt-1">ID: {audit.rule_id || audit.entity_id}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-5">
                                            <Badge variant="outline" className={`font-medium text-[10px] uppercase px-2 py-0.5 border-gray-100 ${
                                                audit.action === 'activated' || audit.action === 'create' ? 'bg-green-50 text-green-700' :
                                                audit.action === 'updated' || audit.action === 'update' ? 'bg-blue-50 text-blue-700' :
                                                'bg-red-50 text-red-700'
                                            }`}>
                                                {audit.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-5">
                                            <div className="text-[11px] text-gray-600 max-w-[400px] line-clamp-2 leading-relaxed font-medium">
                                                {formatChangeSummary(audit)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-5 pr-6">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-medium text-slate-600 uppercase">
                                                  {(audit.performed_by_name || audit.performed_by || 'S').charAt(0)}
                                                </div>
                                                <span className="text-xs text-gray-900 font-medium">{audit.performed_by_name || audit.performed_by || 'System'}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
         </CardContent>
    </Card>
  );
}

