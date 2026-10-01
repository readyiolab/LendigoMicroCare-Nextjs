import React, { useCallback, useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Button } from '@/components/ui/button';
import { getStatusBadge } from '@/utils/statusUtils';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { adminAPI } from '@/lib/api';
import {
    ShieldCheck, XCircle, ChevronLeft, ShieldAlert, RotateCw, Phone, HandCoins, Send,
    UserRound, CalendarClock, Lock, Banknote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatApplicationAppliedLabel } from '@/lib/utils/applicationDates';
import { scrollToDecisionSubmit } from '@/lib/utils/scrollToDecisionSubmit';
import { lazyWithRetry as lazy } from '@/lib/lazyWithRetry';

// Context
import { useApplicationContext } from '@/components/admin/application-details/context/ApplicationContext';

// Tabs (Code-split per tab for on-demand chunk loading)
const OverviewTab = lazy(() => import('./tabs/OverviewTab'));
const DocumentsTab = lazy(() => import('./tabs/DocumentsTab'));
const CallLogsTab = lazy(() => import('./tabs/CallLogsTab'));
const JourneyTab = lazy(() => import('./tabs/JourneyTab'));
const HistoryTab = lazy(() => import('./tabs/HistoryTab'));
const CamTab = lazy(() => import('./tabs/CamTab'));
const ActionsTab = lazy(() => import('./tabs/ActionsTab'));
const RepaymentsTab = lazy(() => import('./tabs/RepaymentsTab'));
const LoanBreakdownTab = lazy(() => import('./tabs/LoanBreakdownTab'));
const DisbursementTab = lazy(() => import('./tabs/DisbursementTab'));
const LoanAccountViewTab = lazy(() => import('./tabs/LoanAccountViewTab'));
const BRETab = lazy(() => import('./tabs/BRETab'));
const AaReportTab = lazy(() => import('./tabs/AaReportTab'));
const CrifReportTab = lazy(() => import('./tabs/CrifReportTab'));
const CreditVerificationTab = lazy(() => import('../CreditVerificationTab'));
const DigitapKycTab = lazy(() => import('./tabs/DigitapKycTab'));
const LoanHistoryTab = lazy(() => import('./tabs/LoanHistoryTab'));
const CreditDecisionSheet = lazy(() => import('./CreditDecisionSheet'));
const CallLogsSheet = lazy(() => import('./CallLogsSheet'));
const CollectionPunchModal = lazy(() => import('@/components/admin/collections/CollectionPunchModal'));
const PunchDisbursalDialog = lazy(() => import('./common/PunchDisbursalDialog'));

import ApplicationNextStepBanner from './ApplicationNextStepBanner';
import { evaluateCreditDecisionGates } from '@/lib/utils/creditDecisionGates';
import { computeApplicationNextStep } from '@/lib/utils/applicationNextStep';
import { isPanVerified } from '@/lib/utils/staffVerificationGates';
import { getVisibleSectionIds, SECTION_META } from './shell/sectionConfig';
import { canShowPunchUpdateButton } from '@/lib/utils/disbursalPunchGates';

