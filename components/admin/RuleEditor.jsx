import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';

const OPERATOR_OPTIONS = [
  { value: '=', label: 'Equals', hint: 'Must match exactly' },
  { value: '!=', label: 'Does not equal', hint: 'Must be different' },
  { value: '>', label: 'Greater than', hint: 'Must be above this value' },
  { value: '<', label: 'Less than', hint: 'Must be below this value' },
  { value: '>=', label: 'Greater than or equal', hint: 'Minimum allowed value' },
  { value: '<=', label: 'Less than or equal', hint: 'Maximum allowed value' },
  { value: 'BETWEEN', label: 'Between a range', hint: 'Must fall between min and max' },
  { value: 'IN', label: 'Any of these values', hint: 'Allowed list' },
  { value: 'NOT_IN', label: 'None of these values', hint: 'Blocked list' },
];

const FAILURE_ACTION_OPTIONS = [
  { value: 'reject', label: 'Auto reject', hint: 'Stop the application automatically' },
  { value: 'manual_review', label: 'Send for manual review', hint: 'Ask team to review manually' },
  { value: 'warning', label: 'Show warning only', hint: 'Keep going but highlight the issue' },
];

const EMPTY_FORM = {
  rule_code: '',
  rule_name: '',
  category_id: '',
  rule_description: '',
  rule_type: 'eligibility',
  field_name: '',
  operator: '=',
  value_type: 'string',
  expected_value: '',
  priority: 100,
  is_active: true,
  is_mandatory: true,
  failure_action: 'manual_review',
  failure_message: '',
  conditional_field: '',
  conditional_operator: '',
  conditional_value: '',
};

const NativeSelect = ({ value, onChange, children, placeholder }) => (
  <select
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    className="border-input bg-background ring-offset-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
  >
    {placeholder ? <option value="">{placeholder}</option> : null}
    {children}
  </select>
);

const normalizeRule = (rule) => {
  if (!rule) return EMPTY_FORM;

  return {
    ...EMPTY_FORM,
    ...rule,
    category_id: rule.category_id != null ? String(rule.category_id) : '',
    rule_description: rule.rule_description || rule.description || '',
    rule_type: String(rule.rule_type || 'eligibility').toLowerCase(),
    operator: String(rule.operator || '='),
    value_type: String(rule.value_type || 'string').toLowerCase(),
    failure_action: String(rule.failure_action || 'manual_review').toLowerCase(),
    conditional_operator: rule.conditional_operator || '',
    is_active: Boolean(Number(rule.is_active) || rule.is_active === true),
    is_mandatory: Boolean(Number(rule.is_mandatory) || rule.is_mandatory === true),
    expected_value: rule.expected_value ?? '',
  };
};

const parseExpectedValue = (rawValue, operator) => {
  if (operator === 'BETWEEN') {
    try {
      const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
      return {
        min: parsed?.min ?? '',
        max: parsed?.max ?? '',
        list: [],
      };
    } catch {
      if (typeof rawValue === 'string' && rawValue.includes(',')) {
        const [min = '', max = ''] = rawValue.split(',');
        return { min: min.trim(), max: max.trim(), list: [] };
      }
    }
  }

  if (['IN', 'NOT_IN'].includes(operator)) {
    try {
      const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
      if (Array.isArray(parsed)) {
        return { min: '', max: '', list: parsed.map((item) => String(item)) };
      }
    } catch {
      if (typeof rawValue === 'string') {
        return {
          min: '',
          max: '',
          list: rawValue.split(',').map((item) => item.trim()).filter(Boolean),
        };
      }
    }
  }

  return { min: '', max: '', list: [] };
};

const formatRuleCode = (name) =>
  name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const toTitleCase = (value = '') =>
  value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const inferOptionValues = (rule) => {
  if (!rule) return undefined;

  if (['IN', 'NOT_IN'].includes(rule.operator)) {
    try {
      const parsed = typeof rule.expected_value === 'string' ? JSON.parse(rule.expected_value) : rule.expected_value;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      return undefined;
    }
  }

  if (rule.operator === '=' && typeof rule.expected_value === 'string' && rule.expected_value !== '') {
    return [String(rule.expected_value)];
  }

  return undefined;
};

