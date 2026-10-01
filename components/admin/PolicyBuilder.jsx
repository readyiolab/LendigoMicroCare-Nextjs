import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Sparkles } from 'lucide-react';

const createGroupNode = () => ({
  id: `group_${Math.random().toString(36).slice(2, 9)}`,
  type: 'group',
  operator: 'AND',
  children: [],
});

const createRuleNode = (ruleId = '') => ({
  id: `rule_${Math.random().toString(36).slice(2, 9)}`,
  type: 'rule',
  rule_id: ruleId,
});

const normalizePolicy = (policy) => ({
  policy_code: policy?.policy_code || '',
  policy_name: policy?.policy_name || '',
  policy_description: policy?.policy_description || '',
  rule_type: policy?.rule_type || 'eligibility',
  status: policy?.status || 'draft',
  is_default: Boolean(policy?.is_default),
  is_active: policy?.is_active === undefined ? true : Boolean(policy.is_active),
  rule_tree: policy?.rule_tree || createGroupNode(),
});

const updateNode = (node, nodeId, updater) => {
  if (!node) return node;
  if (node.id === nodeId) return updater(node);
  if (node.type !== 'group') return node;

  return {
    ...node,
    children: node.children?.map((child) => updateNode(child, nodeId, updater)) || [],
  };
};

const removeNode = (node, nodeId) => {
  if (!node || node.type !== 'group') return node;

  return {
    ...node,
    children: (node.children || [])
      .filter((child) => child.id !== nodeId)
      .map((child) => removeNode(child, nodeId)),
  };
};

const collectRuleIds = (node, result = new Set()) => {
  if (!node) return result;
  if (node.type === 'rule' && node.rule_id) {
    result.add(Number(node.rule_id));
  }
  if (node.type === 'group') {
    (node.children || []).forEach((child) => collectRuleIds(child, result));
  }
  return result;
};

const SelectBox = ({ value, onChange, children }) => (
  <select
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    className="border-input bg-background ring-offset-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
  >
    {children}
  </select>
);