const PRIMARY_NAV_GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    subtabs: [
      { id: 'overview', label: 'Overview' },
    ],
  },
  {
    id: 'loan_history',
    label: 'Loan History',
    subtabs: [
      { id: 'loan_history', label: 'Loan History' },
    ],
  },
  {
    id: 'kyc',
    label: 'KYC',
    subtabs: [
      { id: 'kyc', label: 'KYC Check' },
    ],
  },
  {
    id: 'verification',
    label: 'Video Declaration',
    subtabs: [
      { id: 'verification', label: 'Video Declaration' },
    ],
  },
  {
    id: 'cam',
    label: 'CAM',
    subtabs: [
      { id: 'cam', label: 'CAM' },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    subtabs: [
      { id: 'documents', label: 'Documents' },
    ],
  },
  {
    id: 'aa',
    label: 'Bank Statement',
    subtabs: [
      { id: 'aa', label: 'Bank Statement' },
    ],
  },
  {
    id: 'crif',
    label: 'CIBIL Bureau',
    subtabs: [
      { id: 'crif', label: 'CIBIL Bureau' },
      { id: 'bre', label: 'Credit Rules' },
    ],
  },
  {
    id: 'financials',
    label: 'Financials',
    subtabs: [
      { id: 'loan_account', label: 'Loan Account' },
      { id: 'disbursement', label: 'Disbursal' },
      { id: 'repayments', label: 'Repayments & Collections' },
      { id: 'breakdown', label: 'Charges & Fees' },
    ],
  },
  {
    id: 'activity',
    label: 'Activity',
    subtabs: [
      { id: 'call_logs', label: 'Call Logs' },
      { id: 'history', label: 'Activity Log' },
      { id: 'journey', label: 'Customer Journey' },
    ],
  },
  {
    id: 'actions',
    label: 'Final Decision',
    subtabs: [
      { id: 'actions', label: 'Final Decision' },
    ],
  },
];

function customerInitials(name) {
    const parts = String(name || 'C').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (parts[0]?.slice(0, 2) || 'CU').toUpperCase();
}

