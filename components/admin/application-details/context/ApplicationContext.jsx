import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from '@/lib/router';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { adminAPI } from '@/lib/api';
import { isStrictEmail } from '@/lib/apiErrorMessage';
import { offerAPI } from '@/lib/api/offer';
import {
    computeStaffVerificationGates,
    formatStaffGateError,
    getRecommendBlockers,
} from '@/lib/utils/staffVerificationGates';
import CrifMissingFieldsDialog from '../CrifMissingFieldsDialog';
import { renderDocumentThumbnail } from './DocumentThumbnail';
import { useApplicationBootstrap } from './hooks/useApplicationBootstrap';
import { useApplicationBre } from './hooks/useApplicationBre';
import { useApplicationCreditDecision } from './hooks/useApplicationCreditDecision';
import { useApplicationBureauSummary } from './hooks/useApplicationBureauSummary';
import { useApplicationBankReport } from './hooks/useApplicationBankReport';
import { useApplicationKyc } from './hooks/useApplicationKyc';
import { useApplicationDocuments } from './hooks/useApplicationDocuments';
import { filterActivatableProductFees } from '@/lib/utils/feeBreakdown';
import { SECTION_META, normalizeSectionId } from '../shell/sectionConfig';

const ApplicationContext = createContext();
const TERMINAL_APP_STATUSES = ['disbursed', 'closed', 'rejected', 'offer_rejected'];

// eslint-disable-next-line react-refresh/only-export-components
export const useApplicationContext = () => {
    const context = useContext(ApplicationContext);
    if (!context) {
        throw new Error('useApplicationContext must be used within an ApplicationProvider');
    }
    return context;
};

