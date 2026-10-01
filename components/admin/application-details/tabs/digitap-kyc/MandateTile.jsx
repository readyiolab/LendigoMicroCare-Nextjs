import React from 'react';
import { Button } from '@/components/ui/button';
import { Zap, RefreshCw, Copy, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import VerificationTile from './VerificationTile';

const MANDATE_AUTH_OPTIONS = [
    { value: 'Netbanking', label: 'Netbanking' },
    { value: 'DebitCard', label: 'Debit Card' },
    { value: 'Aadhaar', label: 'Aadhaar' },
];

const TERMINAL_STATUSES = new Set(['disbursed', 'closed', 'rejected', 'offer_rejected', 'defaulted']);

const formatMandateAuthMode = (mode) => {
    const m = String(mode || '').toLowerCase().replace(/[\s_-]+/g, '');
    if (m === 'debitcard') return 'Debit Card';
    if (m === 'aadhaar' || m === 'aadhar') return 'Aadhaar';
    if (m === 'netbanking') return 'Netbanking';
    return mode || '—';
};

export default function MandateTile({
    mandateTileStatus,
    mandateSuccess,
    mandateAuthLink,
    isMockMandateLink,
    mandateRegistration,
    mandateAuthMode,
    setMandateAuthMode,
    esignComplete,
    bankTileStatus,
    canClickMandateRegister,
    canReregisterMandate,
    hasExistingMandateAttempt,
    mandateDisableReason,
    mandateLastError,
    lastAction,
    error,
    message,
    /** Prefer applicationStatus; isClosed kept for callers that still pass it. */
    isClosed = false,
    applicationStatus = '',
    updating,
    runningAction,
    showManualMandateForm,
    setShowManualMandateForm,
    manualMandateRemark,
    setManualMandateRemark,
    handleAction,
    handleInitiateMandate,
    handleManualVerifyMandate,
    handleResendMandateAuthLink,
    setLastAction,
}) {
    // Do NOT use global isReadOnly — it flips true after e-sign and hid Step 6 forever.
    const caseTerminal =
        Boolean(isClosed) ||
        TERMINAL_STATUSES.has(String(applicationStatus || '').toLowerCase());
    const canAct = !caseTerminal;
    const manualVerifyPrereqsMet = Boolean(esignComplete && bankTileStatus === 'success');
    const manualVerifyHint = !esignComplete
        ? 'Complete step 5 (loan e-sign) before Manual Verify.'
        : bankTileStatus !== 'success'
            ? 'Complete Step 3 bank verification before Manual Verify.'
            : 'Mark e-mandate as verified manually (requires a remark).';

    const headerActions = canAct ? (
        showManualMandateForm && !mandateSuccess ? (
            <div className="flex flex-col items-stretch gap-1.5 max-w-[280px] w-full sm:w-auto">
                <input
                    type="text"
                    value={manualMandateRemark}
                    onChange={(e) => setManualMandateRemark(e.target.value)}
                    placeholder="Remark — reason for manual verify (min 10 chars)"
                    className="h-8 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white w-full"
                />
                <div className="flex flex-wrap gap-1.5">
                    <Button
                        onClick={() => {
                            handleAction(
                                () => handleManualVerifyMandate(manualMandateRemark),
                                'mandate_manual'
                            );
                            setShowManualMandateForm(false);
                            setManualMandateRemark('');
                        }}
                        disabled={updating || manualMandateRemark.trim().length < 10 || !manualVerifyPrereqsMet}
                        size="sm"
                        className="h-8 px-4 text-[9px] font-bold uppercase rounded-lg bg-amber-600 text-white hover:bg-amber-700"
                    >
                        {runningAction === 'mandate_manual' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                        Confirm
                    </Button>
                    <Button
                        onClick={() => { setShowManualMandateForm(false); setManualMandateRemark(''); }}
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-[9px] font-bold uppercase rounded-lg"
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        ) : (
            <div className="flex flex-wrap items-center gap-1.5">
                <Button
                    onClick={() =>
                        handleAction(
                            () => handleInitiateMandate(mandateAuthMode),
                            'mandate'
                        )
                    }
                    disabled={!canClickMandateRegister || mandateSuccess}
                    size="sm"
                    className={cn(
                        'h-8 px-4 text-[9px] font-medium uppercase rounded-lg shadow-sm transition-all',
                        mandateSuccess
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50'
                    )}
                    title={
                        mandateDisableReason ||
                        (hasExistingMandateAttempt
                            ? 'Create a new Digitap eNACH auth link (old link may have timed out)'
                            : undefined)
                    }
                >
                    {runningAction === 'mandate' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                    {mandateSuccess
                        ? 'Active'
                        : hasExistingMandateAttempt || canReregisterMandate
                            ? 'Re-initiate'
                            : 'Register e-mandate'}
                </Button>
                {!mandateSuccess && (
                    <Button
                        onClick={() => setShowManualMandateForm(true)}
                        disabled={updating || !manualVerifyPrereqsMet}
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-[9px] font-bold uppercase rounded-lg border-amber-300 text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                        title={manualVerifyHint}
                    >
                        Manual Verify
                    </Button>
                )}
            </div>
        )
    ) : null;

    return (
        <VerificationTile
            stepNumber={6}
            title="EMI auto-debit"
            subtitle="Monthly repayment setup"
            icon={Zap}
            status={mandateTileStatus}
            description="Register Digitap eNACH auto-debit only after step 5 is signed. Customer must open the auth link to complete bank authorization."
            error={lastAction === 'mandate' || lastAction === 'mandate_manual' ? error : null}
            message={lastAction === 'mandate' || lastAction === 'mandate_manual' ? message : null}
            actions={headerActions}
            extraContent={!esignComplete ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-950 leading-relaxed">
                    <strong>Locked:</strong> Customer must finish online loan signing (step 5) before Register / Manual Verify work.
                </div>
            ) : bankTileStatus !== 'success' ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-950 leading-relaxed">
                    <strong>Locked:</strong> Complete Step 3 bank verification (or edit IFSC and re-verify) before Register / Manual Verify.
                </div>
            ) : (
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
                    {canAct && !mandateSuccess && (
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                Auth mode
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {MANDATE_AUTH_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setMandateAuthMode(opt.value)}
                                        className={cn(
                                            'h-7 px-2.5 rounded-lg text-[10px] font-medium border transition-colors',
                                            mandateAuthMode === opt.value
                                                ? 'bg-slate-900 text-white border-slate-900'
                                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {mandateAuthLink ? (
                        <div className="space-y-2">
                            {isMockMandateLink && (
                                <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-[11px] text-rose-900 leading-relaxed">
                                    <strong>Mock mandate link</strong> — Digitap mock mode is active.
                                    Set <code className="font-mono">DIGITAP_ENACH_MOCK_MODE=false</code> and configure Digitap eNACH credentials
                                    (Client ID/Secret alone is not enough), restart API, then click <strong>Re-register</strong>.
                                </div>
                            )}
                            <p className="text-[11px] text-slate-700 leading-relaxed break-all">
                                <strong>Customer e-mandate link:</strong> {mandateAuthLink}
                            </p>
                            <div className="rounded-lg bg-white border border-slate-200 p-2 space-y-1 text-[10px] text-slate-700 font-mono leading-relaxed">
                                <p>
                                    <span className="text-slate-500 font-sans not-mono">Auth mode:</span>{' '}
                                    {formatMandateAuthMode(
                                        mandateRegistration?.auth_mode || mandateAuthMode
                                    )}
                                </p>
                                <p>
                                    <span className="text-slate-500 font-sans not-mono">Txn ID:</span>{' '}
                                    {mandateRegistration?.txnid || mandateRegistration?.mandate_id || '—'}
                                </p>
                                <p className="break-all">
                                    <span className="text-slate-500 font-sans">Customer auth ID:</span>{' '}
                                    {mandateRegistration?.customer_authentication_id || '—'}
                                </p>
                                <p className="break-all">
                                    <span className="text-slate-500 font-sans">Access key:</span>{' '}
                                    {mandateRegistration?.access_key || '—'}
                                </p>
                                {(mandateRegistration?.nach_txn_id ||
                                    mandateRegistration?.mandate_id ||
                                    mandateRegistration?.txnid) && (
                                    <p>
                                        <span className="text-slate-500 font-sans">Digitap nachTxnId:</span>{' '}
                                        {mandateRegistration.nach_txn_id ||
                                            mandateRegistration.mandate_id ||
                                            mandateRegistration.txnid}
                                    </p>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                                Customer opens this Digitap page to complete eNACH authorization.
                                If the link timed out, click <strong>Re-initiate</strong> for a new link.
                            </p>
                            {canAct && (
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="h-7 px-2.5 text-[9px] font-medium uppercase bg-slate-900 text-white hover:bg-slate-800"
                                        disabled={!canClickMandateRegister}
                                        onClick={() =>
                                            handleAction(
                                                () => handleInitiateMandate(mandateAuthMode),
                                                'mandate'
                                            )
                                        }
                                    >
                                        {runningAction === 'mandate' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                                        Re-initiate
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2.5 text-[9px] font-medium uppercase"
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(mandateAuthLink);
                                                setLastAction('mandate');
                                            } catch {
                                                /* ignore */
                                            }
                                        }}
                                    >
                                        <Copy className="w-3 h-3 mr-1" /> Copy link
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2.5 text-[9px] font-medium uppercase"
                                        disabled={!(mandateRegistration?.txnid || mandateRegistration?.mandate_id)}
                                        onClick={async () => {
                                            const text = [
                                                `Txn ID: ${mandateRegistration?.txnid || mandateRegistration?.mandate_id || ''}`,
                                                `Customer auth ID: ${mandateRegistration?.customer_authentication_id || ''}`,
                                                `Access key: ${mandateRegistration?.access_key || ''}`,
                                                mandateRegistration?.nach_txn_id || mandateRegistration?.mandate_id
                                                    ? `Digitap nachTxnId: ${mandateRegistration.nach_txn_id || mandateRegistration.mandate_id}`
                                                    : null,
                                                `Auth link: ${mandateAuthLink || ''}`,
                                            ]
                                                .filter(Boolean)
                                                .join('\n');
                                            try {
                                                await navigator.clipboard.writeText(text);
                                                setLastAction('mandate');
                                            } catch {
                                                /* ignore */
                                            }
                                        }}
                                    >
                                        <Copy className="w-3 h-3 mr-1" /> Copy IDs
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2.5 text-[9px] font-medium uppercase"
                                        asChild
                                    >
                                        <a href={mandateAuthLink} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="w-3 h-3 mr-1" /> Open
                                        </a>
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2.5 text-[9px] font-medium uppercase"
                                        disabled={updating || !canClickMandateRegister}
                                        onClick={() => handleAction(handleResendMandateAuthLink, 'mandate')}
                                    >
                                        {runningAction === 'mandate' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                                        Resend SMS/Email
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : canReregisterMandate ? (
                        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 space-y-2 text-[11px] text-rose-950 leading-relaxed">
                            <p>
                                <strong>e-Mandate link unavailable.</strong> Digitap did not return a valid authorization URL.
                                Click <strong>Re-register e-mandate</strong> after fixing production Key/Salt and payment mode
                                (<code className="font-mono text-[10px]"> DIGITAP_ENACH_AUTH_MODE</code>).
                            </p>
                            {mandateLastError && (
                                <p className="font-mono text-[10px] break-all bg-white/70 border border-rose-100 rounded-lg px-2 py-1.5">
                                    {mandateLastError}
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                            Use <strong>Register e-mandate</strong> for a Digitap auth link, or <strong>Manual Verify</strong> with a remark if the customer already authorized offline.
                        </p>
                    )}
                    {!manualVerifyPrereqsMet && !mandateSuccess && canAct && (
                        <p className="text-[10px] text-amber-800 leading-snug">
                            {manualVerifyHint}
                        </p>
                    )}
                    {!canClickMandateRegister && mandateDisableReason && canAct && (
                        <p className="text-[10px] text-amber-800 leading-snug">
                            {mandateDisableReason}
                        </p>
                    )}
                    {mandateRegistration?.initiated_by_name && (
                        <p className="text-[10px] text-slate-500">
                            Initiated by <span className="font-semibold text-slate-700">{mandateRegistration.initiated_by_name}</span>
                        </p>
                    )}
                    {Number(mandateRegistration?.is_manual_verified) === 1 && mandateSuccess && (
                        <p className="text-[10px] text-amber-800">
                            Manually verified (ops)
                        </p>
                    )}
                </div>
            )}
        />
    );
}
