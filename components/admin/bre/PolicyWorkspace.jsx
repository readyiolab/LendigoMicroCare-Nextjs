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
  Play, 
  Settings2, 
  ArrowLeft,
  Info 
} from 'lucide-react';
import PolicyBuilder from '@/components/admin/PolicyBuilder';

const SectionHero = ({ icon: Icon, eyebrow, title, description }) => (
    <div className="rounded-lg border border-slate-200/60 bg-white p-3.5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-slate-900 p-2 text-white">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{eyebrow}</div>
          <div className="text-lg font-bold tracking-tight text-slate-950 mt-0.5">{title}</div>
        </div>
        <div className="hidden lg:block h-8 w-px bg-slate-100 mx-2" />
        <div className="hidden lg:block flex-1 max-w-2xl text-[11px] leading-relaxed text-slate-500 font-medium">{description}</div>
      </div>
    </div>
);

const StatusBadge = ({ active }) => (
    <Badge variant="outline" className={`font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-lg border-none ${
        active 
        ? 'bg-emerald-50 text-emerald-700' 
        : 'bg-slate-100 text-slate-600'
    }`}>
        {active ? 'Live' : 'Hidden'}
    </Badge>
);

export default function PolicyWorkspace({ 
    showPolicyBuilder, 
    setShowPolicyBuilder, 
    editingPolicy, 
    setEditingPolicy, 
    policies, 
    rules, 
    categories, 
    handleSavePolicy, 
    handleTogglePolicy 
}) {
  if (showPolicyBuilder) {
    return (
      <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    onClick={() => {
                        setShowPolicyBuilder(false);
                        setEditingPolicy(null);
                    }}
                    className="h-9 w-9 p-0 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-lg font-bold tracking-tight text-slate-950">
                        {editingPolicy ? 'Refine Strategy' : 'New Approval Strategy'}
                    </h1>
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest leading-none mt-1">
                        {editingPolicy ? `Editing: ${editingPolicy.policy_name}` : 'Defining custom underwriting paths'}
                    </p>
                </div>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase font-bold text-blue-600 border-blue-100 bg-blue-50/50 rounded-lg">
                BRE Orchestration Layer
            </Badge>
        </div>
        <div className="rounded-lg border border-slate-200/60 shadow-2xl shadow-slate-200/20 overflow-hidden bg-white">
            <PolicyBuilder
                policy={editingPolicy}
                rules={rules}
                categories={categories}
                onSave={handleSavePolicy}
                onCancel={() => {
                    setShowPolicyBuilder(false);
                    setEditingPolicy(null);
                }}
            />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <SectionHero
        icon={Settings2}
        eyebrow="Rule Orchestration"
        title="Strategies"
        description="Organize your rules into executable strategies. Different loan types can follow different logic paths."
      />

      <div className="flex items-center justify-between px-2">
        <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Active Strategies</h3>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter mt-1">Manage {policies.length} deployed underwriting paths</p>
        </div>
        <Button onClick={() => setShowPolicyBuilder(true)} className="bg-slate-950 hover:bg-slate-800 text-white rounded-lg shadow-xl shadow-slate-950/20 px-6 h-10 tracking-wide text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]">
          + Build New Policy
        </Button>
      </div>

      <div className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b border-slate-200/60">
              <TableHead className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] pl-8 py-4">Strategy Name & Identity</TableHead>
              <TableHead className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] py-4">Rule Count</TableHead>
              <TableHead className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] py-4">Version</TableHead>
              <TableHead className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] py-4">Current Status</TableHead>
              <TableHead className="text-right text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] pr-8 py-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-200">
            {policies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center">
                            <Info className="w-6 h-6 text-slate-200" />
                        </div>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No strategies found.</p>
                    </div>
                </TableCell>
              </TableRow>
            ) : (
              policies.map((policy) => (
                <tr key={policy.id} className="group hover:bg-slate-50 transition-all duration-300">
                  <td className="py-4 pl-8">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{policy.policy_name}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 max-w-xl font-medium">
                            {policy.policy_description || 'Standard underwriting strategy for loan eligibility.'}
                        </span>
                    </div>
                  </td>
                  <td className="py-4">
                    <Badge variant="outline" className="font-bold border-blue-100 bg-blue-50/30 text-blue-600 px-3 py-0.5 rounded-lg text-[10px]">
                        {policy.total_rules || 0} Checks Loaded
                    </Badge>
                  </td>
                  <td className="py-4">
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded thin-border tracking-tighter">v{policy.version_no || '1.0'}</span>
                  </td>
                  <td className="py-4">
                      <StatusBadge active={policy.is_active} />
                  </td>
                  <td className="text-right py-4 pr-8">
                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        onClick={() => {
                          setEditingPolicy(policy);
                          setShowPolicyBuilder(true);
                        }}
                      >
                        <Settings2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`h-8 w-8 p-0 rounded-lg transition-all ${policy.is_active ? 'text-amber-400 hover:text-amber-600 hover:bg-amber-50' : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                        onClick={() => handleTogglePolicy(policy.id, policy.is_active)}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
