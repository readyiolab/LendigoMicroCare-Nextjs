import React from 'react';
import { Button } from '@/components/ui/button';
import { Landmark, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import VerificationTile from './VerificationTile';
import useIfscLookup from '../../common/useIfscLookup';

export default function BankTile({
    bankTileStatus,
    bankDetails,
    customerDisplayName,
    bankFailureHint,
    pennyDropStatus,
    lastAction,
    error,
    message,
    isReadOnly,
    canAdminEditBank,
    updating,
    runningAction,
    bankEditMode,
    setBankEditMode,
    bankIfscInput,
    setBankIfscInput,
    bankAccountInput,
    setBankAccountInput,
    showManualBankForm,
    setShowManualBankForm,
    manualBankRemark,
    setManualBankRemark,
    handleAction,
    handleVerifyBankDetails,
    handleManualVerifyBank,
    handleUpdateDisbursalBankDetails,
}) {
    const typedIfsc = bankIfscInput.trim().toUpperCase();
    const ifscChanged = typedIfsc.length > 0 && typedIfsc !== String(bankDetails?.ifsc_code || '').toUpperCase();
    const ifscLookup = useIfscLookup(typedIfsc, { enabled: bankEditMode });
    const ifscNotFound = ifscChanged && ifscLookup.invalid;
    const bankNameMismatch =
        !ifscChanged && Boolean(ifscLookup.bank) &&
        ifscLookup.bank.trim().toLowerCase() !== String(bankDetails?.bank_name || '').trim().toLowerCase();

    return (
        <VerificationTile 
            stepNumber={3}
            title="Bank account" 
            subtitle="Salary / EMI account" 
            icon={Landmark} 
            status={bankTileStatus} 
            description="Verify bank via Digitap (IMPSPENNY) before EMI auto-debit. Edit IFSC/account if wrong, then re-verify." 
            error={lastAction === 'bank' || lastAction === 'bank_manual' || lastAction === 'bank_edit' ? error : (bankTileStatus === 'failed' ? bankFailureHint : null)} 
            message={lastAction === 'bank' || lastAction === 'bank_manual' || lastAction === 'bank_edit' ? message : null}
            responseData={(bankDetails?.ifsc_code || bankDetails?.account_number_masked || bankDetails?.account_number) ? { 
                name: bankDetails?.bank_matched_name || bankDetails?.account_holder_name || customerDisplayName,
                bank: bankDetails?.bank_name || 'N/A',
                account: bankDetails?.account_number_masked || bankDetails?.account_number, 
                ifsc: bankDetails?.ifsc_code,
                ...(bankDetails?.fuzzy_match_score != null && bankDetails?.fuzzy_match_score !== ''
                    ? { nameScore: `${bankDetails.fuzzy_match_score}` }
                    : {}),
                status: bankTileStatus === 'success'
                    ? (bankDetails?.is_manual_verified ? 'Verified (manual by staff)' : 'Verified online (Digitap)')
                    : (pennyDropStatus === 'failed' ? 'Verification failed' : 'Pending — click Verify bank')
            } : null}
            extraContent={
                (!isReadOnly || canAdminEditBank) && bankEditMode ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            type="text"
                            value={bankIfscInput}
                            onChange={(e) => setBankIfscInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
                            placeholder="IFSC (e.g. HDFC0000284)"
                            maxLength={11}
                            className="h-8 px-3 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white w-40 tracking-wide"
                        />
                        <input
                            type="text"
                            value={bankAccountInput}
                            onChange={(e) => setBankAccountInput(e.target.value.replace(/\D/g, '').slice(0, 18))}
                            placeholder="Account number"
                            maxLength={18}
                            className="h-8 px-3 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white w-44"
                        />
                        <Button
                            onClick={() => {
                                handleAction(async () => {
                                    const ok = await handleUpdateDisbursalBankDetails({
                                        ifscCode: bankIfscInput.trim(),
                                        accountNumber: bankAccountInput.trim(),
                                        viaAdmin: isReadOnly,
                                    });
                                    if (ok) setBankEditMode(false);
                                }, 'bank_edit');
                            }}
                            disabled={
                                updating ||
                                ifscNotFound ||
                                (ifscChanged && ifscLookup.loading) ||
                                (!bankIfscInput.trim() && !bankAccountInput.trim()) ||
                                (bankIfscInput.trim().length > 0 && bankIfscInput.trim().length !== 11) ||
                                (bankAccountInput.trim().length > 0 && bankAccountInput.trim().length < 9)
                            }
                            size="sm"
                            className="h-8 px-4 text-[9px] font-bold uppercase rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                            {runningAction === 'bank_edit' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                            Save
                        </Button>
                        <Button
                            onClick={() => { setBankEditMode(false); setBankIfscInput(''); setBankAccountInput(''); }}
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-[9px] font-bold uppercase rounded-lg"
                        >
                            Cancel
                        </Button>
                        {bankNameMismatch && (
                            <p className="basis-full text-[11px] text-amber-700">
                                {ifscLookup.bank}{ifscLookup.branch ? ` · ${ifscLookup.branch}` : ''} — bank name will be corrected on save (was {bankDetails?.bank_name || '—'})
                            </p>
                        )}
                        {ifscChanged && typedIfsc.length === 11 && (
                            <p className={cn('basis-full text-[11px]', ifscLookup.invalid ? 'text-red-600' : 'text-slate-500')}>
                                {ifscLookup.loading
                                    ? 'Looking up bank…'
                                    : ifscLookup.bank
                                        ? `${ifscLookup.bank}${ifscLookup.branch ? ` · ${ifscLookup.branch}` : ''}`
                                        : ifscLookup.error || 'Bank name will be set from IFSC on save'}
                            </p>
                        )}
                    </div>
                ) : !isReadOnly && showManualBankForm && bankTileStatus !== 'success' ? (
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        value={manualBankRemark}
                        onChange={(e) => setManualBankRemark(e.target.value)}
                        placeholder="Remark — reason for manual verify (min 10 chars)"
                        className="h-8 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white flex-1 min-w-[220px]"
                    />
                    <Button
                        onClick={() => {
                            handleAction(() => handleManualVerifyBank(manualBankRemark), 'bank_manual');
                            setShowManualBankForm(false);
                            setManualBankRemark('');
                        }}
                        disabled={updating || manualBankRemark.trim().length < 10}
                        size="sm"
                        className="h-8 px-4 text-[9px] font-bold uppercase rounded-lg bg-amber-600 text-white hover:bg-amber-700"
                    >
                        {runningAction === 'bank_manual' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                        Confirm
                    </Button>
                    <Button
                        onClick={() => { setShowManualBankForm(false); setManualBankRemark(''); }}
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-[9px] font-bold uppercase rounded-lg"
                    >
                        Cancel
                    </Button>
                </div>
            ) : null}
        >
            {!isReadOnly && !bankEditMode && (
                <div className="flex flex-wrap items-center gap-1.5">
                    <Button 
                        onClick={() => handleAction(handleVerifyBankDetails, 'bank')} 
                        disabled={updating || bankTileStatus === 'success'} 
                        size="sm"
                        className={cn("h-8 px-4 text-[9px] font-bold uppercase rounded-lg shadow-2xs transition-all cursor-pointer", 
                            bankTileStatus === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50" : "bg-slate-900 text-white hover:bg-black")}
                    >
                        {runningAction === 'bank' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                        {bankTileStatus === 'success' ? 'Bank verified' : 'Verify bank'}
                    </Button>
                    <Button
                        onClick={() => {
                            setBankIfscInput(bankDetails?.ifsc_code || '');
                            setBankAccountInput('');
                            setShowManualBankForm(false);
                            setBankEditMode(true);
                        }}
                        disabled={updating}
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-[9px] font-bold uppercase rounded-lg border-slate-200 text-slate-600"
                        title="Edit IFSC or account number, then Verify bank again"
                    >
                        Edit bank
                    </Button>
                    {bankTileStatus !== 'success' && (
                        <Button
                            onClick={() => { setBankEditMode(false); setShowManualBankForm((v) => !v); }}
                            disabled={updating}
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-[9px] font-bold uppercase rounded-lg border-amber-300 text-amber-800 hover:bg-amber-50"
                            title="Mark bank as verified manually (requires a remark)"
                        >
                            Mark verified (manual)
                        </Button>
                    )}
                </div>
            )}
            {isReadOnly && canAdminEditBank && !bankEditMode && (
                <Button
                    onClick={() => {
                        setBankIfscInput(bankDetails?.ifsc_code || '');
                        setBankAccountInput('');
                        setBankEditMode(true);
                    }}
                    disabled={updating}
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-[9px] font-bold uppercase rounded-lg border-slate-200 text-slate-600"
                    title="Case is locked after e-sign; staff can still correct the IFSC or account number"
                >
                    Edit bank
                </Button>
            )}
        </VerificationTile>
    );
}
