import { useState, useEffect, useMemo, useRef } from 'react';
import {
    CheckCircle2,
    Mail,
    Save,
    RefreshCw,
    AlertCircle,
    ShieldCheck,
    XCircle,
    ShieldBan,
    ExternalLink,
    ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useApplicationContext } from '@/components/admin/application-details/context/ApplicationContext';
import { cn } from '@/lib/utils';
import { adminAPI } from '@/lib/api';
import { productAPI } from '@/lib/api/roles';
import { offerAPI } from '@/lib/api/offer';
import {
    computeStaffVerificationGates,
    getRecommendBlockers,
    isBreRejectVerdict,
    isBrePreApproveVerdict,
} from '@/lib/utils/staffVerificationGates';
import RejectApplicationDialog from '../RejectApplicationDialog';
import { filterActivatableProductFees } from '@/lib/utils/feeBreakdown';
import { formatInr } from '../camFieldCatalog';

const STATUS_OPTION_HELP = {
    under_review: 'Mark case for manual review while verifications continue.',
    pending_pd: 'Personal discussion / telephonic verification pending.',
    recommended: 'Recommend to underwriter with recommended loan amount (all checks must be green).',
    offer_sent: 'Confirm the CAM amount, tenure and platform fee, then send. Customer gets SMS/email to accept; then video and e-sign.',
    approved: 'Use CAM → Approve & issue LAN first. After sanction, choose Send offer to customer here.',
    rejected: 'Close application with a reason for the customer.',
};

/** Session cache so Send offer does not wait on a cold products fetch */
let cachedOfferProducts = null;
let cachedOfferProductsAt = 0;
const OFFER_PRODUCTS_CACHE_MS = 5 * 60 * 1000;

function getCachedOfferProducts() {
    if (
        Array.isArray(cachedOfferProducts) &&
        cachedOfferProducts.length > 0 &&
        Date.now() - cachedOfferProductsAt < OFFER_PRODUCTS_CACHE_MS
    ) {
        return cachedOfferProducts;
    }
    return null;
}

function setCachedOfferProducts(list) {
    cachedOfferProducts = sanitizeOfferProducts(list);
    cachedOfferProductsAt = Date.now();
}

function sanitizeOfferProducts(list) {
    return (list || []).map((p) => ({
        ...p,
        fees: filterActivatableProductFees(p.fees),
    }));
}

function sortOfferProducts(list) {
    return [...(list || [])].sort((a, b) => {
        const aActive = Number(a.is_active) === 1 ? 0 : 1;
        const bActive = Number(b.is_active) === 1 ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        const aDef = Number(a.is_default) === 1 ? 0 : 1;
        const bDef = Number(b.is_default) === 1 ? 0 : 1;
        if (aDef !== bDef) return aDef - bDef;
        return Number(a.id) - Number(b.id);
    });
}