const HEADER_BTN_BASE = 'h-9 px-3.5 has-[>svg]:px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap';
const HEADER_BTN_PRIMARY_DARK = cn(HEADER_BTN_BASE, 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm');
const HEADER_BTN_PRIMARY_GREEN = cn(HEADER_BTN_BASE, 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm');
const HEADER_BTN_SECONDARY = cn(
    HEADER_BTN_BASE,
    'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs disabled:opacity-60'
);

function MetaList({ items, className }) {
    const visible = items.filter(Boolean);
    if (visible.length === 0) return null;
    return (
        <div className={cn('flex items-center flex-wrap gap-x-2.5 gap-y-1 min-w-0 text-xs', className)}>
            {visible.map((item, idx) => (
                <React.Fragment key={idx}>
                    {idx > 0 && <span className="h-3 w-px bg-slate-200 shrink-0" aria-hidden />}
                    {item}
                </React.Fragment>
            ))}
        </div>
    );
}

export default function ApplicationDetailContent() {
    const { 
        admin 
    } = useAdminAuth();

    const [creditSheetOpen, setCreditSheetOpen] = useState(false);
    const [creditGateMessage, setCreditGateMessage] = useState('');
    const [collectionOpen, setCollectionOpen] = useState(false);

    const {
        onClose,
        loanApp, data, loading, error, setError, message, setMessage,
        activeTab, setActiveTab,
        setStatusUpdate,
        isLogCallOpen, setIsLogCallOpen,
        callLogs, callLogAppRef, handleCallLogged,
        lockWarning,
        isReadOnly,
        userData, kyc_details, bankDetails, selfie, mandateRegistration,
        handleCreditDecision, handleResumeCreditDecision,
        creditDecisionLoading, creditDecisionResult, creditDecisionError, setCreditDecisionResult,
        creditLoading,
        bureauSummary,
        aaStatus,
        applicationId,
        isRepaymentReview,
        handleDisburse,
        updating,
        fetchApplication,
    } = useApplicationContext();

    const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
    const [approving, setApproving] = useState(false);
    const [justApproved, setJustApproved] = useState(false);
    const [preparingOffer, setPreparingOffer] = useState(false);
    const approveRefreshRef = useRef(null);

    const panVerified = isPanVerified({ userData, panVerification: data?.pan_verification });
    const digioVerified = kyc_details?.verification_status === 'verified';
    const bankVerified = bankDetails?.is_verified === 1 || bankDetails?.penny_drop_status === 'success';
    const selfieVerified =
        selfie?.face_match_status === 'matched' && Number(selfie?.liveness_check) === 1;
    const creditCheckGates = evaluateCreditDecisionGates({
        aadhaarVerified: digioVerified,
        panVerified,
        bankVerified,
        selfieVerified,
    });
    const staffRole = admin?.role_code || admin?.role;
    const showPunchUpdate = canShowPunchUpdateButton({
        loanApp,
        mandateRegistration,
        role: staffRole,
    });
    const canShowCollection =
        String(loanApp?.application_status || '').toLowerCase() === 'disbursed';
    const isHeaderUwRole = ['underwriter', 'super_admin', 'admin'].includes(String(staffRole || '').toLowerCase());
    const appStatusLc = String(loanApp?.application_status || '').toLowerCase();
    const canHeaderApprove =
        isHeaderUwRole && appStatusLc === 'recommended' && !isRepaymentReview && !justApproved;
    const canHeaderSendOffer =
        isHeaderUwRole &&
        !isRepaymentReview &&
        (appStatusLc === 'approved' || (justApproved && appStatusLc === 'recommended'));

    const handleHeaderSendOffer = async () => {
        setPreparingOffer(true);
        try {
            // The post-approval reload resets the decision form, so it must land before we prefill.
            if (approveRefreshRef.current) {
                await approveRefreshRef.current.catch(() => null);
            }
            // Prefill before the form is visible, so nothing the underwriter types can be overwritten
            let camAmt = NaN;
            let camTenure = NaN;
            try {
                const camRes = await adminAPI.getApplicationCam(applicationId);
                const particulars = (camRes?.data || camRes || {}).particulars || {};
                camAmt = Number(String(particulars.loan_recommended || '').replace(/,/g, ''));
                camTenure = Math.round(Number(String(particulars.tenure_days || '').replace(/,/g, '')));
            } catch {
                // Actions tab seeds product defaults when CAM is unavailable
            }
            setStatusUpdate?.((prev) => {
                const prevAmt = Number(String(prev.approvedAmount ?? '').replace(/,/g, ''));
                const next = { ...prev, status: 'offer_sent' };
                if ((!Number.isFinite(prevAmt) || prevAmt <= 0) && Number.isFinite(camAmt) && camAmt > 0) {
                    next.approvedAmount = camAmt;
                }
                if (Number.isFinite(camTenure) && camTenure > 0) {
                    next.tenureDays = camTenure;
                }
                return next;
            });
            setActiveTab('actions');
            scrollToDecisionSubmit();
        } finally {
            setPreparingOffer(false);
        }
    };

    const handleHeaderApprove = async () => {
        setApproving(true);
        setError?.('');
        setMessage?.('');
        try {
            const response = await adminAPI.approveApplicationByUnderwriter(applicationId, {
                remark: 'Approved by underwriter',
                checker_remarks: 'Approved by underwriter',
            });
            const lan = response?.data?.loan_account_number || response?.loan_account_number;
            setMessage?.(lan ? `Approved. LAN issued: ${lan}` : 'Underwriter approval recorded');
            setApproveConfirmOpen(false);
            setJustApproved(true);
            approveRefreshRef.current = Promise.resolve(fetchApplication?.(true));
            await approveRefreshRef.current;
        } catch (err) {
            setError?.(err.response?.data?.message || err.message || 'Failed to approve case');
            setApproveConfirmOpen(false);
        } finally {
            setApproving(false);
        }
    };

    const openCreditCheck = useCallback(async () => {
        if (!creditCheckGates.ready) {
            setCreditGateMessage(creditCheckGates.message);
            setActiveTab('kyc');
            return;
        }
        setCreditGateMessage('');

        const cached = bureauSummary;
        // A "no record" (102) answer is a real bureau result — re-pulling would just bill again
        const noRecordOnFile =
            Number(cached?.resultCode) === 102 ||
            String(cached?.verificationStatus || '').toLowerCase() === 'no_record';
        if (cached && (cached.alreadyFetched || cached.score != null || noRecordOnFile)) {
            const when = cached.fetchedAt || cached.reportDate;
            const whenLabel = when ? new Date(when).toLocaleString('en-IN') : null;
            const what = noRecordOnFile
                ? 'CIBIL already checked — no credit history found (new to credit)'
                : 'CIBIL already fetched';
            setMessage(
                whenLabel
                    ? `${what} on ${whenLabel}. Showing the stored report — no new bureau pull. Use Re-fetch if details were wrong.`
                    : `${what} for this application. Showing the stored report — no new bureau pull.`
            );
            setActiveTab('crif');
            return;
        }

        // Open sheet once; POST credit check. Post-run bureau refresh lives in the credit-decision hook.
        setCreditSheetOpen(true);
        await handleCreditDecision();
    }, [
        creditCheckGates.ready,
        creditCheckGates.message,
        bureauSummary,
        setActiveTab,
        setMessage,
        handleCreditDecision,
    ]);

    const resumeCreditCheck = useCallback(async () => {
        setCreditSheetOpen(true);
        await handleResumeCreditDecision();
    }, [handleResumeCreditDecision]);

    const handleGoToDecision = useCallback(() => {
        setCreditSheetOpen(false);
        setActiveTab('actions');
        window.setTimeout(() => {
            document.getElementById('actions-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    }, [setActiveTab]);

    // Keep sheet props stable — inline lambdas recreated loadSheetData and caused infinite GET storms.
    const handleResultPatch = useCallback((patch) => {
        setCreditDecisionResult((prev) => (prev ? { ...prev, ...patch } : patch));
    }, [setCreditDecisionResult]);

    const handleCopyMessage = useCallback((msg) => {
        setMessage(msg);
    }, [setMessage]);

    const handleOpenAaTab = useCallback(() => {
        setCreditSheetOpen(false);
        window.setTimeout(() => setActiveTab('aa'), 150);
    }, [setActiveTab]);

    const handleOpenCrifTab = useCallback(() => {
        setCreditSheetOpen(false);
        window.setTimeout(() => {
            setActiveTab('crif');
            const trail = creditDecisionResult?.reasoningTrail || [];
            const blocked = trail.some((t) => String(t).includes('Bureau pull blocked'));
            setMessage(
                blocked
                    ? 'No CIBIL report yet — Digitap returned HTTP 400. Run the diagnose script on the server, then Run credit check again.'
                    : 'Switched to CIBIL tab'
            );
        }, 150);
    }, [setActiveTab, creditDecisionResult?.reasoningTrail, setMessage]);

    const handleBannerCta = () => {
        const { nextAction } = computeApplicationNextStep({
            aadhaarVerified: digioVerified,
            panVerified,
            bankVerified,
            selfieVerified,
            latestCreditRun: creditDecisionResult,
            applicationStatus: loanApp?.application_status,
        });

        if (nextAction.runCreditCheck) {
            openCreditCheck();
        } else if (nextAction.openDecision) {
            handleGoToDecision();
        } else if (nextAction.openCreditSheet) {
            setCreditSheetOpen(true);
        } else if (nextAction.tab) {
            setActiveTab(nextAction.tab);
        }
    };

    const customerDisplayName =
        userData?.full_name ||
        kyc_details?.aadhaar_name ||
        userData?.profile?.full_name ||
        'Customer';

    const customerMobile =
        loanApp?.mobile || data?.profile?.mobile || userData?.mobile || userData?.profile?.mobile || '';

    const callLogCount = Array.isArray(callLogs) && callLogs.length > 0
        ? callLogs.length
        : Number(loanApp?.call_attempts) || 0;

    useEffect(() => {
        if (!creditDecisionResult) return;
        const amount =
            creditDecisionResult.suggested_terms?.amount ?? creditDecisionResult.approvedAmount;
        if (amount == null) return;
        const n = Number(amount);
        if (!Number.isFinite(n) || n <= 0) return;
        setStatusUpdate((prev) => {
            const existing = Number(String(prev.approvedAmount ?? '').replace(/,/g, ''));
            if (Number.isFinite(existing) && existing > 0) {
                return prev;
            }
            // Treat 0 / "0" / empty as unset so credit suggestion can fill.
            if (prev.approvedAmount != null && String(prev.approvedAmount).trim() !== '' && String(prev.approvedAmount).trim() !== '0') {
                return prev;
            }
            return { ...prev, approvedAmount: n };
        });
    }, [creditDecisionResult, setStatusUpdate]);

    const visibleTabs = useMemo(() => {
        const ids = getVisibleSectionIds(
          admin?.role,
          isRepaymentReview,
          admin?.permissionMap,
          !!admin?.has_custom_permissions
        );
        return ids
            .filter((id) => SECTION_META[id])
            .map((id) => ({ id, label: SECTION_META[id].label }));
    }, [admin?.role, admin?.permissionMap, admin?.has_custom_permissions, isRepaymentReview]);

    const visibleSectionSet = useMemo(() => {
        return new Set(visibleTabs.map(t => t.id));
    }, [visibleTabs]);

    const navigationGroups = useMemo(() => {
        return PRIMARY_NAV_GROUPS.map((group) => ({
            ...group,
            subtabs: group.subtabs.filter((sub) => visibleSectionSet.has(sub.id)),
        })).filter((group) => group.subtabs.length > 0);
    }, [visibleSectionSet]);

    const activeGroup = useMemo(() => {
        return (
            navigationGroups.find((g) => g.subtabs.some((s) => s.id === activeTab)) ||
            navigationGroups[0]
        );
    }, [navigationGroups, activeTab]);

    const handleSelectPrimaryGroup = useCallback((group) => {
        if (!group) return;
        if (group.subtabs.some((s) => s.id === activeTab)) {
            return;
        }
        if (group.subtabs[0]) {
            setActiveTab(group.subtabs[0].id);
        }
    }, [activeTab, setActiveTab]);

    // Clear feedback on tab switch
    useEffect(() => {
        if (setError) setError(null);
        if (setMessage) setMessage(null);
    }, [activeTab, setError, setMessage]);

    const bootstrapping = loading || !loanApp;

    if (bootstrapping) {
        return (
            <div className="relative flex flex-col h-full bg-slate-50">
                <div className="flex flex-col items-center justify-center min-h-[400px] flex-1 gap-3">
                    <Spinner size="lg" variant="primary" />
                    <p className="text-xs text-slate-500">Loading application…</p>
                </div>
            </div>
        );
    }

    const isRepeatCustomer =
        Number(loanApp.is_repeat_customer) === 1 ||
        loanApp.is_repeat_customer === true ||
        loanApp.bucket === 'repeat';
    const appliedInfo = formatApplicationAppliedLabel(loanApp);

    return (
        <>
            <div className="relative flex flex-col h-full bg-slate-50">
                <div className="bg-white border-b border-slate-200/90 shadow-2xs">
                    {/* Executive Case Header */}
                    <div className="px-5 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={onClose}
                                className="rounded-lg w-9 h-9 shrink-0 border-slate-200 text-slate-600 hover:bg-slate-50"
                                title="Back to applications"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>

                    

                            <div className="min-w-0 flex flex-col gap-1">
                                <div className="flex items-center gap-2 min-w-0">
                                    <h2 className="text-lg font-semibold text-slate-900 tracking-tight truncate leading-6">
                                        {customerDisplayName}
                                    </h2>
                                    <span className="shrink-0 inline-flex">
                                        {getStatusBadge(
                                            loanApp.application_status,
                                            loanApp.mandate_status || mandateRegistration?.status
                                        )}
                                    </span>
                                    {isRepeatCustomer ? (
                                        <span className="shrink-0 inline-flex items-center gap-1 h-6 px-2.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border bg-emerald-50 border-emerald-200 text-emerald-700">
                                            <RotateCw className="w-3 h-3" />
                                            Repeat Customer
                                        </span>
                                    ) : (
                                        <span className="shrink-0 inline-flex items-center h-6 px-2.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border bg-slate-50 border-slate-200 text-slate-600">
                                            New Customer
                                        </span>
                                    )}
                                </div>

                                <MetaList
                                    className="font-mono text-slate-700"
                                    items={[
                                        loanApp.customer_code && (
                                            <span title="Customer ID" className="font-medium">{loanApp.customer_code}</span>
                                        ),
                                        loanApp.lead_id && (
                                            <span title="Lead ID">{loanApp.lead_id}</span>
                                        ),
                                        loanApp.loan_account_number && (
                                            <span title="Loan account no.">{loanApp.loan_account_number}</span>
                                        ),
                                    ]}
                                />

                                <MetaList
                                    className="text-slate-500"
                                    items={[
                                        loanApp.credit_admin_name && (
                                            <span className="inline-flex items-center gap-1.5" title="Credit manager">
                                                <UserRound className="w-3 h-3 text-slate-400" />
                                                <span>CM <span className="text-slate-700 font-medium">{loanApp.credit_admin_name}</span></span>
                                            </span>
                                        ),
                                        appliedInfo.value && (
                                            <span className="inline-flex items-center gap-1.5">
                                                <CalendarClock className="w-3 h-3 text-slate-400" />
                                                <span>
                                                    {appliedInfo.label}{' '}
                                                    <span className="tabular-nums text-slate-700 font-medium">{appliedInfo.value}</span>
                                                </span>
                                            </span>
                                        ),
                                        loanApp.locked_admin_name && (
                                            <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                                                <Lock className="w-3 h-3" />
                                                <span>Locked by {loanApp.locked_admin_name}</span>
                                            </span>
                                        ),
                                    ]}
                                />
                            </div>
                        </div>

                        {/* Operational Action Toolbar */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap lg:flex-nowrap lg:justify-end">
                            {canHeaderApprove && (
                                <Button
                                    type="button"
                                    onClick={() => setApproveConfirmOpen(true)}
                                    disabled={approving}
                                    title="Underwriter approval — issues the loan account number (LAN)"
                                    className={HEADER_BTN_PRIMARY_DARK}
                                >
                                    {approving ? (
                                        <RotateCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <ShieldCheck className="w-4 h-4" />
                                    )}
                                    <span>Approve &amp; issue LAN</span>
                                </Button>
                            )}
                            {canHeaderSendOffer && (
                                <Button
                                    type="button"
                                    onClick={handleHeaderSendOffer}
                                    disabled={preparingOffer}
                                    title="Open Decision with Send offer to customer selected"
                                    className={HEADER_BTN_PRIMARY_DARK}
                                >
                                    {preparingOffer ? (
                                        <RotateCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    <span>Send offer</span>
                                </Button>
                            )}
                            <Button
                                type="button"
                                onClick={() => setIsLogCallOpen(true)}
                                title="Open call logs — add a call or view history"
                                variant="outline"
                                className={HEADER_BTN_SECONDARY}
                            >
                                <Phone className="w-4 h-4 text-emerald-600" />
                                <span>Call logs</span>
                                {callLogCount > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold tabular-nums">
                                        {callLogCount}
                                    </span>
                                )}
                            </Button>

                            {!isRepaymentReview && (
                                <>
                                    {/* Secondary Action: Credit check */}
                                    <Button
                                        onClick={() => {
                                            if (!creditCheckGates.ready) {
                                                setCreditGateMessage(creditCheckGates.message);
                                                setActiveTab('kyc');
                                                return;
                                            }
                                            openCreditCheck();
                                        }}
                                        disabled={creditDecisionLoading || isReadOnly}
                                        title={creditCheckGates.ready ? 'Run credit check' : creditCheckGates.message}
                                        variant="outline"
                                        className={HEADER_BTN_SECONDARY}
                                    >
                                        {creditDecisionLoading ? (
                                            <RotateCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <ShieldCheck className="w-4 h-4 text-slate-500" />
                                        )}
                                        <span>Credit check</span>
                                    </Button>

                                    {/* Contextual Action: Disbursal punching */}
                                    {showPunchUpdate && (
                                        <Button
                                            type="button"
                                            onClick={handleDisburse}
                                            disabled={updating}
                                            className={HEADER_BTN_PRIMARY_GREEN}
                                        >
                                            {updating ? (
                                                <RotateCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Banknote className="w-4 h-4" />
                                            )}
                                            <span>Disbursement punching</span>
                                        </Button>
                                    )}

                                    {/* Primary Action: Collection (Only for disbursed / active collection cases) */}
                                    {canShowCollection && (
                                        <Button
                                            onClick={() => setCollectionOpen(true)}
                                            className={HEADER_BTN_PRIMARY_DARK}
                                        >
                                            <HandCoins className="w-4 h-4" />
                                            <span>Collection</span>
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Progress Indicator */}
                    {!isRepaymentReview && data && (
                        <ApplicationNextStepBanner
                            aadhaarVerified={digioVerified}
                            panVerified={panVerified}
                            bankVerified={bankVerified}
                            selfieVerified={selfieVerified}
                            latestCreditRun={creditDecisionResult}
                            applicationStatus={loanApp?.application_status}
                            aaStatus={aaStatus}
                            creditLoading={creditLoading}
                            onCtaClick={handleBannerCta}
                            disabled={creditDecisionLoading || isReadOnly}
                        />
                    )}



                    {/* Consolidated Primary Navigation */}
                    {!isRepaymentReview && (
                        <div className="px-5 sm:px-6 bg-white border-b border-slate-200">
                            <div className="flex items-center gap-6 overflow-x-auto scrollbar-none -mb-px">
                                {navigationGroups.map((group) => {
                                    const isGroupActive = activeGroup?.id === group.id;
                                    return (
                                        <button
                                            key={group.id}
                                            type="button"
                                            onClick={() => handleSelectPrimaryGroup(group)}
                                            className={cn(
                                                'py-3 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap inline-flex items-center gap-1.5',
                                                isGroupActive
                                                    ? 'border-slate-900 text-slate-900 font-semibold'
                                                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                                            )}
                                        >
                                            <span>{group.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Secondary Sub-Navigation Strip (when the active group has >1 section) */}
                    {!isRepaymentReview && activeGroup && activeGroup.subtabs.length > 1 && (
                        <div className="px-5 sm:px-6 py-2 bg-slate-50/70 border-b border-slate-200/80">
                            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                                {activeGroup.subtabs.map((sub) => {
                                    const isSubActive = activeTab === sub.id;
                                    return (
                                        <button
                                            key={sub.id}
                                            type="button"
                                            onClick={() => setActiveTab(sub.id)}
                                            className={cn(
                                                'text-xs px-3 py-1 rounded-md transition-all whitespace-nowrap font-medium',
                                                isSubActive
                                                    ? 'bg-white text-slate-900 font-semibold shadow-2xs border border-slate-200'
                                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 border border-transparent'
                                            )}
                                        >
                                            {sub.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 bg-slate-50/80">
                    {!data ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 max-w-sm mx-auto">
                            <div className="w-14 h-14 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                                <XCircle className="h-6 w-6 text-slate-300" />
                            </div>
                            <h3 className="text-sm font-medium text-slate-600">No Application Found</h3>
                            <Button onClick={onClose} variant="outline" className="rounded-md px-6 border-slate-200 text-slate-600 text-xs font-medium h-9">Go Back</Button>
                        </div>
                    ) : (
                        <div className="w-full space-y-4">
                            {lockWarning && (
                                <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-3 text-amber-900">
                                    <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                                    <p className="text-xs font-normal opacity-80">{lockWarning}</p>
                                </div>
                            )}

                            {creditGateMessage && (
                                <Alert className="border-amber-200 bg-amber-50 py-3">
                                    <AlertDescription className="text-xs text-amber-900">
                                        {creditGateMessage}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {error && (
                                <Alert variant="destructive" className="py-3">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {message && (
                                <Alert className="py-3">
                                    <AlertDescription>{message}</AlertDescription>
                                </Alert>
                            )}

                            <Suspense
                                fallback={
                                    <div className="flex items-center justify-center py-16">
                                        <Spinner className="w-8 h-8 text-primary" />
                                    </div>
                                }
                            >
                                <div>
                                    {activeTab === 'overview' && <OverviewTab />}
                                    {activeTab === 'loan_history' && <LoanHistoryTab />}
                                    {activeTab === 'documents' && <DocumentsTab />}
                                    {activeTab === 'cam' && <CamTab key={loanApp?.application_status} />}
                                    {activeTab === 'verification' && <CreditVerificationTab />}
                                    {(activeTab === 'kyc' || activeTab === 'digio_kyc') && <DigitapKycTab />}
                                    {activeTab === 'bre' && <BRETab />}
                                    {activeTab === 'aa' && (
                                        <AaReportTab onOpenCreditCheck={openCreditCheck} />
                                    )}
                                    {activeTab === 'crif' && (
                                        <CrifReportTab onOpenCreditCheck={openCreditCheck} />
                                    )}
                                    {activeTab === 'history' && <HistoryTab />}
                                    {activeTab === 'call_logs' && <CallLogsTab />}
                                    {activeTab === 'journey' && <JourneyTab />}
                                    {activeTab === 'actions' && <ActionsTab />}
                                    {activeTab === 'repayments' && <RepaymentsTab />}
                                    {activeTab === 'breakdown' && <LoanBreakdownTab />}
                                    {activeTab === 'disbursement' && <DisbursementTab />}
                                    {activeTab === 'loan_account' && <LoanAccountViewTab />}
                                </div>
                            </Suspense>
                        </div>
                    )}
                </div>
            </div>

            <Suspense fallback={null}>
                {creditSheetOpen && (
                    <CreditDecisionSheet
                        open={creditSheetOpen}
                        onOpenChange={setCreditSheetOpen}
                        loading={creditDecisionLoading}
                        result={creditDecisionResult}
                        error={creditDecisionError}
                        isReadOnly={isReadOnly}
                        customerName={customerDisplayName}
                        applicationRef={loanApp?.application_number || applicationId}
                        onRun={openCreditCheck}
                        onResume={resumeCreditCheck}
                        onGoToDecision={handleGoToDecision}
                        onCopyMessage={handleCopyMessage}
                        onResultPatch={handleResultPatch}
                        onOpenAaTab={handleOpenAaTab}
                        onOpenCrifTab={handleOpenCrifTab}
                    />
                )}
            </Suspense>

            <Suspense fallback={null}>
                {isLogCallOpen && (
                    <CallLogsSheet
                        open={isLogCallOpen}
                        onOpenChange={setIsLogCallOpen}
                        applicationId={callLogAppRef}
                        customerName={customerDisplayName}
                        applicationLabel={loanApp?.application_number}
                        mobile={customerMobile}
                        followUpDate={loanApp?.follow_up_date}
                        onLogged={handleCallLogged}
                    />
                )}
                {collectionOpen && (
                    <CollectionPunchModal
                        open={collectionOpen}
                        onOpenChange={setCollectionOpen}
                        loanApplicationId={loanApp?.id || applicationId}
                    />
                )}
                <PunchDisbursalDialog />
            </Suspense>

            <AlertDialog open={approveConfirmOpen} onOpenChange={(open) => !approving && setApproveConfirmOpen(open)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Approve this case and issue the LAN?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This records underwriter approval for {loanApp?.lead_id || 'this application'} and issues
                            the loan account number. To add remarks, approve from the CAM tab instead.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={approving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={approving}
                            onClick={(e) => {
                                e.preventDefault();
                                handleHeaderApprove();
                            }}
                            className="bg-slate-900 hover:bg-slate-800"
                        >
                            {approving ? <RotateCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                            Approve &amp; issue LAN
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
