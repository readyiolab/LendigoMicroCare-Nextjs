import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DetailRow, btnPrimary, btnSecondary } from './DetailTable';
import useIfscLookup from './useIfscLookup';

const BANK_EDIT_ROLES = ['admin', 'super_admin', 'operations', 'operations_manager', 'credit_manager', 'underwriter'];
const TERMINAL_STATUSES = ['rejected', 'offer_rejected', 'closed'];
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function canEditLoanBank(admin, loanApp) {
  const role = String(admin?.role_code || admin?.role || '').toLowerCase();
  const status = String(loanApp?.application_status || '').toLowerCase();
  return BANK_EDIT_ROLES.includes(role) && !TERMINAL_STATUSES.includes(status);
}

/**
 * Bank / Account No / IFSC rows for a DetailTable, with an inline Edit (admin PATCH).
 * Bank name is not editable — the server refreshes it from the IFSC lookup.
 */
export default function EditableDisbursalBankBlock({
  bank,
  accountNo,
  ifsc,
  canEdit,
  updating,
  onSave,
  labels = {},
}) {
  const [editing, setEditing] = useState(false);
  const [ifscInput, setIfscInput] = useState('');
  const [accountInput, setAccountInput] = useState('');

  const nextIfsc = ifscInput.trim();
  const nextAccount = accountInput.trim();
  const ifscChanged = nextIfsc && nextIfsc !== String(ifsc || '').toUpperCase();
  const ifscInvalid = nextIfsc.length > 0 && !IFSC_RE.test(nextIfsc);
  const accountInvalid = nextAccount.length > 0 && !/^\d{9,18}$/.test(nextAccount);
  const lookup = useIfscLookup(nextIfsc, { enabled: editing });
  const ifscNotFound = Boolean(ifscChanged) && lookup.invalid;
  const bankNameMismatch =
    !ifscChanged && Boolean(lookup.bank) &&
    lookup.bank.trim().toLowerCase() !== String(bank || '').trim().toLowerCase();
  const canSave =
    !updating && !ifscInvalid && !accountInvalid && !ifscNotFound && !(ifscChanged && lookup.loading) &&
    (ifscChanged || nextAccount || bankNameMismatch);

  const startEdit = () => {
    setIfscInput(String(ifsc || '').toUpperCase());
    setAccountInput('');
    setEditing(true);
  };

  const save = async () => {
    const ok = await onSave({
      ifscCode: nextIfsc,
      accountNumber: nextAccount,
    });
    if (ok) setEditing(false);
  };

  if (!editing) {
    return (
      <>
        <DetailRow label={labels.bank || 'Bank'}>
          {canEdit ? (
            <div className="flex items-center justify-between gap-2">
              <span>{bank || '—'}</span>
              <Button type="button" size="sm" className={btnSecondary} onClick={startEdit} disabled={updating}>
                <Pencil className="w-3 h-3 mr-1" />
                Edit
              </Button>
            </div>
          ) : (
            bank
          )}
        </DetailRow>
        <DetailRow label={labels.accountNo || 'Account No'} mono>{accountNo}</DetailRow>
        <DetailRow label={labels.ifsc || 'IFSC'} mono>{ifsc}</DetailRow>
      </>
    );
  }

  return (
    <>
      <DetailRow label={labels.bank || 'Bank'}>
        {bankNameMismatch ? (
          <span>
            {lookup.bank}
            {lookup.branch && <span className="text-slate-500 font-normal text-[12px]"> · {lookup.branch}</span>}
            <span className="block text-amber-700 font-normal text-[11px]">
              was {bank || '—'} — will be corrected on save
            </span>
          </span>
        ) : !ifscChanged || ifscInvalid ? (
          <span className="text-slate-500 font-normal text-[12px]">
            {bank || '—'} (current) · updated automatically from IFSC
          </span>
        ) : lookup.loading ? (
          <span className="text-slate-500 font-normal text-[12px]">Looking up bank…</span>
        ) : lookup.bank ? (
          <span>
            {lookup.bank}
            {lookup.branch && <span className="text-slate-500 font-normal text-[12px]"> · {lookup.branch}</span>}
            <span className="block text-slate-400 font-normal text-[11px]">from IFSC {nextIfsc}</span>
          </span>
        ) : lookup.invalid ? (
          <span className="text-red-600 font-normal text-[12px]">{lookup.error}</span>
        ) : (
          <span className="text-slate-500 font-normal text-[12px]">Bank name will be set from IFSC on save</span>
        )}
      </DetailRow>
      <DetailRow label={labels.accountNo || 'Account No'}>
        <Input
          value={accountInput}
          onChange={(e) => setAccountInput(e.target.value.replace(/\D/g, '').slice(0, 18))}
          placeholder={accountNo ? `New account (current ${accountNo})` : 'Account number'}
          className="h-8 text-[12.5px] font-mono"
          inputMode="numeric"
        />
        {accountInvalid && <p className="mt-1 text-[11px] text-red-600">Account number must be 9–18 digits</p>}
      </DetailRow>
      <DetailRow label={labels.ifsc || 'IFSC'}>
        <Input
          value={ifscInput}
          onChange={(e) => setIfscInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
          placeholder="IFSC (e.g. HDFC0000284)"
          className="h-8 text-[12.5px] font-mono tracking-wide"
          maxLength={11}
        />
        {ifscInvalid && <p className="mt-1 text-[11px] text-red-600">Enter a valid 11-character IFSC</p>}
      </DetailRow>
      <DetailRow label="" emphasize={false}>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" className={btnPrimary} onClick={save} disabled={!canSave}>
            <Check className="w-3.5 h-3.5 mr-1" />
            {updating ? 'Saving…' : 'Save'}
          </Button>
          <Button type="button" size="sm" className={btnSecondary} onClick={() => setEditing(false)} disabled={updating}>
            <X className="w-3.5 h-3.5 mr-1" />
            Cancel
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500 font-normal">
          Changing the account or IFSC resets bank verification. Re-run Verify bank on Digitap KYC if a penny check is required.
        </p>
      </DetailRow>
    </>
  );
}