const inferFieldCategory = (fieldName = '') => {
  if (fieldName.includes('cibil') || fieldName.includes('credit')) return 'Credit';
  if (fieldName.includes('salary') || fieldName.includes('income')) return 'Income';
  if (fieldName.includes('employment') || fieldName.includes('job') || fieldName.includes('company')) return 'Employment';
  if (fieldName.includes('city') || fieldName.includes('state') || fieldName.includes('pincode')) return 'Location';
  if (fieldName.includes('email') || fieldName.includes('mobile') || fieldName.includes('otp') || fieldName.includes('verified')) return 'Verification';
  if (fieldName.includes('loan') || fieldName.includes('default') || fieldName.includes('risk')) return 'Risk';
  return 'Other';
};

const inferFieldType = (fieldName = '', valueType = 'string', expectedValue = '') => {
  const normalizedType = String(valueType || '').toLowerCase();
  if (normalizedType === 'number') return 'number';
  if (normalizedType === 'boolean') return 'boolean';
  if (normalizedType === 'array') return 'string';
  if (typeof expectedValue === 'string' && ['true', 'false'].includes(expectedValue.toLowerCase())) return 'boolean';
  if (fieldName.startsWith('is_') || fieldName.startsWith('has_') || fieldName.endsWith('_verified')) return 'boolean';
  return 'string';
};

const normalizeFieldMaster = (field) => ({
  label: field.field_label || toTitleCase(field.field_key || field.value || ''),
  value: field.field_key || field.value,
  type: field.field_type || field.type || 'string',
  category: field.field_category || field.category || 'General',
  help: field.help_text || field.help || 'Loaded from backend field master.',
  options: Array.isArray(field.allowed_values) ? field.allowed_values : field.options,
  allowedOperators: Array.isArray(field.allowed_operators) ? field.allowed_operators : field.allowedOperators,
});

const buildDynamicFields = (rules = [], currentRule) => {
  const map = new Map();

  [...rules, currentRule].filter(Boolean).forEach((item) => {
    if (!item?.field_name) return;

    const existing = map.get(item.field_name);
    const nextOptions = inferOptionValues(item);

    map.set(item.field_name, {
      label: existing?.label || toTitleCase(item.field_name),
      value: item.field_name,
      type: existing?.type || inferFieldType(item.field_name, item.value_type, item.expected_value),
      category: existing?.category || inferFieldCategory(item.field_name),
      help: 'Loaded from backend BRE rules.',
      options: existing?.options || nextOptions,
    });
  });

  return Array.from(map.values()).sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
};