export const ApplicationProvider = ({
    children,
    applicationId,
    isOpen,
    onClose,
    onUpdate,
    defaultTab,
    targetEmiId,
    isRepaymentReview = false,
    persistTabInUrl = false,
}) => {
    const { admin } = useAdminAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [data, setData] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [verifyingEmiId, setVerifyingEmiId] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [statusUpdate, setStatusUpdate] = useState({
        status: '',
        approvedAmount: '',
        tenureMonths: '',
        tenureDays: '',
        interestRate: '',
        interestRateDaily: '1',
        rejectionReason: '',
        remarks: '',
        productId: '',
        feeBreakdown: {},
    });
    const [repayments, setRepayments] = useState([]);
    const [partPayments, setPartPayments] = useState([]);
    const [loadingRepayments, setLoadingRepayments] = useState(false);
    const [creditDecisionResult, setCreditDecisionResult] = useState(null);
    const [productDetails, setProductDetails] = useState(null);
    const [esignDocs, setEsignDocs] = useState({ agreement: '', sanctionLetter: '' });
    const [uploading, setUploading] = useState(false);
    const [uploadingKey, setUploadingKey] = useState(null);
    const [showDisburseConfirm, setShowDisburseConfirm] = useState(false);
    const [punchForm, setPunchForm] = useState({
        bankReferenceNo: '',
        disbursalDate: '',
        remark: '',
    });
    const [uploadingType, setUploadingType] = useState(null);
    const resolveTabId = useCallback((raw) => {
        const id = normalizeSectionId(String(raw || '').trim());
        return id && SECTION_META[id] ? id : null;
    }, []);
    const urlTab = persistTabInUrl ? resolveTabId(searchParams.get('tab')) : null;
    const [activeTab, setActiveTabState] = useState(
        () => urlTab || resolveTabId(defaultTab) || 'overview'
    );
    const setActiveTab = useCallback(
        (nextTab) => {
            const resolved = resolveTabId(nextTab) || nextTab;
            setActiveTabState(resolved);
            if (!persistTabInUrl || !resolved) return;
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    next.set('tab', resolved);
                    return next;
                },
                { replace: true }
            );
        },
        [persistTabInUrl, resolveTabId, setSearchParams]
    );

    useEffect(() => {
        if (!persistTabInUrl) return;
        const fromUrl = resolveTabId(searchParams.get('tab'));
        if (fromUrl) {
            setActiveTabState((prev) => (prev === fromUrl ? prev : fromUrl));
        }
    }, [persistTabInUrl, resolveTabId, searchParams]);

    const [editingSalaryDate, setEditingSalaryDate] = useState(false);
    const [newSalaryDate, setNewSalaryDate] = useState('');
    const [editingRepaymentId, setEditingRepaymentId] = useState(null);
    const [newDueDate, setNewDueDate] = useState('');
    const [newRepaymentStatus, setNewRepaymentStatus] = useState('');
    const [downloadingDoc, setDownloadingDoc] = useState(null);
    const [downloadingCAM, setDownloadingCAM] = useState(false);
    const [prepaymentData, setPrepaymentData] = useState(null);
    const [prepaymentDate, setPrepaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [isEsignProcessing, setIsEsignProcessing] = useState(false);
    const [selfieCheckFeedback, setSelfieCheckFeedback] = useState(null);

    const [sendingOfficeOTP, setSendingOfficeOTP] = useState(false);
    const [verifyingOfficeOTP, setVerifyingOfficeOTP] = useState(false);
    const [officeOTPStep, setOfficeOTPStep] = useState('input');
    const [tempOfficeEmail, setTempOfficeEmail] = useState('');
    const [officeOTP, setOfficeOTP] = useState('');

    const [callLogs, setCallLogs] = useState([]);
    const [loadingCallLogs, setLoadingCallLogs] = useState(false);
    const callLogsLoadedForApp = useRef(null);
    // Opens the call logs sheet (add call + history)
    const [isLogCallOpen, setIsLogCallOpen] = useState(false);

    const {
        application: loanApp,
        selfie,
        residenceProofs,
        kyc_details,
        bankStatements,
        references,
        bankDetails,
        user,
        history,
    } = data || {};

    const bre = useApplicationBre({
        applicationId,
        loanApp,
        setError,
        setMessage,
        dataBreSummary: data?.breSummary,
    });
    const bureau = useApplicationBureauSummary({ applicationId, loanApp });
    const bankReportState = useApplicationBankReport({ applicationId, loanApp });
    const bootstrap = useApplicationBootstrap({
        applicationId,
        isRepaymentReview,
        activeTab,
        setData,
        setError,
        setMessage,
        setStatusUpdate,
        repayments,
        setRepayments,
        setPartPayments,
        setPrepaymentData,
        setCreditDecisionResult,
        setLatestBreEvaluation: bre.setLatestBreEvaluation,
        setHasFetchedBre: bre.setHasFetchedBre,
        setSelfieCheckFeedback,
        setIsEsignProcessing,
        setLoadingRepayments,
        prepaymentDate,
        loanAppApplicationStatus: loanApp?.application_status,
    });
    const credit = useApplicationCreditDecision({
        applicationId,
        loanApp,
        setCreditDecisionResult,
        fetchBureauSummary: bureau.fetchBureauSummary,
        invalidateBureauSummary: bureau.invalidateBureauSummary,
        fetchApplication: bootstrap.fetchApplication,
        onUpdate,
    });
    const digio = useApplicationKyc({
        applicationId,
        loanApp,
        admin,
        setData,
        setError,
        setMessage,
        setUpdating,
        fetchApplication: bootstrap.fetchApplication,
        fetchKycSection: bootstrap.fetchKycSection,
        fetchBankSection: bootstrap.fetchBankSection,
        applyBreAutoFromStaffAction: bre.applyBreAutoFromStaffAction,
        onUpdate,
        isEsignProcessing,
        setIsEsignProcessing,
        selfieCheckFeedback,
        setSelfieCheckFeedback,
    });
    const documents = useApplicationDocuments({
        applicationId,
        loanApp,
        data,
        esignDocs,
        sectionsLoadedRef: bootstrap.sectionsLoadedRef,
        fetchDocumentsSection: bootstrap.fetchDocumentsSection,
        fetchApplication: bootstrap.fetchApplication,
        setData,
        setError,
        setMessage,
        setUpdating,
        setUploading,
        setUploadingKey,
        setUploadingType,
        setDownloadingDoc,
        setDownloadingCAM,
        setActiveTab,
        onUpdate,
    });

    const isEsignCompleted = useMemo(() => {
        if (!loanApp) return false;
        const s = String(loanApp.application_status || '').toLowerCase();
        const esignStatus = String(loanApp.esign_status || '').toLowerCase();
        return (
            esignStatus === 'completed' ||
            Boolean(loanApp.esign_completed_at) ||
            ['esign_completed', 'mandate_pending', 'payment_pending', 'disbursed', 'closed', 'defaulted'].includes(s)
        );
    }, [loanApp]);

    const isMandateCompleted = useMemo(() => {
        if (!loanApp) return false;
        const ms = String(loanApp.mandate_status || '').toLowerCase();
        const regStatus = String(
            data?.mandateRegistration?.status ||
            data?.mandateRegistration?.registration_mandate_status ||
            ''
        ).toLowerCase();
        const s = String(loanApp.application_status || '').toLowerCase();
        return (
            ['registered', 'completed', 'active', 'success'].includes(ms) ||
            ['registered', 'completed', 'active', 'success'].includes(regStatus) ||
            ['mandate_completed', 'payment_pending', 'disbursed', 'closed', 'defaulted'].includes(s)
        );
    }, [loanApp, data?.mandateRegistration]);

    const isReadOnly = useMemo(
        () => (loanApp ? (TERMINAL_APP_STATUSES.includes(loanApp.application_status) || isEsignCompleted || isMandateCompleted) : false),
        [loanApp, isEsignCompleted, isMandateCompleted]
    );
    const isClosed = useMemo(
        () => (loanApp ? TERMINAL_APP_STATUSES.includes(loanApp.application_status) : false),
        [loanApp]
    );
    const userData = useMemo(() => {
        if (!loanApp) return null;
        return {
            ...loanApp,
            ...(user || {}),
            profile: data?.profile || {},
            full_name: data?.profile?.full_name || user?.full_name || loanApp?.full_name || loanApp?.profile_full_name,
            pancard: data?.profile?.pancard || user?.pancard,
            personal_email: data?.profile?.personal_email || user?.personal_email,
            mobile: user?.mobile || loanApp?.mobile,
            email: user?.email || loanApp?.email,
            bankDetails: bankDetails || data?.bankDetails || {},
            kyc_details: kyc_details || data?.kyc_details || {},
        };
    }, [loanApp, user, data, bankDetails, kyc_details]);
    const mandateRegistration = useMemo(() => data?.mandateRegistration || null, [data]);

    const fetchCallLogs = useCallback(async (force = false) => {
        if (!applicationId) return;
        if (!force && callLogsLoadedForApp.current === applicationId) return;
        setLoadingCallLogs(true);
        try {
            const resp = await adminAPI.getCallLogs(applicationId, { force });
            if (resp.status === 1) {
                setCallLogs(resp.data?.logs || resp.data || []);
                callLogsLoadedForApp.current = applicationId;
            }
        } catch (err) {
            console.error('Failed to fetch call logs:', err);
            setCallLogs([]);
        } finally {
            setLoadingCallLogs(false);
        }
    }, [applicationId]);

    useEffect(() => {
        callLogsLoadedForApp.current = null;
        setCallLogs([]);
    }, [applicationId]);

    useEffect(() => {
        if (!applicationId || !data?.application?.id) return;

        // Repayment review sheet only needs EMIs — skip documents warmer and other section fetches
        if (isRepaymentReview) {
            return undefined;
        }

        if (activeTab === 'repayments' && !isRepaymentReview) {
            Promise.all([bootstrap.fetchRepayments(false), bootstrap.fetchPrepayment()]).catch(() => {});
        } else if (activeTab === 'call_logs') {
            fetchCallLogs(false);
        } else if (activeTab === 'bre') {
            bre.fetchBREDetails(false);
        } else if (activeTab === 'documents') {
            bootstrap.fetchDocumentsSection(false);
        } else if (activeTab === 'kyc' || activeTab === 'digio_kyc') {
            Promise.all([bootstrap.fetchKycSection(false), bootstrap.fetchBankSection(false)]).catch(() => {});
        } else if (activeTab === 'breakdown' || activeTab === 'disbursement') {
            if (activeTab === 'disbursement') {
                Promise.all([bootstrap.fetchBankSection(false), bootstrap.fetchDocumentsSection(false)]).catch(() => {});
            } else {
                bootstrap.fetchBankSection(false);
            }
        } else if (activeTab === 'aa') {
            bankReportState.fetchBankReport({ force: false });
        } else if (activeTab === 'crif') {
            Promise.all([
                bureau.fetchBureauSummary({ force: false }),
                bureau.fetchBureauDetail({ force: false }),
            ]).catch(() => {});
        } else if (activeTab === 'journey') {
            bootstrap.fetchJourneySection(false);
        } else if (activeTab === 'loan_account') {
            bootstrap.fetchLoanAccountView(false);
        }
    }, [
        activeTab,
        applicationId,
        data?.application?.id,
        bootstrap.bootstrapEpoch,
        isRepaymentReview,
        bootstrap.fetchRepayments,
        bootstrap.fetchPrepayment,
        fetchCallLogs,
        bre.fetchBREDetails,
        bootstrap.fetchDocumentsSection,
        bootstrap.fetchKycSection,
        bootstrap.fetchBankSection,
        bootstrap.fetchJourneySection,
        bootstrap.fetchLoanAccountView,
        bankReportState.fetchBankReport,
        bureau.fetchBureauSummary,
        bureau.fetchBureauDetail,
    ]);

    useEffect(() => {
        if (data?.application) setProductDetails(data.application);
    }, [data?.application]);

    const callLogAppRef =
        loanApp?.id ||
        bootstrap.resolvedInternalIdRef.current ||
        loanApp?.application_number ||
        applicationId;

    /** Called by the call logs sheet after it saves a call. */
    const handleCallLogged = useCallback(async () => {
        await fetchCallLogs(true);
        if (onUpdate) onUpdate();
    }, [fetchCallLogs, onUpdate]);

    const handleVideoVerification = async (isVerified, reason = '') => {
        setUpdating(true);
        setError('');
        setMessage('');
        try {
            const isApproved = isVerified === true || isVerified === 'approved' || isVerified === 'accept';
            const payload = {
                action: isApproved ? 'accept' : 'reject',
                comment: isApproved ? 'Video verification successful.' : (reason || 'Video declaration rejected upon verification review.'),
            };
            const response = await adminAPI.verifyVideoDeclaration(applicationId, payload);
            if (response.status === 1) {
                setMessage(isApproved ? 'Video verified successfully. Switching to E-Sign...' : 'Video declaration rejected.');
                bootstrap.fetchApplication(true);
                if (isVerified) {
                    setActiveTab('kyc');
                    setTimeout(() => {
                        const sheetContent = document.querySelector('[data-radix-scroll-area-viewport], .overflow-y-auto');
                        if (sheetContent) sheetContent.scrollTo({ top: 0, behavior: 'smooth' });
                    }, 200);
                }
                if (onUpdate) onUpdate();
            } else {
                setError(response.message || 'Failed to verify video');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Action failed');
        } finally {
            setUpdating(false);
        }
    };

    const customerUserId = loanApp?.user_id || user?.id;

    const handleSendOfficeOTP = async (email) => {
        const normalized = String(email || '').trim().toLowerCase();
        if (!normalized) {
            setError('Office email is required');
            return { ok: false, message: 'Office email is required' };
        }
        if (!isStrictEmail(normalized)) {
            setError('Please enter a valid office email address.');
            return { ok: false, message: 'Please enter a valid office email address.' };
        }
        setSendingOfficeOTP(true);
        setError('');
        try {
            const resp = await adminAPI.sendOfficeEmailOTP(customerUserId, { officeEmail: normalized });
            if (resp.status === 1) {
                setOfficeOTPStep('otp');
                setTempOfficeEmail(resp.data?.officeEmail || normalized);
                setMessage(resp.message || 'OTP sent to office email');
                return { ok: true, message: resp.message || 'OTP sent to office email' };
            }
            const failMessage = resp.message || 'Failed to send OTP';
            setError(failMessage);
            return { ok: false, message: failMessage };
        } catch (err) {
            const failMessage = err.message || 'Failed to send OTP';
            setError(failMessage);
            return { ok: false, message: failMessage };
        } finally {
            setSendingOfficeOTP(false);
        }
    };

    const handleVerifyOfficeOTP = async () => {
        if (!officeOTP || String(officeOTP).trim().length !== 6) {
            setError('Please enter the 6-digit OTP sent to the office email.');
            return { ok: false };
        }
        const officeEmail = String(tempOfficeEmail || '').trim().toLowerCase();
        if (!officeEmail) {
            setError('Office email is required');
            return { ok: false };
        }
        setVerifyingOfficeOTP(true);
        setError('');
        try {
            const resp = await adminAPI.verifyOfficeEmailOTP(customerUserId, {
                otp: String(officeOTP).trim(),
                officeEmail,
            });
            if (resp.status === 1) {
                const verifiedEmail = tempOfficeEmail;
                setOfficeOTPStep('input');
                setMessage(resp.message || 'Office email verified successfully');
                setOfficeOTP('');
                setData((prev) => ({
                    ...prev,
                    profile: {
                        ...(prev?.profile || {}),
                        office_email: verifiedEmail || prev?.profile?.office_email,
                        office_email_verified: 1,
                    },
                }));
                bootstrap.fetchApplication(true);
                return { ok: true };
            }
            const failMessage = resp.message || 'Failed to verify OTP';
            setError(failMessage);
            return { ok: false, message: failMessage };
        } catch (err) {
            const failMessage = err.message || 'Failed to verify OTP';
            setError(failMessage);
            return { ok: false, message: failMessage };
        } finally {
            setVerifyingOfficeOTP(false);
        }
    };

    const handleVerifyRepayment = async (repayId, status, reason = '') => {
        try {
            setVerifyingEmiId(repayId);
            const resp = await adminAPI.verifyRepayment(repayId, { status, reason });
            if (resp.status === 1) {
                setMessage(`Repayment ${status === 'paid' ? 'approved' : 'rejected'} successfully`);
                if (isRepaymentReview) {
                    await bootstrap.fetchRepaymentReviewContext();
                } else {
                    bootstrap.fetchRepayments();
                    bootstrap.fetchApplication(true);
                }
                if (onUpdate) onUpdate();
            }
        } catch (err) {
            setError(err.message || 'Verification failed');
        } finally {
            setVerifyingEmiId(null);
        }
    };

    const handleDisburse = () => setShowDisburseConfirm(true);

    const executeDisbursement = async () => {
        setShowDisburseConfirm(false);
        setUpdating(true);
        setError('');
        try {
            const response = await adminAPI.initiateDisbursement(applicationId);
            if (response.status === 1) {
                setMessage('Disbursement initiated successfully');
                bootstrap.fetchApplication(true);
                if (onUpdate) onUpdate();
            }
        } catch (err) {
            setError(err.message || 'Failed to initiate disbursement');
        } finally {
            setUpdating(false);
        }
    };

    const executePunchDisbursal = async () => {
        const ref = String(punchForm.bankReferenceNo || '').trim();
        if (!ref || ref.length < 5) {
            setError('Enter a valid bank reference / UTR (min 5 characters)');
            return;
        }
        setShowDisburseConfirm(false);
        setUpdating(true);
        setError('');
        try {
            const response = await adminAPI.punchDisbursalByApplication(applicationId, {
                bankReferenceNo: ref,
                disbursalDate: punchForm.disbursalDate || undefined,
                remark: punchForm.remark || undefined,
            });
            if (response.status === 1) {
                setMessage('Bank reference applied — loan marked disbursed');
                setPunchForm({ bankReferenceNo: '', disbursalDate: '', remark: '' });
                bootstrap.fetchApplication(true);
                if (onUpdate) onUpdate();
            }
        } catch (err) {
            setError(err.message || 'Failed to punch disbursement');
        } finally {
            setUpdating(false);
        }
    };

    const handleStatusUpdate = async (event, overrides = {}) => {
        if (event) event.preventDefault();
        const requestedStatus = overrides.status || statusUpdate.status;
        // Re-saving "approved" on a sanctioned case never moves it forward; the intent is Send offer.
        const nextStatus =
            requestedStatus === 'approved' &&
            String(loanApp?.application_status || '').toLowerCase() === 'approved'
                ? 'offer_sent'
                : requestedStatus;
        const nextRejectionReason = overrides.rejectionReason ?? statusUpdate.rejectionReason;
        if (!nextStatus) {
            setError('Please select a status');
            return;
        }
        if (nextStatus === 'rejected' && !String(nextRejectionReason || '').trim()) {
            setError('Please select at least one rejection reason');
            return;
        }
        const gateRequiredStatuses = ['recommended', 'approved', 'offer_sent'];
        if (gateRequiredStatuses.includes(nextStatus) && admin?.role !== 'super_admin') {
            const alreadySanctioned = ['approved', 'offer_sent'].includes(
                String(loanApp?.application_status || '').toLowerCase()
            );
            // Already sanctioned: allow Send offer despite credit REJECT / missing BRE (UW override path).
            const skipGatesForSanctionedOffer =
                nextStatus === 'offer_sent' && alreadySanctioned;
            if (!skipGatesForSanctionedOffer) {
                const gates = computeStaffVerificationGates({
                    userData,
                    kycDetails: kyc_details,
                    bankDetails: data?.bankDetails || data?.bank_details,
                    selfie: data?.selfie,
                    breEvaluation: bre.latestBreEvaluation,
                    latestCreditRun: creditDecisionResult,
                    panVerification: data?.pan_verification,
                });
                let blockers = getRecommendBlockers(gates);
                if (nextStatus === 'offer_sent' && alreadySanctioned) {
                    blockers = blockers.filter((b) => b.key !== 'breRejectBlocksRecommend');
                }
                if (blockers.length > 0) {
                    setError(blockers[0].hint);
                    if (blockers[0].tab) setActiveTab(blockers[0].tab);
                    return;
                }
            }
        }

        if (nextStatus === 'offer_sent') {
            const amountNum = parseFloat(statusUpdate.approvedAmount);
            if (!Number.isFinite(amountNum) || amountNum <= 0) {
                setError('Approved amount must be greater than zero before sending the offer');
                return;
            }
        }

        setUpdating(true);
        setError('');
        setMessage('');
        try {
            if (nextStatus === 'offer_sent') {
                const amountNum = parseFloat(statusUpdate.approvedAmount);
                const offerPayload = {
                    product_id: statusUpdate.productId ? Number(statusUpdate.productId) : undefined,
                    approved_amount: amountNum,
                    tenure_days: parseInt(statusUpdate.tenureDays, 10),
                    interest_rate_daily: parseFloat(statusUpdate.interestRateDaily),
                    fee_breakdown: statusUpdate.feeBreakdown || undefined,
                    admin_remarks: statusUpdate.remarks || `Offer sent with ${statusUpdate.tenureDays} days tenure`,
                };
                const response = await offerAPI.sendOffer(applicationId, offerPayload);
                if (response.status === 1) {
                    const newStatus = response.data?.application_status || 'offer_sent';
                    setMessage('Offer sent successfully! Returning to applications list…');
                    setStatusUpdate((prev) => ({
                        ...prev,
                        status: newStatus,
                        approvedAmount: amountNum || prev.approvedAmount,
                    }));
                    setData((prev) => {
                        if (!prev?.application) return prev;
                        return {
                            ...prev,
                            application: {
                                ...prev.application,
                                application_status: newStatus,
                                approved_amount: amountNum || prev.application.approved_amount,
                                tenure_days: parseInt(statusUpdate.tenureDays, 10) || prev.application.tenure_days,
                                applied_interest_rate_daily:
                                    parseFloat(statusUpdate.interestRateDaily) ||
                                    prev.application.applied_interest_rate_daily,
                            },
                        };
                    });
                    if (onUpdate) onUpdate(applicationId, newStatus);
                    // Leaving the page: the list refreshes via onUpdate, so a full detail reload would only delay the exit
                    if (onClose) {
                        setTimeout(onClose, 800);
                    } else {
                        await bootstrap.fetchApplication(true);
                    }
                } else {
                    setError(response.message || 'Failed to send offer');
                }
            } else {
                const payload = {
                    status: nextStatus,
                    admin_remarks: statusUpdate.remarks,
                };
                if (nextStatus === 'rejected') {
                    payload.rejectionReason = nextRejectionReason;
                } else {
                    const amountRaw = statusUpdate.approvedAmount;
                    const amountNum = parseFloat(amountRaw);
                    if (amountRaw !== '' && amountRaw != null && Number.isFinite(amountNum)) {
                        payload.approvedAmount = amountNum;
                    }
                    if (statusUpdate.interestRateDaily !== '' && statusUpdate.interestRateDaily != null) {
                        payload.interestRateDaily = statusUpdate.interestRateDaily;
                    }
                    if (statusUpdate.tenureDays !== '' && statusUpdate.tenureDays != null) {
                        payload.tenureDays = statusUpdate.tenureDays;
                    }
                }
                if (nextStatus === 'recommended') {
                    payload.approvedAmount = parseFloat(statusUpdate.approvedAmount || loanApp?.principal_amount || 0);
                    payload.tenureDays = parseInt(statusUpdate.tenureDays || loanApp?.tenure_days || 0, 10);
                }
                if (nextStatus === 'approved') {
                    payload.approvedAmount = parseFloat(statusUpdate.approvedAmount);
                    payload.tenureDays = parseInt(statusUpdate.tenureDays || 0);
                    payload.interestRateDaily = parseFloat(statusUpdate.interestRateDaily || 0);
                    payload.interestRate = payload.interestRateDaily * 365;
                    payload.tenureMonths = Math.ceil(payload.tenureDays / 30);
                    const principal = payload.approvedAmount;
                    const feeRows = [];
                    const activeFees = filterActivatableProductFees(productDetails?.fees);
                    if (activeFees.length) {
                        activeFees.forEach((fee) => {
                            const amount = fee.fee_type === 'percentage'
                                ? (principal * parseFloat(fee.default_value)) / 100
                                : parseFloat(fee.default_value);
                            if (amount > 0) {
                                feeRows.push({
                                    label: fee.fee_code === 'process_fee' ? 'Platform Fee' : fee.fee_name,
                                    amount,
                                });
                            }
                        });
                    } else {
                        feeRows.push({ label: 'Platform Fee (10%)', amount: (principal * 10) / 100 });
                    }
                    payload.feeBreakdown = feeRows;
                }
                const response = await adminAPI.updateLoanStatus(applicationId, payload);
                if (response.status === 1) {
                    const newStatus = response.data?.application_status || nextStatus;
                    setMessage('Status updated successfully');
                    setStatusUpdate((prev) => ({ ...prev, status: newStatus }));
                    setData((prev) => prev?.application ? {
                        ...prev,
                        application: { ...prev.application, application_status: newStatus },
                    } : prev);
                    if (onUpdate) onUpdate(applicationId, newStatus);
                    bootstrap.fetchApplication(true);
                    if (onClose) setTimeout(onClose, 800);
                } else {
                    const { message: friendly, tab } = formatStaffGateError(response.message);
                    setError(friendly || 'Failed to update status');
                    if (tab) setActiveTab(tab);
                }
            }
        } catch (err) {
            const { message: friendly, tab } = formatStaffGateError(
                err.response?.data?.message || err.message
            );
            setError(friendly || 'Failed to update application');
            if (tab) setActiveTab(tab);
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateSalaryDate = async () => {
        if (!newSalaryDate) return;
        setUpdating(true);
        setError('');
        setMessage('');
        try {
            const resp = await adminAPI.updateSalaryDate(loanApp?.user_id, { nextSalaryDate: newSalaryDate });
            if (resp.status === 1) {
                setMessage('Salary date updated successfully');
                setEditingSalaryDate(false);
                bootstrap.fetchApplication(true);
            } else setError(resp.message || 'Failed to update salary date');
        } catch (err) {
            setError(err.message || 'Update failed');
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateRepaymentDueDate = async (repaymentId) => {
        if (!newDueDate) return;
        setUpdating(true);
        setError('');
        setMessage('');
        try {
            const resp = await adminAPI.updateRepaymentDueDate(repaymentId, { dueDate: newDueDate });
            if (resp.status === 1) {
                setMessage('Repayment due date updated successfully');
                setEditingRepaymentId(null);
                bootstrap.fetchRepayments();
            } else setError(resp.message || 'Failed to update due date');
        } catch (err) {
            setError(err.message || 'Update failed');
        } finally {
            setUpdating(false);
        }
    };

    const handleOverrideRepaymentStatus = async (repaymentId) => {
        if (!newRepaymentStatus) return;
        setUpdating(true);
        setError('');
        setMessage('');
        try {
            const resp = await adminAPI.overrideRepaymentStatus(repaymentId, { status: newRepaymentStatus });
            if (resp.status === 1) {
                setMessage('Repayment status overridden successfully');
                setEditingRepaymentId(null);
                bootstrap.fetchRepayments();
                if (onUpdate) onUpdate();
            } else setError(resp.message || 'Failed to override status');
        } catch (err) {
            setError(err.message || 'Override failed');
        } finally {
            setUpdating(false);
        }
    };

    const handleVerifyReference = useCallback(async (referenceId, status, remarks = '', recordingFile = null, options = {}) => {
        const appRef =
            loanApp?.id ||
            bootstrap.resolvedInternalIdRef.current ||
            loanApp?.application_number ||
            applicationId;
        const customerUserId = data?.user?.id || data?.application?.user_id || user?.id;
        setUpdating(true);
        setError('');
        setMessage('');
        try {
            let recordingKey = options.recordingKey || null;
            let recordingUrl = options.recordingUrl || null;

            if (recordingFile && !recordingKey) {
                const { uploadToS3, UPLOAD_CATEGORIES } = await import('@/lib/services/cloudinaryUpload');
                const { normalizeRecordingFile, isAllowedRecordingFile } = await import('@/lib/utils/callRecording');
                if (!isAllowedRecordingFile(recordingFile)) {
                    throw new Error('Please upload an audio recording. MP3, M4A, WAV, OGG, AAC, AMR, 3GP, FLAC, WebM and similar formats are supported.');
                }
                const fileToUpload = normalizeRecordingFile(recordingFile);
                options.onUploadProgress?.(0);
                const uploaded = await uploadToS3(fileToUpload, {
                    category: UPLOAD_CATEGORIES.callRecording,
                    compress: false,
                    targetUserId: customerUserId,
                    onProgress: (pct) => options.onUploadProgress?.(pct),
                });
                recordingKey = uploaded?.publicId || uploaded?.key || null;
                recordingUrl = uploaded?.url || null;
                if (!recordingKey) {
                    throw new Error('Recording upload did not return a file key');
                }
                options.onUploadProgress?.(100);
            }

            const payload = {
                referenceId,
                status,
                remarks,
                ...(recordingKey ? { recordingKey, recordingUrl } : {}),
            };
            const response = await adminAPI.verifyCustomerReference(appRef, payload);
            if (response.status === 1) {
                setMessage(status === 'failed' ? 'Reference marked failed' : 'Reference verified');
                const result = response.data || {};
                const playUrl = result.recording_url || recordingUrl || null;
                setData((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        references: (prev.references || []).map((r) =>
                            Number(r.id) === Number(referenceId)
                                ? {
                                    ...r,
                                    verification_status: status === 'failed' ? 'failed' : 'verified',
                                    verification_call_id: result.call_id || r.verification_call_id,
                                    recording_url: playUrl || r.recording_url || null,
                                  }
                                : r
                        ),
                    };
                });
                await bootstrap.fetchApplication(true);
                if (onUpdate) onUpdate();
                return { ok: true, recording_url: playUrl };
            }
            setError(response.message || 'Failed to verify reference');
            return { ok: false };
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to verify reference');
            return { ok: false };
        } finally {
            setUpdating(false);
            options.onUploadProgress?.(null);
        }
    }, [loanApp, applicationId, bootstrap.fetchApplication, onUpdate, data, user, setData]);

    const contextValue = useMemo(() => ({
        applicationId,
        onClose,
        onUpdate,
        admin,
        data, setData,
        loading: bootstrap.loading, setLoading: bootstrap.setLoading,
        creditLoading: bootstrap.creditLoading,
        updating, setUpdating,
        verifyingEmiId, setVerifyingEmiId,
        error, setError,
        message, setMessage,
        statusUpdate, setStatusUpdate,
        repayments, setRepayments,
        partPayments,
        loadingRepayments, setLoadingRepayments,
        breEvaluations: bre.breEvaluations, setBreEvaluations: bre.setBreEvaluations,
        latestBreEvaluation: bre.latestBreEvaluation, setLatestBreEvaluation: bre.setLatestBreEvaluation,
        loadingBRE: bre.loadingBRE, setLoadingBRE: bre.setLoadingBRE,
        breRerunWaitSec: bre.breRerunWaitSec,
        breAdminCooldownSec: bre.breAdminCooldownSec,
        formatBreLastRun: bre.formatBreLastRun,
        creditDecisionLoading: credit.creditDecisionLoading,
        creditDecisionResult, setCreditDecisionResult,
        creditDecisionError: credit.creditDecisionError,
        setCreditDecisionError: credit.setCreditDecisionError,
        bureauSummary: bureau.bureauSummary,
        setBureauSummary: bureau.setBureauSummary,
        bureauSummaryLoading: bureau.bureauSummaryLoading,
        fetchBureauSummary: bureau.fetchBureauSummary,
        bureauDetail: bureau.bureauDetail,
        bureauDetailLoading: bureau.bureauDetailLoading,
        bureauDetailError: bureau.bureauDetailError,
        fetchBureauDetail: bureau.fetchBureauDetail,
        invalidateBureauSummary: bureau.invalidateBureauSummary,
        productDetails, setProductDetails,
        esignDocs, setEsignDocs,
        uploading, setUploading,
        uploadingKey, setUploadingKey,
        showDisburseConfirm, setShowDisburseConfirm,
        punchForm, setPunchForm,
        uploadingType, setUploadingType,
        activeTab, setActiveTab,
        editingSalaryDate, setEditingSalaryDate,
        newSalaryDate, setNewSalaryDate,
        editingRepaymentId, setEditingRepaymentId,
        newDueDate, setNewDueDate,
        newRepaymentStatus, setNewRepaymentStatus,
        downloadingDoc, setDownloadingDoc,
        downloadingCAM, setDownloadingCAM,
        prepaymentData, setPrepaymentData,
        loadingPrepayment: bootstrap.loadingPrepayment,
        setLoadingPrepayment: bootstrap.setLoadingPrepayment,
        prepaymentDate, setPrepaymentDate,
        callLogs, setCallLogs,
        loadingCallLogs, setLoadingCallLogs,
        loanAccountView: bootstrap.loanAccountView,
        loadingLoanAccount: bootstrap.loadingLoanAccount,
        loanAccountError: bootstrap.loanAccountError,
        isLogCallOpen, setIsLogCallOpen,
        callLogAppRef,
        handleCallLogged,
        loanApp, selfie, residenceProofs, kyc_details, bankStatements, references, bankDetails, user, history, userData,
        isReadOnly,
        isMandateCompleted,
        isClosed,
        isEsignProcessing,
        sendingOfficeOTP,
        verifyingOfficeOTP,
        officeOTPStep,
        setOfficeOTPStep,
        tempOfficeEmail,
        officeOTP,
        setOfficeOTP,
        mandateRegistration,
        lockWarning: bootstrap.lockWarning,
        setLockWarning: bootstrap.setLockWarning,

        fetchApplication: bootstrap.fetchApplication,
        fetchRepayments: bootstrap.fetchRepayments,
        fetchLoanAccountView: bootstrap.fetchLoanAccountView,
        fetchPrepayment: bootstrap.fetchPrepayment,
        fetchCallLogs,
        fetchBREDetails: bre.fetchBREDetails,
        fetchDocumentsSection: bootstrap.fetchDocumentsSection,
        fetchKycSection: bootstrap.fetchKycSection,
        fetchBankSection: bootstrap.fetchBankSection,

        aaStatus: bankReportState.aaStatus,
        setAaStatus: bankReportState.setAaStatus,
        bankReport: bankReportState.bankReport,
        setBankReport: bankReportState.setBankReport,
        bankReportLoading: bankReportState.bankReportLoading,
        bankReportError: bankReportState.bankReportError,
        fetchBankReport: bankReportState.fetchBankReport,
        invalidateBankReport: bankReportState.invalidateBankReport,

        ...documents,
        handleVerifyReference,
        handleSendOfficeOTP,
        handleVerifyOfficeOTP,
        handleVideoVerification,
        handleCreditDecision: credit.handleCreditDecision,
        handleForceCrifRefetch: credit.handleForceCrifRefetch,
        crifMissingDialog: credit.crifMissingDialog,
        handleCrifMissingConfirm: credit.handleCrifMissingConfirm,
        handleCrifMissingCancel: credit.handleCrifMissingCancel,
        handleResumeCreditDecision: credit.handleResumeCreditDecision,
        handleTriggerEvaluation: bre.handleTriggerEvaluation,
        handleVerifyRepayment,
        handleStatusUpdate,
        handleDisburse,
        executeDisbursement,
        executePunchDisbursal,
        renderDocumentThumbnail,
        handleUpdateSalaryDate,
        handleUpdateRepaymentDueDate,
        handleOverrideRepaymentStatus,
        handleInitiateDigioKYC: digio.handleInitiateDigioKYC,
        handleVerifyBankDetails: digio.handleVerifyBankDetails,
        handleManualVerifyBank: digio.handleManualVerifyBank,
        handleUpdateDisbursalBankDetails: digio.handleUpdateDisbursalBankDetails,
        handleVerifyPan: digio.handleVerifyPan,
        handleManualVerifyPan: digio.handleManualVerifyPan,
        handleUpdateUPIId: digio.handleUpdateUPIId,
        handleInitiateEsign: digio.handleInitiateEsign,
        handleInitiateMandate: digio.handleInitiateMandate,
        handleManualVerifyMandate: digio.handleManualVerifyMandate,
        handleResendMandateAuthLink: digio.handleResendMandateAuthLink,
        handleFaceMatch: digio.handleFaceMatch,
        handleLivenessCheck: digio.handleLivenessCheck,
        handleRejectSelfie: digio.handleRejectSelfie,
        handleVerifyEmployment: digio.handleVerifyEmployment,
        selfieCheckFeedback,
        isOpen,
        isRepaymentReview,
        targetEmiId,
        hasFullHistory: data?.hasFullHistory === true,
        statusHistory: data?.statusHistory || [],
    }), [
        applicationId, onClose, onUpdate, admin, data, bootstrap, updating, verifyingEmiId,
        error, message, statusUpdate, repayments, loadingRepayments, bre, credit,
        creditDecisionResult, productDetails, esignDocs, uploading, uploadingKey,
        showDisburseConfirm, punchForm, uploadingType, activeTab, editingSalaryDate, newSalaryDate,
        editingRepaymentId, newDueDate, newRepaymentStatus, downloadingDoc, downloadingCAM,
        prepaymentData, prepaymentDate, callLogs, loadingCallLogs, isLogCallOpen,
        callLogAppRef, handleCallLogged, loanApp, selfie, residenceProofs,
        kyc_details, bankStatements, references, bankDetails, user, history, userData,
        isReadOnly, isMandateCompleted, isClosed, isEsignProcessing, sendingOfficeOTP, verifyingOfficeOTP,
        officeOTPStep, tempOfficeEmail, officeOTP, mandateRegistration, fetchCallLogs,
        documents, digio, handleVerifyReference, handleSendOfficeOTP,
        handleVerifyOfficeOTP, handleVideoVerification, handleVerifyRepayment, handleStatusUpdate,
        handleDisburse, executeDisbursement, executePunchDisbursal, handleUpdateSalaryDate, handleUpdateRepaymentDueDate,
        handleOverrideRepaymentStatus, selfieCheckFeedback, isOpen, isRepaymentReview, targetEmiId,
        bureau, bankReportState,
    ]);

    return (
        <ApplicationContext.Provider value={contextValue}>
            {children}
            <CrifMissingFieldsDialog
                open={credit.crifMissingDialog.open}
                missing={credit.crifMissingDialog.missing}
                prefilled={credit.crifMissingDialog.prefilled}
                onConfirm={credit.handleCrifMissingConfirm}
                onCancel={credit.handleCrifMissingCancel}
            />
        </ApplicationContext.Provider>
    );
};
