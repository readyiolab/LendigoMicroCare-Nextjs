
import { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, CheckCircle2, Mail, BadgeInfo, Save, FileText, RefreshCw, Download, AlertCircle, ShieldCheck, Sparkles, XCircle, RotateCw, ShieldBan, ChevronDown, ChevronUp, Info, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useApplicationContext } from '@/components/admin/application-details/context/ApplicationContext';
import { cn } from '@/lib/utils';
import { adminAPI } from '@/lib/api';
import { productAPI } from '@/lib/api/roles';
import { offerAPI } from '@/lib/api/offer';
import {
    computeStaffVerificationGates,
    STAFF_GATE_ITEMS,
    getRecommendBlockers,
    isBreRejectVerdict,
    isBrePreApproveVerdict,
} from '@/lib/utils/staffVerificationGates';
import { verdictLabel } from '@/lib/utils/creditDecisionDisplay';
import { DetailTable, DetailRow } from '../common/DetailTable';
import RejectApplicationDialog from '../RejectApplicationDialog';
import { filterActivatableProductFees } from '@/lib/utils/feeBreakdown';

const WORKFLOW_STEPS = [
    'Customer applies → complete Digitap KYC (Aadhaar, PAN, bank, selfie).',
    'Credit Manager → edit CAM particulars → Recommend to Underwriter.',
    'Underwriter → Approve & issue LAN (CAM) → Continue to send offer → Decision: SEND OFFER TO CUSTOMER.',
    'Customer accepts → video declaration → then Credit Manager or Operations: Send to sign → Register e-mandate.',
    'Operations team disburses after Disbursal Sheet / all steps are done.',
];