function finiteNumber(value) {
    if (value == null || value === '') return null;
    const n = Number(String(value).replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
}

function pickLimitProduct(products, preferredId) {
    const match = preferredId
        ? products.find((p) => String(p.id) === String(preferredId))
        : null;
    return (
        match ||
        products.find((p) => Number(p.is_default) === 1 && Number(p.is_active) === 1) ||
        products.find((p) => Number(p.is_active) === 1) ||
        products.find((p) => Number(p.is_default) === 1) ||
        products[0] ||
        null
    );
}

export default function ActionsTab() {
    const { 
        loanApp, applicationId, admin, statusUpdate, setStatusUpdate, handleStatusUpdate, 
        updating, isReadOnly, setActiveTab,
        latestBreEvaluation,
        userData, error, message, fetchApplication, kyc_details,
        data, creditDecisionResult,
    } = useApplicationContext();

    const roleCode = String(admin?.role_code || admin?.role || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');

    const canManagePayoutCases = [
        'super_admin',
        'org_admin',
        'admin',
        'underwriter',
        'approver',
    ].includes(roleCode);

    const gates = computeStaffVerificationGates({
        userData,
        kycDetails: kyc_details,
        bankDetails: data?.bankDetails || data?.bank_details || userData?.bankDetails,
        selfie: data?.selfie,
        breEvaluation: latestBreEvaluation,
        latestCreditRun: creditDecisionResult,
        panVerification: data?.pan_verification,
    });

    const pendingGates = getRecommendBlockers(gates);
    const allPrerequisitesMet = gates.complete;
    const needsGatesForStatus = ['recommended', 'approved', 'offer_sent'].includes(statusUpdate.status);
    const breBlocksRecommend = isBreRejectVerdict(creditDecisionResult);
    const breSuggestsRecommend = isBrePreApproveVerdict(creditDecisionResult);
    const appStatus = String(loanApp?.application_status || '').toLowerCase();
    const [revisionInfo, setRevisionInfo] = useState(null);
    const pendingRevision = revisionInfo?.pending || null;

    /** Customer asked for changes on a sent offer: staff re-send a revised offer from this tab. */
    const awaitingRevision =
        appStatus === 'offer_sent' &&
        (!!pendingRevision ||
            loanApp?.internal_status === 'offer_revision_requested' ||
            loanApp?.customer_status === 'offer_revision_requested');

    /** After UW sanction or a sent offer, Send offer stays available even if credit verdict is REJECT. */
    const alreadySanctioned =
        [
            'approved',
            'offer_sent',
            'offer_accepted',
            'video_declaration_pending',
            'video_declaration_submitted',
            'video_declaration_rejected',
            'offer_rejected',
        ].includes(appStatus) || awaitingRevision;

    useEffect(() => {
        if (appStatus !== 'offer_sent' || !loanApp?.id) {
            setRevisionInfo(null);
            return undefined;
        }
        let cancelled = false;
        offerAPI
            .getRevisionRequests(loanApp.id)
            .then((res) => {
                if (!cancelled && res?.status === 1) setRevisionInfo(res.data || null);
            })
            .catch(() => {
                if (!cancelled) setRevisionInfo(null);
            });
        return () => {
            cancelled = true;
        };
    }, [appStatus, loanApp?.id, loanApp?.internal_status]);

    const hidePositiveOutcomes = breBlocksRecommend && !alreadySanctioned;
    const skipGatesForSanctionedOffer =
        alreadySanctioned && statusUpdate.status === 'offer_sent';
    const gatesBlockSave =
        needsGatesForStatus && !allPrerequisitesMet && !skipGatesForSanctionedOffer;

    const positiveAmountOrEmpty = (...candidates) => {
        for (const c of candidates) {
            if (c == null || c === '') continue;
            const n = Number(String(c).replace(/,/g, ''));
            if (Number.isFinite(n) && n > 0) return n;
        }
        return null;
    };

    // Default status to recommended when BRE says PRE_APPROVED / APPROVED (staff still saves)
    useEffect(() => {
        if (isReadOnly || !breSuggestsRecommend) return;
        if (statusUpdate.status) return;
        if (!gates.complete) return;
        if (alreadySanctioned) return;
        setStatusUpdate((p) => ({ ...p, status: p.status || 'recommended' }));
    }, [breSuggestsRecommend, gates.complete, isReadOnly, setStatusUpdate, statusUpdate.status, alreadySanctioned]);

    // After sanction: auto-select Send offer (do not leave UW on Approve with a disabled save button)
    useEffect(() => {
        if (isReadOnly || !alreadySanctioned) return;
        if (statusUpdate.status === 'offer_sent' || statusUpdate.status === 'rejected') return;
        setStatusUpdate((p) => ({ ...p, status: 'offer_sent' }));
    }, [alreadySanctioned, isReadOnly, setStatusUpdate, statusUpdate.status]);

    // Clear recommend/approve if BRE rejects while that status is selected
    useEffect(() => {
        if (!breBlocksRecommend) return;
        if (alreadySanctioned || ['recommended', 'approved', 'offer_sent'].includes(appStatus)) return;
        if (['recommended', 'approved', 'offer_sent'].includes(statusUpdate.status)) {
            setStatusUpdate((p) => ({ ...p, status: 'rejected' }));
        }
    }, [breBlocksRecommend, setStatusUpdate, statusUpdate.status, appStatus, alreadySanctioned]);

    // Blacklist state
    const [showBlacklistDialog, setShowBlacklistDialog] = useState(false);
    const [blacklistReason, setBlacklistReason] = useState('');
    const [blacklisting, setBlacklisting] = useState(false);
    const [showOverrideDialog, setShowOverrideDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [payoutDialogAction, setPayoutDialogAction] = useState(null);
    const [payoutActionReason, setPayoutActionReason] = useState('');
    const [payoutActionBusy, setPayoutActionBusy] = useState(false);
    const [payoutActionError, setPayoutActionError] = useState('');
    const [payoutActionMessage, setPayoutActionMessage] = useState('');
    const [payoutHeldOverride, setPayoutHeldOverride] = useState(null);
    const [accountTeamVerified, setAccountTeamVerified] = useState(false);
    const [activeProducts, setActiveProducts] = useState(() => getCachedOfferProducts() || []);
    const offerSeedKeyRef = useRef('');

    // Load CAM particulars directly so ActionsTab is always in sync with CAM
    const [camData, setCamData] = useState(null);

    useEffect(() => {
        const camId = applicationId || loanApp?.id;
        if (!camId) return;
        let cancelled = false;
        adminAPI.getApplicationCam(camId)
            .then((res) => {
                if (!cancelled && res) {
                    setCamData(res.data || res);
                }
            })
            .catch((err) => {
                console.error('[ActionsTab] Failed to fetch CAM:', err);
            });
        return () => {
            cancelled = true;
        };
    }, [applicationId, loanApp?.id]);

    const camParticulars = camData?.particulars || null;

    useEffect(() => {
        if (!camParticulars || Object.keys(camParticulars).length === 0) return;
        const camAmt = positiveAmountOrEmpty(camParticulars.loan_recommended);
        const camTenure = finiteNumber(camParticulars.tenure_days);
        const camRoi = finiteNumber(camParticulars.roi_pct);
        const camFee = finiteNumber(camParticulars.admin_fee_pct);

        setStatusUpdate((prev) => {
            const next = { ...prev };
            if (camAmt != null && camAmt > 0) next.approvedAmount = camAmt;
            if (camTenure != null && camTenure > 0) next.tenureDays = String(camTenure);
            if (camRoi != null) next.interestRateDaily = String(camRoi);
            if (camFee != null) {
                next.feeBreakdown = { ...(prev.feeBreakdown || {}), process_fee: camFee };
            }
            return next;
        });
    }, [camParticulars, setStatusUpdate]);

    const payoutHeldFromServer = loanApp?.payout_hold === true ||
        Number(loanApp?.payout_hold ?? loanApp?.payoutHold) === 1;
    const payoutHeld = payoutHeldOverride ?? payoutHeldFromServer;

    useEffect(() => {
        setPayoutHeldOverride(null);
        setPayoutActionError('');
        setPayoutActionMessage('');
    }, [loanApp?.id]);

    const submitPayoutAction = async () => {
        const reason = payoutActionReason.trim();
        if (!payoutDialogAction || reason.length < 3) {
            setPayoutActionError('Please enter a reason (at least 3 characters).');
            return;
        }
        if (payoutDialogAction === 'reject' && roleCode === 'super_admin' && !accountTeamVerified) {
            setPayoutActionError('Confirm that the account team verified this case is not paid and is no longer processing.');
            return;
        }

        setPayoutActionBusy(true);
        setPayoutActionError('');
        setPayoutActionMessage('');
        try {
            await adminAPI.updateDisbursalPayoutCase(loanApp.id, {
                action: payoutDialogAction,
                reason,
                accountTeamVerified: payoutDialogAction === 'reject' && roleCode === 'super_admin' && accountTeamVerified,
            });
            setPayoutHeldOverride(payoutDialogAction === 'hold');
            setPayoutActionMessage(
                payoutDialogAction === 'hold'
                    ? 'Case placed on hold.'
                    : payoutDialogAction === 'release'
                        ? 'Hold released. Case is back in payout-ready.'
                        : 'Case cancelled as a customer withdrawal.'
            );
            setPayoutDialogAction(null);
            setPayoutActionReason('');
            setAccountTeamVerified(false);
            await fetchApplication(true);
        } catch (err) {
            setPayoutActionError(
                err?.response?.data?.message || err.message || 'Could not update payout case.'
            );
        } finally {
            setPayoutActionBusy(false);
        }
    };

    const isSendOffer = statusUpdate.status === 'offer_sent';

    useEffect(() => {
        if (!isSendOffer) {
            offerSeedKeyRef.current = '';
        }
    }, [isSendOffer]);

    // Products stay loaded only for silent amount, tenure and rate limits.
    useEffect(() => {
        let cancelled = false;
        const cached = getCachedOfferProducts();
        if (cached) {
            setActiveProducts(cached);
        }

        (async () => {
            try {
                const res = await productAPI.getProducts({ all: true });
                if (cancelled) return;
                const list = sanitizeOfferProducts(sortOfferProducts(res.data || []));
                setCachedOfferProducts(list);
                setActiveProducts(list);
            } catch {
                if (!cancelled && !getCachedOfferProducts()) setActiveProducts([]);
            }
        })();

        return () => { cancelled = true; };
    }, []);

    // Seed amount, tenure and the CAM platform fee once when products load for Send offer.
    useEffect(() => {
        if (!isSendOffer || !activeProducts.length) return;
        const seedKey = `offer:${applicationId || loanApp?.id || ''}:${activeProducts.map((p) => p.id).join(',')}`;
        if (offerSeedKeyRef.current === seedKey || offerSeedKeyRef.current === `pending:${seedKey}`) return;
        offerSeedKeyRef.current = `pending:${seedKey}`;

        const product = pickLimitProduct(activeProducts, loanApp?.product_id || statusUpdate.productId);
        if (!product) {
            offerSeedKeyRef.current = '';
            return;
        }

        let cancelled = false;
        (async () => {
            let camFee = null;
            let camRoi = null;
            const camId = applicationId || loanApp?.id;
            if (camId) {
                try {
                    const camRes = await adminAPI.getApplicationCam(camId);
                    const particulars = (camRes?.data || camRes || {}).particulars || {};
                    camFee = finiteNumber(particulars.admin_fee_pct);
                    camRoi = finiteNumber(particulars.roi_pct);
                } catch {
                    camFee = null;
                    camRoi = null;
                }
            }
            if (cancelled) return;

            const feeMap = {};
            filterActivatableProductFees(product.fees).forEach((f) => {
                feeMap[f.fee_code] = parseFloat(f.default_value) || 0;
            });
            if (camFee != null) {
                feeMap.process_fee = camFee;
            } else {
                const existingFee = finiteNumber(statusUpdate.feeBreakdown?.process_fee);
                if (existingFee != null) feeMap.process_fee = existingFee;
            }

            const seededAmount = positiveAmountOrEmpty(
                statusUpdate.approvedAmount,
                loanApp?.approved_amount,
                loanApp?.recommended_loan_amount,
                loanApp?.principal_amount,
                product.min_amount
            );
            const amount = seededAmount ?? Number(product.min_amount) ?? 0;
            const tenure = parseInt(statusUpdate.tenureDays || loanApp?.tenure_days || product.max_tenure_days, 10);
            const rate = camRoi ?? parseFloat(
                statusUpdate.interestRateDaily ||
                loanApp?.applied_interest_rate_daily ||
                product.default_interest_rate_daily
            );

            offerSeedKeyRef.current = seedKey;
            setStatusUpdate((p) => {
                const existingAmt = positiveAmountOrEmpty(p.approvedAmount);
                const existingFees = p.feeBreakdown || {};
                const feeTouched = JSON.stringify(existingFees) !== JSON.stringify(statusUpdate.feeBreakdown || {});
                const keptOverrides = {};
                if (feeTouched) {
                    for (const [code, val] of Object.entries(existingFees)) {
                        if (val == null || val === '') continue;
                        if (Object.prototype.hasOwnProperty.call(feeMap, code) || code === 'process_fee') {
                            keptOverrides[code] = val;
                        }
                    }
                }
                const rateTouched = String(p.interestRateDaily ?? '') !== String(statusUpdate.interestRateDaily ?? '');
                const nextRate = rateTouched ? p.interestRateDaily : rate;
                const numericRate = Number(nextRate);
                const maxRate = Number(product.max_interest_rate_daily);
                const clampedRate = Number.isFinite(numericRate)
                    ? Math.min(Math.max(numericRate, 0), Number.isFinite(maxRate) ? maxRate : numericRate)
                    : p.interestRateDaily;
                return {
                    ...p,
                    productId: loanApp?.product_id || p.productId || product.id,
                    feeBreakdown: feeTouched ? { ...feeMap, ...keptOverrides } : feeMap,
                    approvedAmount:
                        existingAmt ??
                        Math.min(Math.max(amount, Number(product.min_amount)), Number(product.max_amount)),
                    tenureDays: p.tenureDays || Math.min(Math.max(tenure, Number(product.min_tenure_days)), Number(product.max_tenure_days)),
                    interestRateDaily: clampedRate,
                };
            });
        })();

        return () => {
            cancelled = true;
            if (offerSeedKeyRef.current === `pending:${seedKey}`) offerSeedKeyRef.current = '';
        };
    }, [isSendOffer, activeProducts, loanApp, applicationId, setStatusUpdate, statusUpdate.productId, statusUpdate.approvedAmount, statusUpdate.tenureDays, statusUpdate.interestRateDaily]);

    const submitDecision = (e) => {
        if (camParticulars && Object.keys(camParticulars).length > 0) {
            const camAmt = positiveAmountOrEmpty(camParticulars.loan_recommended);
            const camTenure = finiteNumber(camParticulars.tenure_days);
            const camRoi = finiteNumber(camParticulars.roi_pct);
            const camFee = finiteNumber(camParticulars.admin_fee_pct);

            const overrides = {};
            if (camAmt != null && camAmt > 0) overrides.approvedAmount = camAmt;
            if (camTenure != null && camTenure > 0) overrides.tenureDays = String(camTenure);
            if (camRoi != null) overrides.interestRateDaily = String(camRoi);
            if (camFee != null) {
                overrides.feeBreakdown = { ...(statusUpdate.feeBreakdown || {}), process_fee: camFee };
            }
            handleStatusUpdate(e, overrides);
            return;
        }
        handleStatusUpdate(e);
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (statusUpdate.status === 'rejected') {
            setShowRejectDialog(true);
            return;
        }
        if (
            ['super_admin', 'org_admin'].includes(String(admin?.role_code || admin?.role || '').toLowerCase()) &&
            gatesBlockSave
        ) {
            setShowOverrideDialog(true);
            return;
        }
        submitDecision(e);
    };

    const confirmOverrideSubmit = (e) => {
        setShowOverrideDialog(false);
        if (statusUpdate.status === 'rejected') {
            setShowRejectDialog(true);
            return;
        }
        submitDecision(e);
    };

    const handleRejectConfirm = (rejectionReason) => {
        setShowRejectDialog(false);
        handleStatusUpdate({ preventDefault: () => {} }, { rejectionReason, status: 'rejected' });
    };

    const handleBlacklistCustomer = async () => {
        if (!blacklistReason.trim()) return;
        setBlacklisting(true);
        try {
            const resp = await adminAPI.blacklistFromApplication(loanApp.id, { reason: blacklistReason });
            if (resp.status === 1 || resp.data) {
                setShowBlacklistDialog(false);
                setBlacklistReason('');
                fetchApplication(true);
            }
        } catch (err) {
            alert(err?.response?.data?.message || err.message || 'Failed to blacklist');
        } finally {
            setBlacklisting(false);
        }
    };

    // Readonly / Completed State
    const isCompletedOrPayout = isReadOnly || ['esign_completed', 'mandate_pending', 'payment_pending', 'disbursed', 'closed'].includes(appStatus);

    return (
        <div id="actions-form" className="w-full space-y-4 max-w-7xl mx-auto pb-8 animate-in fade-in duration-200">

            {/* Compact Header Bar with Smooth Corner Blacklist Button */}
            <div className="bg-white rounded-lg border border-slate-200 px-4 py-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {loanApp?.lead_id || applicationId || `APP-${loanApp?.id || '—'}`}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-sm font-semibold text-slate-900">
                            {userData?.full_name || 'Customer'}
                        </span>
                        <Badge 
                            variant="outline" 
                            className={cn(
                                "text-[10px] uppercase font-bold px-2 py-0.2 border",
                                appStatus === 'approved' || appStatus === 'disbursed'
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : appStatus === 'rejected'
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : appStatus === 'offer_sent'
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                            )}
                        >
                            {appStatus.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-slate-400 hidden md:inline">
                            (PAN: {userData?.profile?.pancard || userData?.pancard || '—'} · Mob: {userData?.mobile || userData?.profile?.mobile || '—'})
                        </span>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="flex items-center gap-3 text-xs pr-1">
                            <div>
                                <span className="text-[10px] uppercase text-slate-400 block font-medium">Applied</span>
                                <span className="font-bold text-slate-800 font-mono">
                                    ₹{formatInr(camParticulars?.loan_applied || loanApp?.principal_amount || loanApp?.applied_amount || 0)}
                                </span>
                            </div>
                            <div className="border-l border-slate-200 pl-3">
                                <span className="text-[10px] uppercase text-indigo-500 block font-medium">Recommended</span>
                                <span className="font-bold text-indigo-700 font-mono">
                                    ₹{formatInr(camParticulars?.loan_recommended || loanApp?.recommended_loan_amount || loanApp?.approved_amount || 0)}
                                </span>
                            </div>
                        </div>

                        {/* Smooth corner blacklist button */}
                        {!['rejected', 'closed', 'cancelled'].includes(appStatus) && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowBlacklistDialog(true)}
                                className="h-7 px-2.5 text-[11px] font-medium text-slate-500 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 border-slate-200 transition-colors ml-1"
                                title="Blacklist customer"
                            >
                                <ShieldBan className="w-3.5 h-3.5 mr-1 text-slate-400 group-hover:text-rose-600" />
                                Blacklist
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Read-Only / Payout Active Notification */}
            {isCompletedOrPayout && (
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-slate-900 uppercase">
                                Stage: {appStatus.replace(/_/g, ' ')}
                            </p>
                            <p className="text-[11px] text-slate-500">
                                Workflow is completed or locked for audit protection.
                            </p>
                        </div>
                    </div>
                    {appStatus === 'payment_pending' && canManagePayoutCases && (
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setPayoutActionError('');
                                    setAccountTeamVerified(false);
                                    setPayoutDialogAction(payoutHeld ? 'release' : 'hold');
                                }}
                                className="h-7 text-xs font-semibold"
                            >
                                {payoutHeld ? 'Release Hold' : 'Place On Hold'}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs font-semibold border-rose-200 text-rose-700 hover:bg-rose-50"
                                onClick={() => {
                                    setPayoutActionError('');
                                    setAccountTeamVerified(false);
                                    setPayoutDialogAction('reject');
                                }}
                            >
                                Reject Payout
                            </Button>
                        </div>
                    )}
                    {appStatus === 'esign_completed' && (
                        <Button onClick={() => setActiveTab?.('disbursement')} className="h-7 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
                            Go to Payout
                        </Button>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* COMPACT 2-COLUMN GRID: CAM TERMS & WORKFLOW DECISION */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

                {/* Left Column: CAM Terms & Repayment Table */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                        <div>
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">CAM Terms & Repayment</h3>
                            <p className="text-[10px] text-slate-400">Single source of truth for sanctioned terms.</p>
                        </div>
                        {setActiveTab && (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setActiveTab('cam')}
                                className="h-6 px-2.5 text-[11px] font-semibold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                            >
                                Edit CAM
                            </Button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <tbody className="divide-y divide-slate-100 text-xs font-mono">
                                <tr className="hover:bg-slate-50/40">
                                    <td className="py-2 px-4 font-sans font-medium text-slate-600">Loan Recommended</td>
                                    <td className="py-2 px-4 text-right font-bold text-slate-900">
                                        ₹{formatInr(camParticulars?.loan_recommended || loanApp?.approved_amount || 0)}
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50/40">
                                    <td className="py-2 px-4 font-sans font-medium text-slate-600">Tenure</td>
                                    <td className="py-2 px-4 text-right font-medium text-slate-800">
                                        {camParticulars?.tenure_days ? `${camParticulars.tenure_days} days` : (loanApp?.tenure_days ? `${loanApp.tenure_days} days` : '—')}
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50/40">
                                    <td className="py-2 px-4 font-sans font-medium text-slate-600">Interest Rate</td>
                                    <td className="py-2 px-4 text-right font-medium text-slate-800">
                                        {camParticulars?.roi_pct != null ? `${camParticulars.roi_pct}% per day` : (loanApp?.applied_interest_rate_daily ? `${loanApp.applied_interest_rate_daily}% per day` : '—')}
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50/40">
                                    <td className="py-2 px-4 font-sans font-medium text-slate-600">Platform Fee + GST</td>
                                    <td className="py-2 px-4 text-right font-medium text-slate-800">
                                        ₹{formatInr(camParticulars?.net_admin_fee || camParticulars?.admin_fee_with_gst || 0)} ({camParticulars?.admin_fee_pct != null ? camParticulars.admin_fee_pct : 10}%)
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50/40">
                                    <td className="py-2 px-4 font-sans font-medium text-slate-600">Net Disbursal</td>
                                    <td className="py-2 px-4 text-right font-bold text-emerald-700">
                                        ₹{formatInr(camParticulars?.net_disb_amount || 0)}
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50/40">
                                    <td className="py-2 px-4 font-sans font-medium text-slate-600">Total Repayment</td>
                                    <td className="py-2 px-4 text-right font-bold text-slate-900">
                                        ₹{formatInr(camParticulars?.repay_amount || 0)}
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50/40">
                                    <td className="py-2 px-4 font-sans font-medium text-slate-600">Disbursal Date</td>
                                    <td className="py-2 px-4 text-right font-sans text-slate-800">
                                        {camParticulars?.disbursal_date || '—'}
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50/40">
                                    <td className="py-2 px-4 font-sans font-medium text-slate-600">Repayment Date</td>
                                    <td className="py-2 px-4 text-right font-sans text-slate-800">
                                        {camParticulars?.repay_date || '—'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: Application Decision & Workflow */}
                <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3">
                    <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                        <div>
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                {alreadySanctioned ? 'Offer Confirmation & Dispatch' : 'Application Decision & Workflow'}
                            </h3>
                            <p className="text-[10px] text-slate-400">
                                {alreadySanctioned ? 'Review CAM terms and send offer to customer.' : 'Submit underwriter outcome.'}
                            </p>
                        </div>
                    </div>

                    {/* Customer requested offer revisions */}
                    {awaitingRevision && (
                        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg space-y-2">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-amber-900">Customer requested offer changes</p>
                                    <p className="text-[10px] text-amber-800">
                                        {revisionInfo && `Request ${revisionInfo.used} of ${revisionInfo.maxRequests}.`}
                                    </p>
                                </div>
                            </div>
                            {pendingRevision && (
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-white p-2 rounded border border-amber-100">
                                        <span className="text-[9px] text-slate-400 block uppercase">Requested Amount</span>
                                        <span className="font-bold text-slate-800 font-mono">
                                            ₹{formatInr(pendingRevision.requestedAmount)}
                                        </span>
                                    </div>
                                    <div className="bg-white p-2 rounded border border-amber-100">
                                        <span className="text-[9px] text-slate-400 block uppercase">Requested Tenure</span>
                                        <span className="font-bold text-slate-800">
                                            {pendingRevision.requestedTenureDays} days
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sanctioned Offer Confirmation Summary */}
                    {alreadySanctioned && !isCompletedOrPayout && (
                        <div className="p-3 rounded-lg border border-indigo-100 bg-indigo-50/20 space-y-2">
                            <div className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                    Ready to Send Offer
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="p-2 bg-white rounded border border-slate-200">
                                    <span className="text-[9px] text-slate-400 block uppercase">Loan</span>
                                    <span className="font-bold text-slate-800 font-mono">
                                        ₹{formatInr(camParticulars?.loan_recommended || loanApp?.approved_amount || 0)}
                                    </span>
                                </div>
                                <div className="p-2 bg-white rounded border border-slate-200">
                                    <span className="text-[9px] text-slate-400 block uppercase">Disbursal</span>
                                    <span className="font-bold text-emerald-700 font-mono">
                                        ₹{formatInr(camParticulars?.net_disb_amount || 0)}
                                    </span>
                                </div>
                                <div className="p-2 bg-white rounded border border-slate-200">
                                    <span className="text-[9px] text-slate-400 block uppercase">Repayment</span>
                                    <span className="font-bold text-slate-900 font-mono">
                                        ₹{formatInr(camParticulars?.repay_amount || 0)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isCompletedOrPayout && (
                        <form onSubmit={handleFormSubmit} className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                    Select Next Workflow Action
                                </label>
                                <select
                                    value={statusUpdate.status || ''}
                                    onChange={(e) => setStatusUpdate((p) => ({ ...p, status: e.target.value }))}
                                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-300 font-medium"
                                >
                                    <option value="" disabled>Select decision...</option>
                                    {alreadySanctioned ? (
                                        <>
                                            <option value="offer_sent">Send offer to customer</option>
                                            <option value="rejected">Reject application</option>
                                        </>
                                    ) : admin?.role === 'credit_manager' ? (
                                        <>
                                            <option value="under_review">Under Review</option>
                                            <option value="pending_pd">Pending PD (personal discussion)</option>
                                            {!hidePositiveOutcomes && (
                                                <option value="recommended">Recommend Approval (send to underwriter)</option>
                                            )}
                                            <option value="rejected">Reject application</option>
                                        </>
                                    ) : ['underwriter', 'approver'].includes(roleCode) ? (
                                        <>
                                            <option value="under_review">Under Review</option>
                                            <option value="pending_pd">Pending PD (personal discussion)</option>
                                            {!hidePositiveOutcomes && (
                                                <option value="recommended">Recommend Approval (send to underwriter)</option>
                                            )}
                                            {!hidePositiveOutcomes && (
                                                <option value="approved">Approve limit (internal sanction)</option>
                                            )}
                                            {!hidePositiveOutcomes && (
                                                <option value="offer_sent">Send offer to customer</option>
                                            )}
                                            <option value="rejected">Reject application</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="under_review">Under Review</option>
                                            {!hidePositiveOutcomes && (
                                                <option value="recommended">Recommended (send to underwriter)</option>
                                            )}
                                            {!hidePositiveOutcomes && (
                                                <option value="offer_sent">Send offer to customer</option>
                                            )}
                                            {!hidePositiveOutcomes && (
                                                <option value="approved">Approve limit (internal sanction)</option>
                                            )}
                                            <option value="rejected">Reject application</option>
                                        </>
                                    )}
                                </select>
                                {statusUpdate.status && STATUS_OPTION_HELP[statusUpdate.status] && (
                                    <p className="text-[10px] text-slate-400 leading-tight">
                                        {STATUS_OPTION_HELP[statusUpdate.status]}
                                    </p>
                                )}
                            </div>

                            {statusUpdate.status && statusUpdate.status !== 'rejected' && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                        Remarks / Internal Notes
                                    </label>
                                    <Textarea
                                        className="rounded-lg min-h-[55px] border-slate-200 bg-white text-xs p-2.5"
                                        value={statusUpdate.remarks}
                                        onChange={(e) => setStatusUpdate((p) => ({ ...p, remarks: e.target.value }))}
                                        placeholder="Enter approval notes or customer-facing remarks..."
                                    />
                                </div>
                            )}

                            {gatesBlockSave && !['super_admin', 'org_admin'].includes(roleCode) && (
                                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                                    <span className="font-bold uppercase tracking-wider block text-[9px] mb-0.5">Verification Pending</span>
                                    {pendingGates.length} check{pendingGates.length > 1 ? 's' : ''} pending: {pendingGates.map((g) => g.label).join(', ')}.
                                </div>
                            )}

                            {(error || message) && (
                                <Alert id="decision-result" variant={error ? 'destructive' : 'default'} className="py-2">
                                    <AlertDescription className="text-xs">{error || message}</AlertDescription>
                                </Alert>
                            )}

                            <Button
                                id="decision-submit"
                                type="submit"
                                className="w-full h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider transition-all"
                                disabled={updating || !statusUpdate.status || (gatesBlockSave && !['super_admin', 'org_admin'].includes(roleCode))}
                            >
                                {updating ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                ) : ['super_admin', 'org_admin'].includes(roleCode) && gatesBlockSave ? (
                                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                                ) : isSendOffer ? (
                                    <Mail className="w-3.5 h-3.5 mr-1.5" />
                                ) : (
                                    <Save className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                {['super_admin', 'org_admin'].includes(roleCode) && gatesBlockSave
                                    ? 'DIRECT OVERRIDE & SAVE'
                                    : isSendOffer
                                    ? 'SEND OFFER TO CUSTOMER'
                                    : statusUpdate.status === 'rejected'
                                    ? 'REVIEW & REJECT'
                                    : 'SAVE DECISION'}
                            </Button>
                        </form>
                    )}
                </div>

            </div>

            {/* ========================================================================= */}
            {/* MODALS / DIALOGS (Emergency Override, Blacklist, Reject, Payout Action) */}
            {/* ========================================================================= */}

            {/* Super Admin Override Dialog */}
            <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
                <DialogContent className="sm:max-w-md rounded-lg p-5 border border-amber-200">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-amber-900 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5" /> Emergency Override
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-600 mt-2">
                            Verification checklist is incomplete. Saving without KYC/BRE is only for emergencies and is audited.
                        </DialogDescription>
                    </DialogHeader>
                    <ul className="text-xs text-amber-900 space-y-1 py-2 list-disc list-inside">
                        {pendingGates.map((g) => (
                            <li key={g.key}>{g.label}</li>
                        ))}
                    </ul>
                    <DialogFooter className="gap-2 mt-2">
                        <Button variant="ghost" onClick={() => setShowOverrideDialog(false)} className="h-8 text-xs">Cancel</Button>
                        <Button onClick={confirmOverrideSubmit} disabled={updating} className="h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs">
                            Confirm Override & Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Blacklist Confirmation Dialog */}
            <Dialog open={showBlacklistDialog} onOpenChange={setShowBlacklistDialog}>
                <DialogContent className="sm:max-w-md bg-white rounded-lg border border-slate-200 p-5">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-medium text-rose-700 flex items-center gap-2">
                            <ShieldBan className="w-5 h-5" /> Blacklist Customer
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 mt-2">
                            This action permanently blocks this customer's PAN and mobile from all future applications. The current application will be auto-rejected.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 pt-3">
                        <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-xs space-y-0.5">
                            <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">Customer Details</p>
                            <p className="text-rose-900 font-semibold">{userData?.full_name || 'Customer'} • {userData?.mobile || userData?.profile?.mobile || 'N/A'}</p>
                            <p className="text-rose-700 font-mono">PAN: {userData?.profile?.pancard || userData?.pancard || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Reason (Required)</span>
                            <Textarea 
                                placeholder="Why are you blacklisting this customer? (e.g. Fraud, fake documents, defaulter)"
                                value={blacklistReason}
                                onChange={(e) => setBlacklistReason(e.target.value)}
                                className="min-h-[80px] rounded-lg border-rose-200 text-xs resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter className="mt-4 gap-2">
                        <Button variant="ghost" onClick={() => setShowBlacklistDialog(false)} className="text-xs h-8">Cancel</Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleBlacklistCustomer} 
                            disabled={blacklisting || !blacklistReason.trim()}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8 px-5"
                        >
                            {blacklisting ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <ShieldBan className="w-3.5 h-3.5 mr-1.5" />}
                            {blacklisting ? "Processing..." : "Confirm Blacklist"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Application Dialog */}
            <RejectApplicationDialog
                open={showRejectDialog}
                onOpenChange={setShowRejectDialog}
                onConfirm={handleRejectConfirm}
                updating={updating}
            />

            {/* Payout Hold / Release / Reject Dialog */}
            <Dialog
                open={Boolean(payoutDialogAction)}
                onOpenChange={(open) => {
                    if (!open && !payoutActionBusy) {
                        setPayoutDialogAction(null);
                        setPayoutActionReason('');
                        setPayoutActionError('');
                        setAccountTeamVerified(false);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md rounded-lg border-slate-200">
                    <DialogHeader>
                        <DialogTitle>
                            {payoutDialogAction === 'hold'
                                ? 'Place Case on Hold'
                                : payoutDialogAction === 'release'
                                ? 'Release Case Hold'
                                : 'Reject and Cancel Payout'}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {payoutDialogAction === 'hold'
                                ? 'This case will remain payment-pending but will not appear in the payout-ready list until released.'
                                : payoutDialogAction === 'release'
                                ? 'This case will return to the payout-ready list.'
                                : 'Cancels the application as a customer withdrawal.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <label htmlFor="payout-action-reason" className="text-xs font-semibold text-slate-700">Reason</label>
                        <Textarea
                            id="payout-action-reason"
                            value={payoutActionReason}
                            onChange={(event) => setPayoutActionReason(event.target.value)}
                            rows={3}
                            maxLength={500}
                            placeholder="Enter reason..."
                            className="text-xs"
                        />
                        {payoutDialogAction === 'reject' && roleCode === 'super_admin' && (
                            <label className="flex items-start gap-2 pt-2 text-xs text-slate-700">
                                <input
                                    type="checkbox"
                                    className="mt-0.5"
                                    checked={accountTeamVerified}
                                    onChange={(event) => setAccountTeamVerified(event.target.checked)}
                                />
                                <span>
                                    I confirmed with the account team that this case has not been paid and is no longer being processed.
                                </span>
                            </label>
                        )}
                        {payoutActionError && (
                            <p role="alert" className="text-xs text-rose-700">{payoutActionError}</p>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setPayoutDialogAction(null);
                                setAccountTeamVerified(false);
                            }}
                            disabled={payoutActionBusy}
                            className="text-xs h-8"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            className={payoutDialogAction === 'reject'
                                ? 'bg-rose-600 text-white hover:bg-rose-700 text-xs h-8'
                                : 'bg-slate-900 text-white hover:bg-slate-800 text-xs h-8'}
                            onClick={submitPayoutAction}
                            disabled={
                                payoutActionBusy ||
                                payoutActionReason.trim().length < 3 ||
                                (payoutDialogAction === 'reject' && roleCode === 'super_admin' && !accountTeamVerified)
                            }
                        >
                            {payoutActionBusy && <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            {payoutDialogAction === 'hold'
                                ? 'Place on Hold'
                                : payoutDialogAction === 'release'
                                ? 'Release Hold'
                                : 'Confirm Withdrawal'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