export default function PolicyBuilder({ policy, rules = [], onSave }) {
  const [formData, setFormData] = useState(normalizePolicy(policy));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setFormData(normalizePolicy(policy));
    setError('');
  }, [policy]);

  const rulesById = useMemo(() => new Map((rules || []).map((rule) => [Number(rule.id), rule])), [rules]);
  const linkedRuleIds = useMemo(() => Array.from(collectRuleIds(formData.rule_tree)), [formData.rule_tree]);
  const rootOperator = formData.rule_tree?.operator || 'AND';

  // Categorize rules for the dropdown
  const categorizedRules = useMemo(() => {
    return (rules || []).reduce((acc, rule) => {
       const category = rule.category_name || 'General Checks';
       if (!acc[category]) acc[category] = [];
       acc[category].push(rule);
       return acc;
    }, {});
  }, [rules]);

  // Load a demo strategy for non-technical users
  const loadMagicSample = () => {
    // Look for Age and Salary rules in the available rules
    const ageRule = rules.find(r => r.rule_code?.includes('AGE') || r.rule_name?.toLowerCase().includes('age'));
    const salaryRule = rules.find(r => r.rule_code?.includes('SALARY') || r.rule_name?.toLowerCase().includes('salary'));

    const sampleTree = createGroupNode();
    sampleTree.operator = 'AND';
    
    if (ageRule) sampleTree.children.push(createRuleNode(String(ageRule.id)));
    if (salaryRule) sampleTree.children.push(createRuleNode(String(salaryRule.id)));
    
    if (sampleTree.children.length === 0) {
        sampleTree.children.push(createRuleNode());
    }

    setFormData({
        policy_name: "Standard Personal Loan Policy (Example)",
        policy_code: "SAMPLE_STRATEGY_001",
        policy_description: "This is a demo strategy checking basic age and salary requirements.",
        rule_type: "eligibility",
        status: "draft",
        is_default: false,
        is_active: true,
        rule_tree: sampleTree
    });
    setError('');
  };

  const handleSave = async () => {
    if (!formData.policy_name?.trim()) {
        setError('Please give your strategy a "Business Name" first.');
        return;
    }

    setSaving(true);
    setError('');
    
    // Auto-generate code if missing
    const finalData = { ...formData };
    if (!finalData.policy_code && finalData.policy_name) {
        finalData.policy_code = finalData.policy_name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    }

    try {
      await onSave({
        ...finalData,
        is_default: finalData.is_default ? 1 : 0,
        is_active: finalData.is_active ? 1 : 0,
        rule_ids: linkedRuleIds,
      });
    } catch (err) {
      setError(err.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  const renderNode = (node, depth = 0) => {
    if (!node) return null;

    if (node.type === 'rule') {
      const rule = rulesById.get(Number(node.rule_id));

      return (
        <div key={node.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all" style={{ marginLeft: depth * 12 }}>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <SelectBox
                value={String(node.rule_id || '')}
                onChange={(value) => setFormData((prev) => ({
                  ...prev,
                  rule_tree: updateNode(prev.rule_tree, node.id, (current) => ({ ...current, rule_id: value })),
                }))}
              >
                <option value="">Choose check to run...</option>
                {Object.entries(categorizedRules).map(([cat, items]) => (
                    <optgroup key={cat} label={cat}>
                        {items.map(item => (
                            <option key={item.id} value={String(item.id)}>{item.rule_name}</option>
                        ))}
                    </optgroup>
                ))}
              </SelectBox>
              {rule && (
                <p className="mt-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                    Running: {rule.field_name?.replaceAll('_', ' ')}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              onClick={() => setFormData((prev) => ({ ...prev, rule_tree: removeNode(prev.rule_tree, node.id) }))}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div key={node.id} className="rounded-lg border border-slate-200/50 bg-slate-50/30 p-4" style={{ marginLeft: depth * 12 }}>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge className="bg-slate-900 border-none text-[9px] uppercase tracking-widest px-2 py-0.5 h-5">{depth === 0 ? 'Root' : 'Group'}</Badge>
          <div className="w-[140px]">
            <SelectBox
              value={node.operator || 'AND'}
              onChange={(value) => setFormData((prev) => ({
                ...prev,
                rule_tree: updateNode(prev.rule_tree, node.id, (current) => ({ ...current, operator: value })),
              }))}
            >
              <option value="AND">Must Pass ALL</option>
              <option value="OR">Pass ANY ONE</option>
            </SelectBox>
          </div>
          <div className="flex-1" />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={`h-7 rounded-lg font-bold text-[9px] uppercase transition-all duration-300 ${
              !node.children?.length 
              ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 animate-pulse' 
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            onClick={() => setFormData((prev) => ({
              ...prev,
              rule_tree: updateNode(prev.rule_tree, node.id, (current) => ({
                ...current,
                children: [...(current.children || []), createRuleNode()],
              })),
            }))}
          >
            + Add Rule
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 rounded-lg font-bold text-[9px] uppercase bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => setFormData((prev) => ({
              ...prev,
              rule_tree: updateNode(prev.rule_tree, node.id, (current) => ({
                ...current,
                children: [...(current.children || []), createGroupNode()],
              })),
            }))}
          >
            + Group
          </Button>
          {depth > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg"
              onClick={() => setFormData((prev) => ({ ...prev, rule_tree: removeNode(prev.rule_tree, node.id) }))}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {node.children?.length ? node.children.map((child) => renderNode(child, depth + 1)) : (
            <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logic Empty</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 p-5">
      {error && <div className="rounded-lg bg-red-100 border border-red-200 p-2 text-[10px] text-red-700 font-black uppercase text-center animate-bounce">⚠️ {error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-4 relative overflow-hidden">
            <button 
                type="button" 
                onClick={loadMagicSample}
                className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-200 transition-all active:scale-95 group"
            >
                <Sparkles className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                <span className="text-[9px] font-black uppercase">Load Magic Sample</span>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 md:pt-0">
                <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Strategy Name</Label>
                    <Input
                        value={formData.policy_name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, policy_name: e.target.value }))}
                        placeholder="e.g. Personal Loan Standard"
                        className="h-9 rounded-lg text-sm"
                    />
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between items-center h-4">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logic Goal</Label>
                        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-[9px] text-blue-600 font-black uppercase tracking-tighter">
                            {showAdvanced ? 'Simple' : 'Advanced'}
                        </button>
                    </div>
                    {showAdvanced ? (
                        <Input
                            value={formData.policy_code}
                            onChange={(e) => setFormData((prev) => ({ ...prev, policy_code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') }))}
                            placeholder="STRATEGY_CODE"
                            className="h-9 bg-slate-50 text-xs font-mono rounded-lg"
                        />
                    ) : (
                        <SelectBox value={formData.rule_type} onChange={(value) => setFormData((prev) => ({ ...prev, rule_type: value }))}>
                            <option value="eligibility">Eligibility</option>
                            <option value="approval">Final Approval</option>
                            <option value="risk_assessment">Risk Calculation</option>
                        </SelectBox>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lifecycle</Label>
                    <SelectBox value={formData.status} onChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}>
                        <option value="draft">Draft - Testing</option>
                        <option value="published">Published - Live</option>
                    </SelectBox>
                </div>
                <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deployment</Label>
                    <SelectBox value={String(formData.is_default)} onChange={(value) => setFormData((prev) => ({ ...prev, is_default: value === 'true' }))}>
                        <option value="false">Manual Selection</option>
                        <option value="true">Global Default</option>
                    </SelectBox>
                </div>
            </div>

            <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</Label>
                <Textarea
                    value={formData.policy_description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, policy_description: e.target.value }))}
                    rows={1}
                    placeholder="Short summary of strategy rules..."
                    className="rounded-lg text-xs py-2 min-h-0"
                />
            </div>
        </div>

        <div className="flex flex-col gap-3">
            <div className="flex-1 bg-slate-900 rounded-lg p-5 text-white flex flex-col justify-center gap-1.5 shadow-xl shadow-slate-900/10">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">Underwriting Goal</div>
                <div className="text-xl font-bold tracking-tight leading-tight">
                    {rootOperator === 'AND' ? 'Reject if ANY check fails' : 'Approve if ONE check passes'}
                </div>
                <div className="mt-2 h-px bg-white/10 w-full" />
                <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black">{linkedRuleIds.length}</span>
                    <span className="text-[10px] font-bold uppercase text-white/50">Active Checks</span>
                </div>
            </div>
            
            <div className="bg-emerald-50 rounded-lg border border-emerald-100 p-3 flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 text-xs font-bold">✓</div>
                 <div>
                    <div className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">Quick Tip</div>
                    <p className="text-[10px] font-medium text-emerald-600 leading-none mt-1">Add rules below, then click "Save Strategy Logic" to deploy.</p>
                 </div>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 overflow-hidden">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Logic Tree</h3>
            <div className="h-4 w-px bg-slate-100" />
            <p className="text-[10px] font-bold text-slate-400 uppercase">Interactive Builder</p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
             <div className="w-1 h-1 rounded-full bg-blue-500 animate-ping" />
             <span className="text-[9px] font-black uppercase text-slate-500">Live Editor</span>
          </div>
        </div>
        
        <div className="px-1 max-h-[400px] overflow-y-auto custom-scrollbar">
            {renderNode(formData.rule_tree)}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button 
            type="button" 
            onClick={handleSave} 
            disabled={saving}
            className="rounded-lg px-12 h-11 bg-slate-950 hover:bg-slate-800 text-white text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-950/20 hover:scale-[1.02] active:scale-[0.98]"
        >
          {saving ? 'Saving...' : 'Save Strategy Logic'}
        </Button>
      </div>
    </div>
  );
}