const STATUS_OPTION_HELP = {
    under_review: 'Mark case for manual review while verifications continue.',
    pending_pd: 'Personal discussion / telephonic verification pending.',
    recommended: 'Recommend to underwriter with recommended loan amount (all checks must be green).',
    offer_sent: 'Confirm product and amount, then send. Customer gets SMS/email to accept; then video and e-sign.',
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

export default function ActionsTab() {
    const { 
        loanApp, admin, statusUpdate, setStatusUpdate, handleStatusUpdate, 
        updating, setUpdating, productDetails, isReadOnly, setActiveTab,
        latestBreEvaluation, handleTriggerEvaluation,
        loadingBRE, userData, error, message, fetchApplication, kyc_details,
        data, creditDecisionResult,
        editingSalaryDate, setEditingSalaryDate,
        newSalaryDate, setNewSalaryDate,
        handleUpdateSalaryDate,
    } = useApplicationContext();

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
    /** After UW sanction, Send offer must stay available even if credit verdict is REJECT. */
    const alreadySanctioned = appStatus === 'approved' || awaitingRevision;

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

    // Clear recommend/approve if BRE rejects while that status is selected —
    // but never force-reject when case is already recommended/sanctioned (UW path).
    useEffect(() => {
        if (!breBlocksRecommend) return;
        if (['recommended', 'approved'].includes(appStatus)) return;
        if (['recommended', 'approved', 'offer_sent'].includes(statusUpdate.status)) {
            setStatusUpdate((p) => ({ ...p, status: 'rejected' }));
        }
    }, [breBlocksRecommend, setStatusUpdate, statusUpdate.status, appStatus]);

    const operationsNote = (() => {
        const s = loanApp?.application_status;
        if (s === 'under_review') {
            return loanApp.bre_review_reason || 'System flagged for manual review.';
        }
        if (s === 'offer_sent' && awaitingRevision) {
            return 'Customer requested changes to the offer. Review the request below, adjust the terms and re-send the offer.';
        }
        if (s === 'offer_sent') {
            return 'Offer email sent. Customer must accept on their loan dashboard before e-sign.';
        }
        if (s === 'recommended') {
            return 'Credit recommended this case. Approve & issue LAN on CAM, then continue to send offer.';
        }
        if (s === 'approved') {
            return 'Sanctioned. Confirm product and amount below, then send the offer to the customer.';
        }
        if (s === 'rejected' || s === 'offer_rejected') {
            return 'Application closed. See History tab for reason.';
        }
        if (['esign_completed', 'mandate_pending', 'disbursed', 'closed'].includes(s)) {
            return 'Later-stage workflow — use the relevant tab (E-sign, Disbursement, etc.).';
        }
        return 'Use the tabs above to complete verification, then save your decision below.';
    })();

    // Blacklist state
    const [showBlacklistDialog, setShowBlacklistDialog] = useState(false);
    const [blacklistReason, setBlacklistReason] = useState('');
    const [blacklisting, setBlacklisting] = useState(false);
    const [showWorkflowGuide, setShowWorkflowGuide] = useState(false);
    const [showOverrideDialog, setShowOverrideDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [activeProducts, setActiveProducts] = useState(() => getCachedOfferProducts() || []);
    const [loadingProducts, setLoadingProducts] = useState(() => !getCachedOfferProducts());
    const offerSeedKeyRef = useRef('');
    const [tenureClampedFrom, setTenureClampedFrom] = useState(null);

    const showOfferParams = ['offer_sent', 'approved', 'recommended'].includes(statusUpdate.status);
    const isSendOffer = statusUpdate.status === 'offer_sent';

    const selectedProduct = useMemo(() => {
        if (!statusUpdate.productId) return null;
        return activeProducts.find((p) => String(p.id) === String(statusUpdate.productId)) || null;
    }, [activeProducts, statusUpdate.productId]);

    const offerFees = useMemo(
        () => filterActivatableProductFees(selectedProduct?.fees),
        [selectedProduct]
    );

    useEffect(() => {
        if (!isSendOffer) {
            offerSeedKeyRef.current = '';
        }
    }, [isSendOffer]);

    // Prefetch all products (with fees) when Decisions tab mounts — underwriter can pick any package
    useEffect(() => {
        let cancelled = false;
        const cached = getCachedOfferProducts();
        if (cached) {
            setActiveProducts(cached);
            setLoadingProducts(false);
        } else {
            setLoadingProducts(true);
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
            } finally {
                if (!cancelled) setLoadingProducts(false);
            }
        })();

        return () => { cancelled = true; };
    }, []);

    // Seed product + fee defaults once when products load for Send offer
    useEffect(() => {
        if (!isSendOffer || !activeProducts.length) return;
        const seedKey = `offer:${activeProducts.map((p) => p.id).join(',')}`;
        if (offerSeedKeyRef.current === seedKey) return;

        const match = statusUpdate.productId
            ? activeProducts.find((p) => String(p.id) === String(statusUpdate.productId))
            : null;
        const product =
            match ||
            activeProducts.find((p) => Number(p.is_default) === 1 && Number(p.is_active) === 1) ||
            activeProducts.find((p) => Number(p.is_active) === 1) ||
            activeProducts.find((p) => Number(p.is_default) === 1) ||
            activeProducts[0];
        if (!product) return;

        const feeMap = {};
        filterActivatableProductFees(product.fees).forEach((f) => {
            feeMap[f.fee_code] = parseFloat(f.default_value) || 0;
        });

        const seededAmount = positiveAmountOrEmpty(
            statusUpdate.approvedAmount,
            loanApp?.approved_amount,
            loanApp?.recommended_loan_amount,
            loanApp?.principal_amount,
            product.min_amount
        );
        const amount = seededAmount ?? Number(product.min_amount) ?? 0;
        const tenure = parseInt(statusUpdate.tenureDays || loanApp?.tenure_days || product.max_tenure_days, 10);
        const rate = parseFloat(
            statusUpdate.interestRateDaily ||
            loanApp?.applied_interest_rate_daily ||
            product.default_interest_rate_daily
        );

        offerSeedKeyRef.current = seedKey;
        if (!statusUpdate.tenureDays && Number.isFinite(tenure)) {
            const clamped = Math.min(Math.max(tenure, Number(product.min_tenure_days)), Number(product.max_tenure_days));
            setTenureClampedFrom(clamped !== tenure ? tenure : null);
        }
        setStatusUpdate((p) => {
            const existingAmt = positiveAmountOrEmpty(p.approvedAmount);
            const existingFees = p.feeBreakdown || {};
            const keptOverrides = {};
            for (const [code, val] of Object.entries(existingFees)) {
                if (Object.prototype.hasOwnProperty.call(feeMap, code)) {
                    keptOverrides[code] = val;
                }
            }
            return {
                ...p,
                productId: product.id,
                feeBreakdown: Object.keys(keptOverrides).length ? { ...feeMap, ...keptOverrides } : feeMap,
                approvedAmount:
                    existingAmt ??
                    Math.min(Math.max(amount, Number(product.min_amount)), Number(product.max_amount)),
                tenureDays: p.tenureDays || Math.min(Math.max(tenure, Number(product.min_tenure_days)), Number(product.max_tenure_days)),
                interestRateDaily: p.interestRateDaily || Math.min(Math.max(rate, Number(product.min_interest_rate_daily)), Number(product.max_interest_rate_daily)),
            };
        });
    }, [isSendOffer, activeProducts, loanApp, setStatusUpdate, statusUpdate.productId, statusUpdate.approvedAmount, statusUpdate.tenureDays, statusUpdate.interestRateDaily]);

    const applyProductSelection = (productId) => {
        const product = activeProducts.find((p) => String(p.id) === String(productId));
        if (!product) {
            setStatusUpdate((p) => ({ ...p, productId }));
            return;
        }
        const feeMap = {};
        filterActivatableProductFees(product.fees).forEach((f) => {
            feeMap[f.fee_code] = parseFloat(f.default_value) || 0;
        });
        const amount =
            positiveAmountOrEmpty(
                statusUpdate.approvedAmount,
                loanApp?.approved_amount,
                loanApp?.recommended_loan_amount,
                loanApp?.principal_amount,
                product.min_amount
            ) ?? Number(product.min_amount);
        const requestedTenure = parseInt(statusUpdate.tenureDays || product.max_tenure_days, 10);
        if (Number.isFinite(requestedTenure)) {
            const clamped = Math.min(
                Math.max(requestedTenure, Number(product.min_tenure_days)),
                Number(product.max_tenure_days)
            );
            setTenureClampedFrom(clamped !== requestedTenure ? requestedTenure : null);
        }
        setStatusUpdate((p) => ({
            ...p,
            productId: product.id,
            feeBreakdown: feeMap,
            approvedAmount: Math.min(Math.max(amount, Number(product.min_amount)), Number(product.max_amount)),
            tenureDays: Math.min(
                Math.max(parseInt(p.tenureDays || product.max_tenure_days, 10), Number(product.min_tenure_days)),
                Number(product.max_tenure_days)
            ),
            interestRateDaily: Number(product.default_interest_rate_daily),
        }));
    };

    const updateFeePercent = (feeCode, value) => {
        setStatusUpdate((p) => ({
            ...p,
            feeBreakdown: { ...(p.feeBreakdown || {}), [feeCode]: parseFloat(value) || 0 },
        }));
    };

    // A failed save is reported at the top of the page too, but staff are down here at the button.
    // Holds the submit time; only an error from that save (within the window) scrolls.
    const SUBMIT_ERROR_SCROLL_WINDOW_MS = 30000;
    const submitAttemptedAtRef = useRef(0);
    useEffect(() => {
        if (!error || !submitAttemptedAtRef.current) return;
        const recent = Date.now() - submitAttemptedAtRef.current < SUBMIT_ERROR_SCROLL_WINDOW_MS;
        submitAttemptedAtRef.current = 0;
        if (!recent) return;
        window.requestAnimationFrame(() => {
            document.getElementById('decision-result')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }, [error]);
    // Declared after the error effect: a failed save sets error and ends updating in the same render
    useEffect(() => {
        if (!updating) submitAttemptedAtRef.current = 0;
    }, [updating]);

    const submitDecision = (e) => {
        submitAttemptedAtRef.current = Date.now();
        handleStatusUpdate(e);
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (statusUpdate.status === 'rejected') {
            setShowRejectDialog(true);
            return;
        }
        if (
            admin?.role === 'super_admin' &&
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

    return (
        <>
        <div id="actions-form" className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Workflow guide */}
            <div className="lg:col-span-12">
                <button
                    type="button"
                    onClick={() => setShowWorkflowGuide((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-left hover:bg-slate-100 transition-colors"
                >
                    <span className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <Info className="w-4 h-4 text-indigo-500" />
                        How loan decisions work (step-by-step)
                    </span>
                    {showWorkflowGuide ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {showWorkflowGuide && (
                    <ol className="mt-2 rounded-lg border border-slate-100 bg-white px-4 py-3 space-y-1.5 list-decimal list-inside text-xs text-slate-600 leading-relaxed">
                        {WORKFLOW_STEPS.map((step, i) => (
                            <li key={i}>{step}</li>
                        ))}
                    </ol>
                )}
            </div>
            
            {/* Left Column: Gates & Alerts — stays put; right column scrolls */}
            <div className="lg:col-span-12 xl:col-span-4 space-y-3 xl:sticky xl:top-4 xl:self-start xl:z-10">
                <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Checklist to Approve</h3>
                        <Badge variant="outline" className={cn("text-[9px] border-none font-medium uppercase px-2 py-0.5", allPrerequisitesMet ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                            {allPrerequisitesMet ? 'All complete' : 'Pending'}
                        </Badge>
                    </div>

                    {breBlocksRecommend && (
                        <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-100 text-[11px] text-rose-800 flex items-start gap-2">
                            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>
                                BRE says not eligible — <strong>Recommend is blocked</strong>. Choose Reject
                                application (or ask Super Admin to override).
                            </span>
                        </div>
                    )}

                    {allPrerequisitesMet && !breBlocksRecommend && (
                        <div className="mb-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-800 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            {breSuggestsRecommend
                                ? 'BRE suggests approval — you may recommend, approve, or send offer.'
                                : 'All checks complete — you may recommend, approve, or send offer.'}
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        {STAFF_GATE_ITEMS.map((item) => {
                            const done = gates[item.key];
                            return (
                                <div key={item.key} className="flex items-start justify-between gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="min-w-0">
                                        <span className="text-[11px] font-normal text-slate-600 block">{item.label}</span>
                                        {!done && (
                                            <span className="text-[10px] text-amber-700 mt-1 block leading-relaxed">{item.hint}</span>
                                        )}
                                        {done && item.key === 'creditCheckOk' && creditDecisionResult?.finalVerdict && (
                                            <span className="text-[10px] text-emerald-700 mt-1 block leading-relaxed">
                                                {verdictLabel(creditDecisionResult.finalVerdict)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {!done && setActiveTab && item.tab && (
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab(item.tab)}
                                                className="text-[8px] text-indigo-600 font-semibold hover:underline uppercase tracking-wide"
                                            >
                                                Open
                                            </button>
                                        )}
                                        {done ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                        ) : (
                                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {needsGatesForStatus && pendingGates.length > 0 && !skipGatesForSanctionedOffer && admin?.role !== 'super_admin' && (
                        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-100 text-[10px] text-amber-900 leading-relaxed">
                            <p className="font-semibold uppercase tracking-wide text-[9px] mb-1">Before you can save this decision</p>
                            <p>Complete {pendingGates.length} pending step{pendingGates.length > 1 ? 's' : ''}: {pendingGates.map((g) => g.label).join(', ')}.</p>
                        </div>
                    )}

                    {(error || message) && (
                        <div className={cn("mt-6 p-3 rounded-lg text-[11px] font-normal border leading-relaxed", error ? "bg-red-50 border-red-100 text-red-700" : "bg-emerald-50 border-emerald-100 text-emerald-600")}>
                            {error || message}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-900 rounded-lg text-white">
                     <p className="text-[10px] font-medium uppercase tracking-wide opacity-50 mb-2">Operations Note</p>
                     <p className="text-xs font-normal leading-relaxed opacity-80">
                        {operationsNote}
                     </p>
                </div>

                {/* Blacklist Customer Button */}
                {!['rejected', 'closed', 'cancelled'].includes(loanApp.application_status) && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                            <ShieldBan className="w-4 h-4 text-red-500" />
                            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-red-700">Blacklist Customer</p>
                        </div>
                        <p className="text-[10px] text-red-600 font-normal leading-relaxed">
                            This will permanently block this customer's PAN & mobile from future applications. {!['disbursed', 'defaulted', 'closed'].includes(loanApp.application_status) ? 'The current application will be auto-rejected.' : 'The active/disbursed loan status will not be affected.'}
                        </p>
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            className="w-full rounded-lg h-9 text-[10px] uppercase tracking-widest font-medium bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200"
                            onClick={() => setShowBlacklistDialog(true)}
                        >
                            <ShieldBan className="w-3 h-3 mr-2" /> Blacklist This Customer
                        </Button>
                    </div>
                )}
            </div>

            {/* Right Column: Decisions & CAM */}
            <div className="lg:col-span-12 xl:col-span-8">
                {isReadOnly || (!awaitingRevision && ['offer_sent', 'esign_completed', 'mandate_pending', 'payment_pending'].includes(loanApp.application_status)) ? (
                    <div className="bg-emerald-50/50 border border-emerald-100 p-8 rounded-lg flex flex-col items-center text-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-4" />
                        <h4 className="text-sm font-medium text-emerald-900 uppercase tracking-widest mb-2">
                            {loanApp.application_status === 'offer_sent' ? 'Offer sent' : loanApp.application_status.replace(/_/g, ' ')}
                        </h4>
                        <p className="text-xs text-emerald-700 font-normal max-w-md leading-relaxed">
                            {loanApp.application_status === 'offer_sent'
                                ? 'Sanction letter email was sent. Waiting for the customer to accept. No further action needed here — use Back to return to the applications list.'
                                : 'This step is complete. Manual status changes are locked to protect the audit trail.'}
                        </p>
                        {loanApp.application_status === 'esign_completed' && (
                            <Button onClick={() => setActiveTab('disbursement')} className="mt-6 rounded-lg bg-emerald-600">
                                Go to Payout
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-5">
                        
                        {!gates.breOk && (
                             <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-indigo-500" />
                                    <div>
                                        <p className="text-xs font-medium text-indigo-900">KYC risk checklist has not run</p>
                                        <p className="text-[10px] text-indigo-600">
                                            Runs after PAN, Aadhaar, bank, and selfie — or generate now. This is not the CRIF/AA credit check.
                                        </p>
                                    </div>
                                </div>
                                <Button size="sm" className="rounded-lg h-8 bg-indigo-600" onClick={handleTriggerEvaluation} disabled={loadingBRE}>
                                    {loadingBRE ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'GENERATE'}
                                </Button>
                             </div>
                        )}

                        {(creditDecisionResult?.awaitingAaConsent ||
                            String(creditDecisionResult?.finalVerdict || '').toUpperCase() ===
                                'AWAITING_AA_CONSENT') && (
                            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-medium text-amber-900">
                                        Credit check is waiting for bank (AA) consent
                                    </p>
                                    <p className="text-[10px] text-amber-800 mt-0.5 leading-relaxed">
                                        Share the Digitap bank link, then resume credit check before Recommend.
                                        Recommend stays blocked until the credit check finishes.
                                    </p>
                                </div>
                            </div>
                        )}

                        {awaitingRevision && (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-medium text-amber-900">Customer requested changes to the offer</p>
                                        <p className="text-[10px] text-amber-800 leading-relaxed">
                                            Accept is paused for the customer until you re-send the offer.
                                            {revisionInfo && ` Request ${revisionInfo.used} of ${revisionInfo.maxRequests}.`}
                                            {pendingRevision?.createdAt &&
                                                ` Sent ${new Date(pendingRevision.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}.`}
                                        </p>
                                    </div>
                                </div>
                                {pendingRevision ? (
                                    <>
                                        <DetailTable title="Requested vs offered" compact>
                                            <DetailRow label="Amount" compact>
                                                {pendingRevision.requestedAmount != null
                                                    ? `₹${Number(pendingRevision.requestedAmount).toLocaleString('en-IN')} (offered ₹${Number(pendingRevision.offerSnapshot?.approved_amount ?? loanApp?.approved_amount ?? 0).toLocaleString('en-IN')})`
                                                    : 'No change'}
                                            </DetailRow>
                                            <DetailRow label="Tenure" compact>
                                                {pendingRevision.requestedTenureDays != null
                                                    ? `${pendingRevision.requestedTenureDays} days${pendingRevision.requestedRepaymentDate ? ` · repay by ${new Date(`${pendingRevision.requestedRepaymentDate}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}` : ''} (offered ${pendingRevision.offerSnapshot?.tenure_days ?? loanApp?.tenure_days ?? '—'} days)`
                                                    : 'No change'}
                                            </DetailRow>
                                            <DetailRow label="Customer note" compact>
                                                {pendingRevision.customerNote || '—'}
                                            </DetailRow>
                                        </DetailTable>
                                        {(pendingRevision.requestedAmount != null || pendingRevision.requestedTenureDays != null) && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="rounded-lg h-8 text-xs border-amber-300 text-amber-900 hover:bg-amber-100"
                                                onClick={() => {
                                                    let tenure = pendingRevision.requestedTenureDays;
                                                    if (pendingRevision.requestedRepaymentDate) {
                                                        const istToday = new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
                                                        const days = Math.round(
                                                            (Date.parse(`${pendingRevision.requestedRepaymentDate}T00:00:00Z`) -
                                                                Date.parse(`${istToday}T00:00:00Z`)) /
                                                                (24 * 60 * 60 * 1000)
                                                        );
                                                        if (days > 0) tenure = days;
                                                    }
                                                    setTenureClampedFrom(null);
                                                    setStatusUpdate((p) => ({
                                                        ...p,
                                                        status: 'offer_sent',
                                                        approvedAmount:
                                                            pendingRevision.requestedAmount != null
                                                                ? String(pendingRevision.requestedAmount)
                                                                : p.approvedAmount,
                                                        tenureDays: tenure != null ? String(tenure) : p.tenureDays,
                                                    }));
                                                }}
                                            >
                                                Use requested values
                                            </Button>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-[10px] text-amber-800">Loading request details…</p>
                                )}
                            </div>
                        )}

                        {alreadySanctioned && !awaitingRevision && (
                            <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-medium text-emerald-900">Sanctioned — confirm product and amount, then send the offer to the customer.</p>
                                    <p className="text-[10px] text-emerald-700 mt-0.5">LAN is already issued. Approve again is not needed here.</p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                             <h4 className="text-sm font-medium text-slate-800">
                                {alreadySanctioned ? 'Send offer' : 'Submit Final Result'}
                             </h4>
                             {gates.breOk && !alreadySanctioned && (
                                 <span className="text-[10px] font-medium text-indigo-500 uppercase tracking-widest">
                                     Use CAM tab for maker-checker notes
                                 </span>
                             )}
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">New Workflow Status</label>
                                    <select
                                        value={statusUpdate.status || ''}
                                        onChange={(e) => setStatusUpdate(p => ({ ...p, status: e.target.value }))}
                                        className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                    >
                                        <option value="" disabled>Select outcome...</option>
                                        {admin?.role === 'credit_manager' ? (
                                            <>
                                                <option value="under_review">Under Review</option>
                                                <option value="pending_pd">Pending PD (personal discussion)</option>
                                                {!hidePositiveOutcomes && (
                                                    <option value="recommended">Recommend Approval (send to underwriter)</option>
                                                )}
                                                <option value="rejected">Reject application</option>
                                            </>
                                        ) : alreadySanctioned ? (
                                            <>
                                                <option value="offer_sent">Send offer to customer</option>
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
                                        <p className="text-[11px] text-slate-500 leading-relaxed px-0.5">
                                            {STATUS_OPTION_HELP[statusUpdate.status]}
                                        </p>
                                    )}
                                </div>

                                {showOfferParams && (
                                     <div className="space-y-3 md:col-span-2 animate-in slide-in-from-right-4">
                                        {isSendOffer && (
                                          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                                            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                                              Loan product
                                            </label>
                                            <select
                                              value={statusUpdate.productId || ''}
                                              onChange={(e) => applyProductSelection(e.target.value)}
                                              disabled={loadingProducts || activeProducts.length === 0}
                                              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                            >
                                              {loadingProducts && <option value="">Loading products…</option>}
                                              {!loadingProducts && activeProducts.length === 0 && (
                                                <option value="">No loan products</option>
                                              )}
                                              {activeProducts.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                  {p.product_name}
                                                  {Number(p.is_default) === 1 ? ' (default)' : ''}
                                                  {Number(p.is_active) !== 1 ? ' (inactive)' : ''}
                                                  {` — ₹${Number(p.min_amount).toLocaleString('en-IN')}–₹${Number(p.max_amount).toLocaleString('en-IN')}`}
                                                </option>
                                              ))}
                                            </select>
                                            {selectedProduct && (
                                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                                Amount ₹{Number(selectedProduct.min_amount).toLocaleString('en-IN')}–₹{Number(selectedProduct.max_amount).toLocaleString('en-IN')}
                                                {' · '}
                                                Tenure {selectedProduct.min_tenure_days}–{selectedProduct.max_tenure_days} days
                                                {' · '}
                                                Rate {selectedProduct.min_interest_rate_daily}–{selectedProduct.max_interest_rate_daily}% / day
                                              </p>
                                            )}
                                          </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                                              {statusUpdate.status === 'recommended' ? 'Recommended Limit (₹)' : 'Approved Limit (₹)'}
                                            </label>
                                            <Input
                                              type="number"
                                              min={selectedProduct?.min_amount}
                                              max={selectedProduct?.max_amount}
                                              className="rounded-lg h-9 border-slate-200 bg-slate-50 text-sm font-mono"
                                              value={statusUpdate.approvedAmount}
                                              onChange={e => setStatusUpdate(p => ({...p, approvedAmount: e.target.value}))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Tenure (days)</label>
                                            <Input
                                              type="number"
                                              min={selectedProduct?.min_tenure_days}
                                              max={selectedProduct?.max_tenure_days}
                                              className="rounded-lg h-9 border-slate-200 bg-slate-50 text-sm font-mono"
                                              value={statusUpdate.tenureDays}
                                              onChange={e => {
                                                setTenureClampedFrom(null);
                                                setStatusUpdate(p => ({...p, tenureDays: e.target.value}));
                                              }}
                                            />
                                            {(() => {
                                              if (!isSendOffer || !selectedProduct) return null;
                                              const min = Number(selectedProduct.min_tenure_days);
                                              const max = Number(selectedProduct.max_tenure_days);
                                              const current = parseInt(statusUpdate.tenureDays, 10);
                                              const outOfRange = Number.isFinite(current) && (current < min || current > max);
                                              const flagged = tenureClampedFrom ?? (outOfRange ? current : null);
                                              if (flagged == null) return null;
                                              return (
                                                <p className="text-[11px] leading-snug text-amber-700">
                                                  Tenure {flagged}d is outside this product&apos;s range ({min}–{max} days). Pick another product or adjust.
                                                </p>
                                              );
                                            })()}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Interest Rate (% Daily)</label>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              min={selectedProduct?.min_interest_rate_daily}
                                              max={selectedProduct?.max_interest_rate_daily}
                                              className="rounded-lg h-9 border-slate-200 bg-slate-50 text-sm font-mono"
                                              value={statusUpdate.interestRateDaily}
                                              onChange={e => setStatusUpdate(p => ({...p, interestRateDaily: e.target.value}))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                                              Next salary date
                                            </label>
                                            {(() => {
                                              const profileSalary =
                                                data?.profile?.next_salary_date ||
                                                userData?.profile?.next_salary_date ||
                                                userData?.next_salary_date ||
                                                null;
                                              const salaryLabel = profileSalary
                                                ? new Date(profileSalary).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                  })
                                                : 'Not set';
                                              if (editingSalaryDate) {
                                                return (
                                                  <div className="flex items-center gap-1.5">
                                                    <Input
                                                      type="date"
                                                      className="rounded-lg h-9 border-slate-200 bg-white text-sm font-mono flex-1"
                                                      value={newSalaryDate}
                                                      onChange={(e) => setNewSalaryDate(e.target.value)}
                                                    />
                                                    <Button
                                                      type="button"
                                                      size="sm"
                                                      className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px]"
                                                      onClick={handleUpdateSalaryDate}
                                                      disabled={updating || !newSalaryDate}
                                                    >
                                                      Save
                                                    </Button>
                                                    <Button
                                                      type="button"
                                                      size="sm"
                                                      variant="ghost"
                                                      className="h-9 px-2 text-[10px] text-slate-500"
                                                      onClick={() => setEditingSalaryDate(false)}
                                                    >
                                                      Cancel
                                                    </Button>
                                                  </div>
                                                );
                                              }
                                              return (
                                                <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-slate-50">
                                                  <span className="text-sm font-mono text-slate-800 flex-1 truncate">
                                                    {salaryLabel}
                                                  </span>
                                                  {!isReadOnly && (
                                                    <button
                                                      type="button"
                                                      className="text-[10px] font-semibold text-indigo-600 hover:underline uppercase tracking-wide shrink-0"
                                                      onClick={() => {
                                                        setEditingSalaryDate(true);
                                                        setNewSalaryDate(
                                                          profileSalary
                                                            ? new Date(profileSalary).toISOString().split('T')[0]
                                                            : ''
                                                        );
                                                      }}
                                                    >
                                                      Edit
                                                    </button>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                            <p className="text-[10px] text-slate-400 leading-snug">
                                              Correct if the customer entered the wrong payday.
                                            </p>
                                        </div>
                                        </div>

                                        {isSendOffer && offerFees.length > 0 && (
                                          <div className="rounded-lg border border-slate-200 overflow-hidden">
                                            <div className="bg-slate-100 px-3 py-2 text-[10px] font-medium text-slate-600 uppercase tracking-wide">
                                              Fee structure (editable within min/max)
                                            </div>
                                            <div className="divide-y divide-slate-100">
                                              {offerFees.map((fee) => (
                                                <div key={fee.fee_code} className="grid grid-cols-12 gap-2 items-center px-3 py-2 text-xs">
                                                  <div className="col-span-5">
                                                    <div className="font-medium text-slate-800">
                                                      {fee.fee_code === 'process_fee' ? 'Platform Fee' : fee.fee_name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-mono">{fee.fee_code}</div>
                                                  </div>
                                                  <div className="col-span-3 text-[10px] text-slate-500 text-center">
                                                    {fee.min_value}% – {fee.max_value}%
                                                  </div>
                                                  <div className="col-span-4">
                                                    <Input
                                                      type="number"
                                                      step="0.1"
                                                      min={fee.min_value}
                                                      max={fee.max_value}
                                                      className="h-8 text-center text-sm font-mono border-slate-200"
                                                      value={statusUpdate.feeBreakdown?.[fee.fee_code] ?? fee.default_value}
                                                      onChange={(e) => updateFeePercent(fee.fee_code, e.target.value)}
                                                    />
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {statusUpdate.approvedAmount > 0 && (
                                            (() => {
                                                    const P = parseFloat(statusUpdate.approvedAmount || 0);
                                                    const tenure = parseInt(statusUpdate.tenureDays || loanApp.tenure_days || 15, 10);
                                                    const rate = parseFloat(statusUpdate.interestRateDaily || loanApp.applied_interest_rate_daily || 1);
                                                    const totalInterest = (P * rate * tenure) / 100;
                                                    const totalRepayment = P + totalInterest;
                                                    // Matches the backend: today in IST + tenure days
                                                    const istToday = new Date(Date.now() + 330 * 60 * 1000);
                                                    const repaymentDate = Number.isFinite(tenure)
                                                      ? new Date(Date.UTC(
                                                          istToday.getUTCFullYear(),
                                                          istToday.getUTCMonth(),
                                                          istToday.getUTCDate() + tenure
                                                        )).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
                                                      : '—';
                                                    const money = (n) =>
                                                      `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                                                    const feeRows = [];
                                                    const feesSource = offerFees.length
                                                      ? offerFees
                                                      : filterActivatableProductFees(productDetails?.fees);
                                                    if (feesSource?.length) {
                                                        feesSource.forEach(fee => {
                                                            let amount = 0;
                                                            let label = fee.fee_code === 'process_fee' ? 'Platform Fee' : fee.fee_name;
                                                            const override = statusUpdate.feeBreakdown?.[fee.fee_code];
                                                            if (fee.fee_type === 'percentage') {
                                                                const val = override != null ? parseFloat(override) : parseFloat(fee.default_value);
                                                                amount = (P * val) / 100;
                                                                label += ` (${val}%)`;
                                                            } else {
                                                                amount = override != null ? parseFloat(override) : parseFloat(fee.default_value);
                                                            }
                                                            if (amount > 0) feeRows.push({ label, amount });
                                                        });
                                                    } else {
                                                        feeRows.push({ label: 'Platform Fee (10%)', amount: (P * 10) / 100 });
                                                    }

                                                    const subTotalFees = feeRows.reduce((sum, f) => sum + f.amount, 0);
                                                    const gstAmount = subTotalFees * 0.18;
                                                    const totalDeductions = subTotalFees + gstAmount;
                                                    const disbursalAmount = P - totalDeductions;

                                                    return (
                                                      <div className="md:col-span-2 grid grid-cols-1 xl:grid-cols-2 gap-2">
                                                        <DetailTable title="Loan breakdown preview" compact>
                                                          <DetailRow label="Principal amount" mono compact align="right" labelWidth="w-[58%]">
                                                            {money(P)}
                                                          </DetailRow>
                                                          {feeRows.map((f, idx) => (
                                                            <DetailRow key={idx} label={f.label} mono compact align="right" labelWidth="w-[58%]">
                                                              <span className="text-rose-700">− {money(f.amount)}</span>
                                                            </DetailRow>
                                                          ))}
                                                          <DetailRow label="GST (18%)" mono compact align="right" labelWidth="w-[58%]">
                                                            <span className="text-rose-700">− {money(gstAmount)}</span>
                                                          </DetailRow>
                                                          <DetailRow label="Total deductions" mono compact align="right" labelWidth="w-[58%]">
                                                            <span className="text-rose-800">− {money(totalDeductions)}</span>
                                                          </DetailRow>
                                                          <DetailRow label="Net disbursal" mono compact align="right" labelWidth="w-[58%]">
                                                            <span className="text-emerald-700">{money(disbursalAmount)}</span>
                                                          </DetailRow>
                                                        </DetailTable>

                                                        <DetailTable title="Repayment sheet" compact>
                                                          <DetailRow label="Tenure" mono compact align="right" labelWidth="w-[58%]">
                                                            {`${tenure} days`}
                                                          </DetailRow>
                                                          <DetailRow label="Repayment date" mono compact align="right" labelWidth="w-[58%]">
                                                            <span className="font-semibold text-slate-900">{repaymentDate}</span>
                                                          </DetailRow>
                                                          <DetailRow label="Daily interest" mono compact align="right" labelWidth="w-[58%]">
                                                            {`${Number(rate).toFixed(3)}%`}
                                                          </DetailRow>
                                                          <DetailRow label={`Interest (${Number(rate).toFixed(3)}% × ${tenure}d)`} mono compact align="right" labelWidth="w-[58%]">
                                                            <span className="text-slate-800">+ {money(totalInterest)}</span>
                                                          </DetailRow>
                                                          <DetailRow label="Total repayment" mono compact align="right" labelWidth="w-[58%]">
                                                            <span className="text-[#222222]">{money(totalRepayment)}</span>
                                                          </DetailRow>
                                                          <DetailRow label="Note" compact emphasize={false} labelWidth="w-[58%]">
                                                            <span className="text-[10px] font-normal text-slate-500 leading-snug">
                                                              Principal + interest after disbursal. Fees deducted upfront from net disbursal.
                                                            </span>
                                                          </DetailRow>
                                                        </DetailTable>
                                                      </div>
                                                    );
                                            })()
                                        )}
                                    </div>
                                )}
                            </div>

                            {statusUpdate.status && statusUpdate.status !== 'rejected' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Message or Reason</label>
                                    <Textarea className="rounded-lg min-h-[72px] border-slate-200 bg-slate-50 text-xs p-3" value={statusUpdate.remarks} onChange={e => setStatusUpdate(p => ({...p, remarks: e.target.value}))} placeholder="Write something here for the customer..." />
                                </div>
                            )}

                            {statusUpdate.status === 'rejected' && (
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    You will choose rejection reasons and confirm before the application is closed.
                                </p>
                            )}

                            {(error || message) && (
                                <Alert
                                    id="decision-result"
                                    variant={error ? 'destructive' : 'default'}
                                    className="py-2.5 scroll-mt-24"
                                >
                                    <AlertDescription className="text-xs">{error || message}</AlertDescription>
                                </Alert>
                            )}

                            <Button id="decision-submit" type="submit" className="w-full h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs transition-shadow" disabled={updating || !statusUpdate.status || (gatesBlockSave && admin?.role !== 'super_admin')}>
                                {updating ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : admin?.role === 'super_admin' ? (
                                    <ShieldCheck className="w-4 h-4 mr-2 text-amber-400" />
                                ) : isSendOffer ? (
                                    <Mail className="w-4 h-4 mr-2" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                {admin?.role === 'super_admin'
                                    ? 'DIRECT OVERRIDE & SAVE'
                                    : isSendOffer
                                      ? 'SEND OFFER TO CUSTOMER'
                                      : statusUpdate.status === 'rejected'
                                        ? 'REVIEW & REJECT'
                                      : 'SAVE DECISION'}
                            </Button>
                        </form>
                    </div>
                )}
            </div>
        </div>

        {/* Super Admin override confirmation */}
        <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
            <DialogContent className="sm:max-w-md rounded-lg p-5 border border-amber-200">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold text-amber-900 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5" /> Emergency override
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-600 mt-2">
                        Verification checklist is incomplete. Saving without KYC/BRE is only for emergencies and is logged.
                    </DialogDescription>
                </DialogHeader>
                <ul className="text-xs text-amber-900 space-y-1 py-2 list-disc list-inside">
                    {pendingGates.map((g) => (
                        <li key={g.key}>{g.label}</li>
                    ))}
                </ul>
                <DialogFooter className="gap-2 mt-2">
                    <Button variant="ghost" onClick={() => setShowOverrideDialog(false)} className="h-9 text-xs">Cancel</Button>
                    <Button onClick={confirmOverrideSubmit} disabled={updating} className="h-9 bg-amber-600 hover:bg-amber-700 text-white text-xs">
                        Confirm override & save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Blacklist Confirmation Dialog */}
        <Dialog open={showBlacklistDialog} onOpenChange={setShowBlacklistDialog}>
            <DialogContent className="sm:max-w-md bg-white rounded-lg border border-slate-200 p-5">
                <DialogHeader>
                    <DialogTitle className="text-lg font-medium text-red-700 flex items-center gap-2">
                        <ShieldBan className="w-5 h-5" /> Blacklist Customer
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 mt-2">
                        This action will permanently block this customer. 
                        They will not be able to apply for any future loans. {!['disbursed', 'defaulted', 'closed'].includes(loanApp.application_status) ? 'The current application will be automatically rejected.' : 'The active/disbursed loan status will not be affected.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                        <p className="text-[10px] text-red-600 font-medium uppercase tracking-widest mb-1">Customer Details</p>
                        <p className="text-xs text-red-800">{userData?.full_name || 'Unknown'} • {userData?.mobile || userData?.profile?.mobile || 'N/A'}</p>
                        <p className="text-[10px] text-red-500 mt-1">PAN: {userData?.profile?.pancard || userData?.pancard || 'N/A'}</p>
                    </div>
                    <div className="space-y-2">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest pl-1">Reason (Required)</span>
                        <Textarea 
                            placeholder="Why are you blacklisting this customer? e.g. Fraud, fake documents, defaulter..." 
                            value={blacklistReason}
                            onChange={(e) => setBlacklistReason(e.target.value)}
                            className="min-h-[100px] rounded-lg border-red-100 bg-red-50/30 text-sm font-normal resize-none focus:ring-red-200"
                        />
                    </div>
                </div>
                <DialogFooter className="mt-6 gap-2">
                    <Button variant="ghost" onClick={() => setShowBlacklistDialog(false)} className="rounded-lg text-slate-400 text-xs font-medium">Cancel</Button>
                    <Button 
                        variant="destructive" 
                        onClick={handleBlacklistCustomer} 
                        disabled={blacklisting || !blacklistReason.trim()}
                        className="rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs px-8 h-11"
                    >
                        {blacklisting ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <ShieldBan className="w-4 h-4 mr-2" />}
                        {blacklisting ? "Processing..." : "Confirm Blacklist"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <RejectApplicationDialog
            open={showRejectDialog}
            onOpenChange={setShowRejectDialog}
            onConfirm={handleRejectConfirm}
            updating={updating}
        />
        </>
    );
}
