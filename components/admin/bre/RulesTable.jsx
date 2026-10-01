import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, MoreVertical, Play, Trash2, Shield, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

const formatExpectedValue = (rule) => {
  if (rule.operator === 'BETWEEN') {
    try {
      const parsed = typeof rule.expected_value === 'string'
        ? JSON.parse(rule.expected_value)
        : rule.expected_value;
      return `${parsed.min} to ${parsed.max}`;
    } catch {
      return String(rule.expected_value ?? '');
    }
  }

  if (['IN', 'NOT_IN'].includes(rule.operator)) {
    try {
      const parsed = typeof rule.expected_value === 'string'
        ? JSON.parse(rule.expected_value)
        : rule.expected_value;
      if (Array.isArray(parsed)) return parsed.join(', ');
    } catch {
      return String(rule.expected_value ?? '');
    }
  }

  return String(rule.expected_value ?? '');
};

const formatConditionText = (rule) => {
  const fieldLabel = rule.field_name?.replaceAll('_', ' ') || 'field';
  const operatorMap = {
    '=': 'is exactly',
    '!=': 'is not',
    '>': 'is more than',
    '<': 'is less than',
    '>=': 'is at least',
    '<=': 'is at most',
    'BETWEEN': 'is range between',
    'IN': 'is one of',
    'NOT_IN': 'is not one of',
    'CONTAINS': 'contains',
    'NOT_CONTAINS': 'does not contain'
  };

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-slate-500 font-medium capitalize">{fieldLabel}</span>
        <span className="text-blue-600 font-medium lowercase italic">{operatorMap[rule.operator] || rule.operator}</span>
        <span className="text-slate-900 font-medium">{formatExpectedValue(rule)}</span>
      </div>
    </div>
  );
};

const FailureActionBadge = ({ action }) => {
    const styles = {
        reject: 'bg-red-50 text-red-700 border-red-100',
        manual_review: 'bg-amber-50 text-amber-700 border-amber-100',
        warning: 'bg-blue-50 text-blue-700 border-blue-100',
    };

    const icons = {
        reject: <AlertCircle className="w-3 h-3 mr-1" />,
        manual_review: <Info className="w-3 h-3 mr-1" />,
        warning: <AlertCircle className="w-3 h-3 mr-1" />,
    };

    const labels = {
        reject: 'Auto Reject',
        manual_review: 'Manual Review',
        warning: 'Warning Only',
    };

    return (
        <Badge variant="outline" className={`font-medium text-[10px] uppercase tracking-wider px-2 py-0.5 ${styles[action] || 'bg-slate-50 text-slate-700 border-slate-100'}`}>
            <span className="flex items-center">
                {icons[action]}
                {labels[action] || action}
            </span>
        </Badge>
    );
};

export default function RulesTable({ 
    rules, 
    editorLoading, 
    openEditor, 
    handleToggleRule, 
    openDeleteDialog 
}) {
  return (
    <div className="space-y-6">
        <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse bg-white text-slate-900">
                    <thead>
                        <tr className="bg-white border-b border-slate-200">
                            <th className="px-8 py-5 text-[11px] font-medium text-slate-500 uppercase tracking-widest pl-10">Status</th>
                            <th className="px-8 py-5 text-[11px] font-medium text-slate-500 uppercase tracking-widest">Rule Identity</th>
                            <th className="px-8 py-5 text-[11px] font-medium text-slate-500 uppercase tracking-widest">Logic Condition</th>
                            <th className="px-8 py-5 text-[11px] font-medium text-slate-500 uppercase tracking-widest">System Action</th>
                            <th className="px-8 py-5 text-[11px] font-medium text-slate-500 uppercase tracking-widest text-right pr-10">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {rules.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 rounded-lg bg-slate-50 flex items-center justify-center">
                                            <Shield className="w-8 h-8 text-slate-200" />
                                        </div>
                                        <p className="text-slate-400 font-medium text-sm">No rules configured in this set.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            rules.map((rule) => (
                                <tr key={rule.id} className="group hover:bg-slate-50 transition-all duration-300">
                                    <td className="px-8 py-8 pl-10">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => handleToggleRule(rule.id, rule.is_active)}
                                                disabled={editorLoading}
                                                className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all duration-300 focus:outline-none ${
                                                    rule.is_active ? 'bg-slate-900 shadow-md shadow-slate-900/20' : 'bg-slate-200'
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                                                        rule.is_active ? 'translate-x-7' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                            <span className={`text-[11px] font-normal uppercase tracking-wider ${rule.is_active ? 'text-slate-900' : 'text-slate-400'}`}>
                                                {rule.is_active ? 'Live' : 'Off'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-10">
                                        <div className="flex flex-col gap-2">
                                            <span className="text-[15px] font-normal text-slate-900 group-hover:text-blue-600 transition-colors">{rule.rule_name}</span>
                                            <span className="text-[10px] font-normal text-slate-400 font-mono tracking-tight opacity-50">ID: {rule.rule_code}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-10">
                                        <div className="flex flex-col gap-1.5 max-w-[400px]">
                                            <div className="text-sm">
                                                {formatConditionText(rule)}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-10">
                                        <FailureActionBadge action={rule.failure_action} />
                                    </td>
                                    <td className="px-8 py-10 text-right pr-10">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                className="h-10 w-10 rounded-lg border-slate-100 text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm group/btn"
                                                onClick={() => openEditor(rule)}
                                                disabled={editorLoading}
                                                title="Edit Rule"
                                            >
                                                <Edit className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
                                            </Button>
                                            
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button 
                                                        variant="outline" 
                                                        size="icon" 
                                                        className="h-9 w-9 rounded-lg border-slate-100 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all shadow-sm group/btn"
                                                    >
                                                        <MoreVertical className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-lg border-slate-200/60 shadow-2xl p-2 min-w-[180px] animate-in zoom-in-95 duration-200">
                                                    <DropdownMenuItem 
                                                        onClick={() => handleToggleRule(rule.id, rule.is_active)}
                                                        className="rounded-lg px-3 py-2.5 text-xs font-medium flex items-center gap-2 cursor-pointer focus:bg-slate-50 transition-colors"
                                                    >
                                                        <Play className={`w-4 h-4 ${rule.is_active ? 'text-amber-500' : 'text-emerald-500'}`} />
                                                        {rule.is_active ? 'Deactivate Rule' : 'Activate Rule'}
                                                    </DropdownMenuItem>
                                                    <div className="h-px bg-slate-100 my-1 mx-1" />
                                                    <DropdownMenuItem 
                                                        className="rounded-lg px-3 py-2.5 text-xs font-medium text-red-600 flex items-center gap-2 cursor-pointer focus:bg-red-50 focus:text-red-700 transition-colors" 
                                                        onClick={() => openDeleteDialog(rule.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" /> Delete Permanently
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
}