const RuleEditor = ({ rule, rules = [], fields = [], categories = [], onSave, onCancel }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [minVal, setMinVal] = useState('');
  const [maxVal, setMaxVal] = useState('');
  const [listValues, setListValues] = useState([]);
  const [currentListInput, setCurrentListInput] = useState('');
  const [error, setError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectableFields = useMemo(() => {
    if (Array.isArray(fields) && fields.length > 0) {
      return fields.map(normalizeFieldMaster).sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
    }
    return buildDynamicFields(rules, rule);
  }, [fields, rules, rule]);

  const selectedField = useMemo(
    () => selectableFields.find((field) => field.value === formData.field_name) || null,
    [formData.field_name, selectableFields]
  );

  const availableOperators = useMemo(() => {
    if (selectedField?.allowedOperators?.length) {
      return OPERATOR_OPTIONS.filter((option) => selectedField.allowedOperators.includes(option.value));
    }
    return OPERATOR_OPTIONS;
  }, [selectedField]);

  // Auto-generate failure message
  useEffect(() => {
    if (!formData.rule_name || formData.failure_message) return;

    let message = `${toTitleCase(formData.field_name || 'Value')} `;
    const op = formData.operator;

    if (op === '=') message += `must be exactly ${formData.expected_value}`;
    else if (op === '!=') message += `cannot be ${formData.expected_value}`;
    else if (op === '>') message += `must be more than ${formData.expected_value}`;
    else if (op === '<') message += `must be less than ${formData.expected_value}`;
    else if (op === '>=') message += `must be at least ${formData.expected_value}`;
    else if (op === '<=') message += `must be at most ${formData.expected_value}`;
    else if (op === 'BETWEEN') {
       try { const p = JSON.parse(formData.expected_value); message += `must be between ${p.min} and ${p.max}`; } catch { message += 'must be within range'; }
    }
    else if (op === 'IN') message += `must be one of: ${listValues.join(', ')}`;
    else if (op === 'NOT_IN') message += `cannot be any of: ${listValues.join(', ')}`;

    // Only update if it's currently empty or was previously auto-generated
    // (We don't have a flag for "auto-generated", so we just provide a "Suggest" button below)
  }, [formData.field_name, formData.operator, formData.expected_value, listValues]);

  const suggestMessage = () => {
    const fieldLabel = selectedField?.label || toTitleCase(formData.field_name || 'value');
    let message = `${fieldLabel} `;
    const op = formData.operator;
    const val = formData.expected_value;

    if (op === '=') message += `must be exactly ${val}`;
    else if (op === '!=') message += `cannot be ${val}`;
    else if (op === '>') message += `must be more than ${val}`;
    else if (op === '<') message += `must be less than ${val}`;
    else if (op === '>=') message += `must be at least ${val}`;
    else if (op === '<=') message += `must be at most ${val}`;
    else if (op === 'BETWEEN') {
       try { const p = JSON.parse(val); message += `must be between ${p.min} and ${p.max}`; } catch { message += 'must be within range'; }
    }
    else if (op === 'IN') message += `must be one of: ${listValues.join(', ')}`;
    else if (op === 'NOT_IN') message += `cannot be any of: ${listValues.join(', ')}`;
    
    setFormData(prev => ({ ...prev, failure_message: message }));
  };

  useEffect(() => {
    const nextForm = normalizeRule(rule);
    const parsedValues = parseExpectedValue(nextForm.expected_value, nextForm.operator);

    setFormData(nextForm);
    setMinVal(parsedValues.min);
    setMaxVal(parsedValues.max);
    setListValues(parsedValues.list);
    setCurrentListInput('');
    setError(null);
  }, [rule]);

  useEffect(() => {
    if (formData.operator === 'BETWEEN') {
      const nextValue = JSON.stringify({
        min: minVal === '' ? '' : Number(minVal),
        max: maxVal === '' ? '' : Number(maxVal),
      });
      setFormData((prev) => (prev.expected_value === nextValue ? prev : { ...prev, expected_value: nextValue }));
      return;
    }

    if (['IN', 'NOT_IN'].includes(formData.operator)) {
      const nextValue = JSON.stringify(listValues);
      setFormData((prev) => (prev.expected_value === nextValue ? prev : { ...prev, expected_value: nextValue }));
    }
  }, [formData.operator, listValues, maxVal, minVal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNameChange = (e) => {
    const ruleName = e.target.value;

    setFormData((prev) => {
      const previousGeneratedCode = formatRuleCode(prev.rule_name || '');
      const shouldReplaceCode = !prev.rule_code || prev.rule_code === previousGeneratedCode;

      return {
        ...prev,
        rule_name: ruleName,
        rule_code: shouldReplaceCode ? formatRuleCode(ruleName) : prev.rule_code,
      };
    });
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFieldChange = (fieldName) => {
    const field = selectableFields.find((item) => item.value === fieldName);

    setFormData((prev) => ({
      ...prev,
      field_name: fieldName,
      value_type: field?.type || 'string',
      expected_value: '',
      operator: field?.type === 'boolean' ? '=' : prev.operator,
    }));

    setMinVal('');
    setMaxVal('');
    setListValues([]);
    setCurrentListInput('');
  };

  const handleOperatorChange = (operator) => {
    const parsedValues = parseExpectedValue(formData.expected_value, operator);

    setFormData((prev) => ({
      ...prev,
      operator,
      expected_value: ['BETWEEN', 'IN', 'NOT_IN'].includes(operator) ? '' : prev.expected_value,
    }));
    setMinVal(parsedValues.min);
    setMaxVal(parsedValues.max);
    setListValues(parsedValues.list);
    setCurrentListInput('');
  };

  const addListValue = (e) => {
    if (e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();

    const nextValue = currentListInput.trim();
    if (!nextValue || listValues.includes(nextValue)) return;

    setListValues((prev) => [...prev, nextValue]);
    setCurrentListInput('');
  };

  const removeListValue = (valueToRemove) => {
    setListValues((prev) => prev.filter((item) => item !== valueToRemove));
  };

  const buildPayload = () => {
    const basePayload = {
      ...formData,
      category_id: formData.category_id ? Number(formData.category_id) : null,
      priority: formData.priority === '' ? 100 : Number(formData.priority),
      is_active: formData.is_active ? 1 : 0,
      is_mandatory: formData.is_mandatory ? 1 : 0,
      rule_type: String(formData.rule_type || 'eligibility').toLowerCase(),
      value_type: String(formData.value_type || 'string').toLowerCase(),
      failure_action: String(formData.failure_action || 'manual_review').toLowerCase(),
      rule_description: formData.rule_description?.trim() || null,
      conditional_field: formData.conditional_field || null,
      conditional_operator: formData.conditional_operator || null,
      conditional_value: formData.conditional_value || null,
    };

    if (selectedField?.type === 'number' && !['BETWEEN', 'IN', 'NOT_IN'].includes(formData.operator)) {
      basePayload.expected_value = formData.expected_value === '' ? '' : String(Number(formData.expected_value));
    }

    if (selectedField?.type === 'boolean' && !['BETWEEN', 'IN', 'NOT_IN'].includes(formData.operator)) {
      basePayload.expected_value = String(formData.expected_value) === 'true' ? 'true' : 'false';
    }

    return basePayload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Final Auto-Generate Code if missing
    if (!formData.rule_code) {
        formData.rule_code = formatRuleCode(formData.rule_name);
    }

    try {
      await onSave(buildPayload());
    } catch (err) {
      setError(err.message || 'Failed to save rule.');
    }
  };

  const renderValueInput = () => {
    if (formData.operator === 'BETWEEN') {
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            placeholder="Minimum value"
            type="number"
            value={minVal}
            onChange={(e) => setMinVal(e.target.value)}
          />
          <Input
            placeholder="Maximum value"
            type="number"
            value={maxVal}
            onChange={(e) => setMaxVal(e.target.value)}
          />
        </div>
      );
    }

    if (['IN', 'NOT_IN'].includes(formData.operator)) {
      return (
        <div className="space-y-2">
          <div className="flex min-h-[44px] flex-wrap gap-2 rounded-md border bg-background p-2">
            {listValues.map((value) => (
              <Badge key={value} variant="secondary" className="gap-1 pr-1">
                {value}
                <X className="h-3 w-3 cursor-pointer" onClick={() => removeListValue(value)} />
              </Badge>
            ))}
            <input
              className="min-w-[160px] flex-1 bg-transparent text-sm outline-none"
              placeholder="Type a value and press Enter"
              value={currentListInput}
              onChange={(e) => setCurrentListInput(e.target.value)}
              onKeyDown={addListValue}
            />
          </div>
          <p className="text-xs text-muted-foreground font-medium">Type each allowed option and press enter (Ex: BANK, CASH)</p>
        </div>
      );
    }

    if (selectedField?.type === 'boolean') {
      return (
        <NativeSelect
          value={String(formData.expected_value)}
          onChange={(value) => handleSelectChange('expected_value', value)}
          placeholder="Choose yes or no"
        >
          <option value="true">Yes / True</option>
          <option value="false">No / False</option>
        </NativeSelect>
      );
    }

    if (selectedField?.options) {
      return (
        <NativeSelect
          value={String(formData.expected_value)}
          onChange={(value) => handleSelectChange('expected_value', value)}
          placeholder="Choose a value"
        >
          {selectedField.options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </NativeSelect>
      );
    }

    return (
      <Input
        name="expected_value"
        value={formData.expected_value}
        onChange={handleChange}
        placeholder={selectedField?.type === 'number' ? 'Enter a number limit' : 'Enter the requirement'}
        type={selectedField?.type === 'number' ? 'number' : 'text'}
      />
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 border border-red-100 p-4 text-sm text-red-600 font-medium">⚠️ {error}</div>}

      <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-5">
        <h2 className="text-sm font-bold text-blue-950">Quick Rule Builder</h2>
        <p className="mt-1 text-xs text-blue-900/60 leading-relaxed font-medium">
          Answer the following 4 steps to create your underwriting rule. No technical knowledge required.
        </p>
      </div>

      <div className="space-y-8 px-1">
        
        {/* Step 1: Identity & Categorization */}
        <section className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">1</div>
                <h3 className="text-sm font-bold text-slate-800">What is the name of this rule?</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-11">
                <div className="space-y-1.5">
                    <Label htmlFor="rule_name" className="text-xs uppercase tracking-wider text-slate-500 font-bold">Friendly Name</Label>
                    <Input id="rule_name" name="rule_name" value={formData.rule_name} onChange={handleNameChange} placeholder="Example: Salary must be at least 21k" required />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="category_id" className="text-xs uppercase tracking-wider text-slate-500 font-bold">Group / Category</Label>
                    <NativeSelect value={formData.category_id} onChange={(v) => handleSelectChange('category_id', v)} placeholder="Choose a group">
                        {categories.map(c => <option key={c.id} value={String(c.id)}>{c.category_name}</option>)}
                    </NativeSelect>
                </div>
            </div>
        </section>

        {/* Step 2: Logic Condition */}
        <section className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">2</div>
                <h3 className="text-sm font-bold text-slate-800">What condition should we check?</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 ml-11">
                <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Property to check</Label>
                    <NativeSelect value={formData.field_name} onChange={handleFieldChange} placeholder="Select property">
                        {Object.entries(selectableFields.reduce((a, f) => {(a[f.category] = a[f.category] || []).push(f); return a;}, {}))
                          .map(([group, fields]) => (
                            <optgroup key={group} label={group}>
                                {fields.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </optgroup>
                        ))}
                    </NativeSelect>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Requirement logic</Label>
                    <NativeSelect value={formData.operator} onChange={handleOperatorChange} placeholder="Select math logic">
                        {availableOperators.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </NativeSelect>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Allowed criteria</Label>
                    {renderValueInput()}
                </div>
            </div>
        </section>

        {/* Step 3: Failure Action */}
        <section className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">3</div>
                <h3 className="text-sm font-bold text-slate-800">What should happen if the user fails?</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-11">
                <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Action to take</Label>
                    <NativeSelect value={formData.failure_action} onChange={(v) => handleSelectChange('failure_action', v)}>
                        {FAILURE_ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </NativeSelect>
                    <p className="text-[10px] text-slate-500 font-medium">{FAILURE_ACTION_OPTIONS.find(o => o.value === formData.failure_action)?.hint}</p>
                </div>
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Response for team</Label>
                        <button type="button" onClick={suggestMessage} className="text-[10px] text-blue-600 hover:underline font-bold">Auto-suggest message</button>
                    </div>
                    <Input value={formData.failure_message} name="failure_message" onChange={handleChange} placeholder="The message shown in the dashboard" />
                </div>
            </div>
        </section>

        {/* Step 4: Final Settings */}
        <section className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">4</div>
                <h3 className="text-sm font-bold text-slate-800">Final checks</h3>
            </div>
            <div className="flex flex-wrap gap-6 ml-11 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center space-x-2">
                    <Checkbox id="is_active" checked={Boolean(formData.is_active)} onCheckedChange={(c) => handleSelectChange('is_active', Boolean(c))} />
                    <Label htmlFor="is_active" className="text-sm font-medium">Turn on rule immediately</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="is_mandatory" checked={Boolean(formData.is_mandatory)} onCheckedChange={(c) => handleSelectChange('is_mandatory', Boolean(c))} />
                    <Label htmlFor="is_mandatory" className="text-sm font-medium italic underline decoration-amber-500">Critical (Must pass to continue)</Label>
                </div>
            </div>
        </section>

        {/* Advanced Accordion */}
        <div className="ml-11">
            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 font-bold flex items-center gap-2">
                {showAdvanced ? 'Hide Advanced Settings' : 'Technical / Advanced Settings'}
            </button>
            {showAdvanced && (
                <div className="mt-4 p-5 rounded-lg border border-slate-100 bg-slate-50/50 grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="rule_code" className="text-xs">System Reference Code</Label>
                        <Input id="rule_code" name="rule_code" value={formData.rule_code} onChange={handleChange} className="font-mono text-xs" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="priority" className="text-xs">Execution Priority</Label>
                        <Input id="priority" name="priority" type="number" value={formData.priority} onChange={handleChange} />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                        <Label htmlFor="rule_description" className="text-xs">Internal Technical Notes</Label>
                        <Textarea id="rule_description" name="rule_description" value={formData.rule_description} onChange={handleChange} rows={2} />
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="rounded-lg px-6">Cancel</Button>
        <Button type="submit" className="rounded-lg px-10 bg-slate-900 hover:bg-slate-800 transition-all font-bold">Save Underwriting Rule</Button>
      </div>
    </form>
  );
};

export default RuleEditor;
