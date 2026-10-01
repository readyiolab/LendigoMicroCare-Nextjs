import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';

const FIELD_META = {
  mobile_no:    { label: 'Mobile number', type: 'tel',    placeholder: '10-digit mobile' },
  first_name:   { label: 'First name',    type: 'text',   placeholder: 'e.g. Alok' },
  last_name:    { label: 'Last name',     type: 'text',   placeholder: 'e.g. Kumar' },
  pan:          { label: 'PAN number',    type: 'text',   placeholder: 'e.g. ABCDE1234F', upper: true },
  date_of_birth:{ label: 'Date of birth', type: 'date',   placeholder: '' },
  gender:       { label: 'Gender',        type: 'select', options: ['Male', 'Female'] },
  email:        { label: 'Email',         type: 'email',  placeholder: 'customer@example.com' },
  address:      { label: 'Address',       type: 'text',   placeholder: 'Street / locality' },
  city:         { label: 'City',          type: 'text',   placeholder: 'e.g. Gorakhpur' },
  state:        { label: 'State',         type: 'text',   placeholder: 'e.g. Uttar Pradesh' },
  pincode:      { label: 'Pincode',       type: 'tel',    placeholder: '6-digit pincode' },
};

function buildInitialValues(missing = [], prefilled = {}) {
  const init = {};
  for (const k of missing) {
    init[k] = prefilled[k] || '';
  }
  return init;
}

export default function CrifMissingFieldsDialog({ open, missing = [], prefilled = {}, onConfirm, onCancel }) {
  const [values, setValues] = useState(() => buildInitialValues(missing, prefilled));
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setValues(buildInitialValues(missing, prefilled));
      setError('');
    }
  }, [open, missing, prefilled]);

  const set = (k, v) => setValues((prev) => ({ ...prev, [k]: v }));

  const handleConfirm = () => {
    const unfilled = missing.filter((k) => !values[k]?.trim());
    if (unfilled.length) {
      setError(`Please fill: ${unfilled.map((k) => FIELD_META[k]?.label || k).join(', ')}`);
      return;
    }
    setError('');
    onConfirm(values);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-md rounded-lg p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
          <DialogTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Missing customer fields
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            The following fields are missing from this customer's profile. Fill them in to run the credit check.
          </p>
        </DialogHeader>

        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {missing.map((key) => {
            const meta = FIELD_META[key] || { label: key, type: 'text', placeholder: '' };
            return (
              <div key={key} className="space-y-1">
                <Label className="text-xs font-medium text-slate-700">{meta.label}</Label>
                {meta.type === 'select' ? (
                  <Select value={values[key] || ''} onValueChange={(v) => set(key, v)}>
                    <SelectTrigger className="h-8 text-xs rounded-lg">
                      <SelectValue placeholder={`Select ${meta.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {meta.options.map((opt) => (
                        <SelectItem key={opt} value={opt} className="text-xs capitalize">{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={meta.type}
                    value={values[key] || ''}
                    placeholder={meta.placeholder}
                    className="h-8 text-xs rounded-lg"
                    onChange={(e) =>
                      set(key, meta.upper ? e.target.value.toUpperCase() : e.target.value)
                    }
                  />
                )}
              </div>
            );
          })}

          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="px-5 py-3 border-t border-slate-100 flex gap-2 justify-end">
          <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs rounded-lg" onClick={handleConfirm}>
            Run credit check
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
