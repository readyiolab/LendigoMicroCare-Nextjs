import React from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, RefreshCw } from 'lucide-react';
import VerificationTile from './VerificationTile';

export default function PanTile({
    panFromDigilocker,
    panVerified,
    isKycVerified,
    customerDisplayName,
    userData,
    lastAction,
    error,
    message,
    isReadOnly,
    updating,
    runningAction,
    panInput,
    setPanInput,
    panEditMode,
    setPanEditMode,
    showManualPanForm,
    setShowManualPanForm,
    manualPanRemark,
    setManualPanRemark,
    handleAction,
    handleManualVerifyPan,
}) {
    return (
        <VerificationTile 
            stepNumber={2}
            title="PAN — tax ID" 
            subtitle={
                panFromDigilocker
                    ? 'Verified via DigiLocker'
                    : panVerified
                      ? 'Verified (manual)'
                      : 'Must match Aadhaar name'
            } 
            icon={CreditCard} 
            status={panVerified ? 'verified' : 'pending'} 
            description={
                panFromDigilocker
                    ? 'PAN was fetched from DigiLocker with Aadhaar. Manual Check PAN is not required.'
                    : panVerified
                      ? 'PAN was marked verified by staff after DigiLocker Aadhaar.'
                      : isKycVerified
                        ? 'PAN was not returned by this DigiLocker transaction. Use Re-run DigiLocker (PAN) on the Aadhaar tile so the customer consents to PAN, or mark PAN manually if they cannot. Digio Check PAN is disabled on Digitap production.'
                        : 'Complete DigiLocker Aadhaar first. PAN is pulled with Aadhaar when the customer consents to both.'
            } 
            error={lastAction === 'pan' || lastAction === 'pan_manual' ? error : null} 
            message={lastAction === 'pan' || lastAction === 'pan_manual' ? message : null}
            responseData={panVerified ? { name: userData?.profile?.full_name || customerDisplayName, pan: userData?.profile?.pancard } : null}
            extraContent={
                !isReadOnly && showManualPanForm && !panVerified ? (
                    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                        <p className="text-[10px] text-amber-900 font-medium">
                            Enter PAN and a remark (min 10 chars). DigiLocker Aadhaar must already be verified.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="text"
                                value={panInput}
                                onChange={(e) => setPanInput(e.target.value.toUpperCase())}
                                placeholder="PAN (e.g. ABCDE1234F)"
                                maxLength={10}
                                className="h-8 px-3 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white w-44 tracking-widest"
                            />
                            <input
                                type="text"
                                value={manualPanRemark}
                                onChange={(e) => setManualPanRemark(e.target.value)}
                                placeholder="Remark (why manual verify)"
                                className="h-8 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white flex-1 min-w-[160px]"
                            />
                            <Button
                                onClick={() => {
                                    const pan = panInput.trim() || userData?.profile?.pancard || '';
                                    handleAction(
                                        () => handleManualVerifyPan(pan, manualPanRemark),
                                        'pan_manual'
                                    );
                                    setShowManualPanForm(false);
                                }}
                                disabled={
                                    updating ||
                                    manualPanRemark.trim().length < 10 ||
                                    (panInput.trim().length > 0 && panInput.trim().length !== 10)
                                }
                                size="sm"
                                className="h-8 px-4 text-[9px] font-bold uppercase rounded-lg bg-amber-700 text-white hover:bg-amber-800"
                            >
                                {runningAction === 'pan_manual' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                                Confirm mark PAN
                            </Button>
                            <Button
                                onClick={() => {
                                    setShowManualPanForm(false);
                                    setManualPanRemark('');
                                }}
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 text-[9px] font-bold uppercase rounded-lg"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : !isReadOnly && panEditMode ? (
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        value={panInput}
                        onChange={(e) => setPanInput(e.target.value.toUpperCase())}
                        placeholder="Enter PAN (e.g. ABCDE1234F)"
                        maxLength={10}
                        className="h-8 px-3 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white w-44 tracking-widest"
                    />
                    <Button
                        onClick={() => {
                            setPanEditMode(false);
                            setShowManualPanForm(true);
                        }}
                        disabled={updating || panInput.trim().length !== 10}
                        size="sm"
                        className="h-8 px-4 text-[9px] font-bold uppercase rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                        Continue
                    </Button>
                    <Button
                        onClick={() => { setPanEditMode(false); setPanInput(''); }}
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-[9px] font-bold uppercase rounded-lg"
                    >
                        Cancel
                    </Button>
                </div>
            ) : null}
        >
            {!isReadOnly && !panEditMode && !showManualPanForm && (
                <div className="flex items-center gap-1.5">
                    {panVerified ? (
                        <Button 
                            disabled
                            size="sm"
                            className="h-8 px-4 text-[9px] font-medium uppercase rounded-lg shadow-sm bg-emerald-50 text-emerald-500 border border-emerald-100"
                        >
                            PAN verified
                        </Button>
                    ) : (
                        <>
                            <Button
                                onClick={() => {
                                    setPanInput(userData?.profile?.pancard || '');
                                    setManualPanRemark('');
                                    setShowManualPanForm(true);
                                    setPanEditMode(false);
                                }}
                                disabled={updating || !isKycVerified}
                                size="sm"
                                className="h-8 px-4 text-[9px] font-medium uppercase rounded-lg shadow-sm transition-all cursor-pointer bg-amber-700 text-white hover:bg-amber-800 disabled:opacity-50"
                                title={!isKycVerified ? 'Complete DigiLocker Aadhaar first' : 'Mark PAN verified without Digio'}
                            >
                                {runningAction === 'pan_manual' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                                Mark PAN verified
                            </Button>
                            <Button
                                onClick={() => { setPanInput(userData?.profile?.pancard || ''); setPanEditMode(true); setShowManualPanForm(false); }}
                                disabled={updating || !isKycVerified}
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 text-[9px] font-bold uppercase rounded-lg border-slate-200 text-slate-600"
                                title="Enter PAN then mark verified"
                            >
                                Enter PAN
                            </Button>
                        </>
                    )}
                </div>
            )}
        </VerificationTile>
    );
}
