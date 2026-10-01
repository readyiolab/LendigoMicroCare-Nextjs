import { useCallback, useEffect, useRef, useState } from 'react';
import { adminAPI } from '@/lib/api';
import socketService from '@/lib/services/socketService';
import { mergeBootstrapSections } from '../utils/mergeBootstrapSections';
import { esignErrorMessage } from '../utils/esignErrorMessage';
import { resolveSocketInvalidateSections } from '../utils/resolveSocketInvalidateSections';

export function useApplicationBootstrap({
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
    setLatestBreEvaluation,
    setHasFetchedBre,
    setSelfieCheckFeedback,
    setIsEsignProcessing,
    setLoadingRepayments,
    prepaymentDate,
    loanAppApplicationStatus,
}) {
    const [loading, setLoading] = useState(true);
    const [creditLoading, setCreditLoading] = useState(false);
    const [bootstrapEpoch, setBootstrapEpoch] = useState(0);
    const [lockWarning, setLockWarning] = useState('');
    const [loanAccountView, setLoanAccountView] = useState(null);
    const [loadingLoanAccount, setLoadingLoanAccount] = useState(false);
    const [loanAccountError, setLoanAccountError] = useState('');
    const [loadingPrepayment, setLoadingPrepayment] = useState(false);

    const hasLoadedRef = useRef(false);
    const fetchIdRef = useRef(0);
    const resolvedInternalIdRef = useRef(null);
    const repaymentsLoadedRef = useRef(false);
    const loanAccountLoadedRef = useRef(false);
    const sectionsLoadedRef = useRef({
        documents: false,
        kyc: false,
        bank: false,
        journey: false,
    });
    const isLockedByMe = useRef(false);
    const lockReleasedRef = useRef(false);
    const lockSentRef = useRef(false);
    const documentsFetchInFlightRef = useRef(null);
    const documentsFetchGenRef = useRef(0);
    const prepaymentLoadedKeyRef = useRef(null);
    const bankFetchInFlightRef = useRef(null);
    const kycFetchInFlightRef = useRef(null);
    const journeyFetchInFlightRef = useRef(null);
    const bankFetchGenRef = useRef(0);
    const kycFetchGenRef = useRef(0);
    const journeyFetchGenRef = useRef(0);

    const applyRepaymentDetailsPayload = useCallback((payload) => {
        if (!payload) return;
        setRepayments(payload.emis || []);
        if (typeof setPartPayments === 'function') {
            setPartPayments(payload.partPayments || []);
        }
        repaymentsLoadedRef.current = true;
        if (payload.prepayment) {
            setPrepaymentData(payload.prepayment);
        }
        setData({
            application: {
                id: payload.loanId,
                application_number: payload.applicationNumber || payload.leadId || payload.loanAccountNumber || null,
                lead_id: payload.leadId || null,
                loan_account_number: payload.loanAccountNumber || null,
                application_status: payload.applicationStatus || 'disbursed',
                approved_amount: payload.approvedAmount,
                principal_amount: payload.principalAmount,
            },
            profile: {
                full_name: payload.customer?.fullName,
            },
            user: {
                full_name: payload.customer?.fullName,
                mobile: payload.customer?.mobile,
                email: payload.customer?.email,
            },
        });
        hasLoadedRef.current = true;
    }, [setData, setPrepaymentData, setRepayments, setPartPayments]);

    const fetchRepayments = useCallback(async (force = false) => {
        if (!applicationId) return;
        if (!force && repaymentsLoadedRef.current && repayments.length > 0) return;
        setLoadingRepayments(true);
        try {
            const resp = await adminAPI.getLoanRepayments(applicationId);
            if (resp.status === 1) {
                if (isRepaymentReview) {
                    applyRepaymentDetailsPayload(resp.data);
                } else {
                    setRepayments(resp.data.emis || []);
                    if (typeof setPartPayments === 'function') {
                        setPartPayments(resp.data.partPayments || []);
                    }
                    if (resp.data.prepayment) setPrepaymentData(resp.data.prepayment);
                    repaymentsLoadedRef.current = true;
                }
            }
        } catch (err) {
            console.error('Failed to fetch repayments:', err);
        } finally {
            setLoadingRepayments(false);
        }
    }, [
        applicationId,
        isRepaymentReview,
        applyRepaymentDetailsPayload,
        repayments.length,
        setLoadingRepayments,
        setPrepaymentData,
        setRepayments,
        setPartPayments,
    ]);

    const fetchLoanAccountView = useCallback(async (force = false) => {
        const numericId = resolvedInternalIdRef.current;
        if (!numericId) return;
        if (!force && loanAccountLoadedRef.current) return;

        setLoadingLoanAccount(true);
        setLoanAccountError('');
        try {
            const res = await adminAPI.getLoanAccountView(numericId);
            const payload = res?.data ?? res;
            if (res?.status === 0) {
                setLoanAccountError(res.message || 'Failed to load loan account view');
                setLoanAccountView(null);
                // Do not mark loaded — soft retry / Refresh can try again
                loanAccountLoadedRef.current = false;
                return;
            }
            setLoanAccountView(payload || null);
            loanAccountLoadedRef.current = true;
        } catch (err) {
            setLoanAccountError(err.message || 'Failed to load loan account view');
            setLoanAccountView(null);
            loanAccountLoadedRef.current = false;
        } finally {
            setLoadingLoanAccount(false);
        }
    }, []);

    const fetchRepaymentReviewContext = useCallback(async () => {
        if (!applicationId) return;
        setLoading(true);
        setLoadingRepayments(true);
        setError('');
        try {
            // Lean path only — avoid full application details (KYC/selfie/mandate/BRE) + unused credit
            const repayResp = await adminAPI.getLoanRepayments(applicationId);
            if (repayResp.status === 1) {
                applyRepaymentDetailsPayload(repayResp.data);
            } else {
                setError(repayResp.message || 'Failed to load repayment details');
            }
        } catch (err) {
            setError(err.message || 'Failed to load repayment details');
        } finally {
            setLoading(false);
            setLoadingRepayments(false);
        }
    }, [
        applicationId,
        applyRepaymentDetailsPayload,
        setError,
        setLoadingRepayments,
    ]);

    const fetchLatestCreditInBackground = useCallback(async (appRef, fetchId) => {
        if (!appRef) return;
        setCreditLoading(true);
        try {
            const creditRes = await adminAPI.getLatestCreditDecision(appRef);
            if (fetchId !== fetchIdRef.current) return;
            if (creditRes?.status === 1 && creditRes.data) {
                setCreditDecisionResult(creditRes.data);
            }
        } catch {
            // Latest credit run optional if migrations not applied yet
        } finally {
            if (fetchId === fetchIdRef.current) setCreditLoading(false);
        }
    }, [setCreditDecisionResult]);

    const fetchApplication = useCallback(async (isBackground = false, invalidateSections = null) => {
        if (!applicationId) return;

        const fetchId = ++fetchIdRef.current;
        if (!isBackground) {
            setLoading(true);
            setCreditLoading(true);
            setError('');
            setMessage('');
        }

        try {
            // First paint includes credit summary so the Workflow banner does not flash
            // "Run credit check" before the background hop lands.
            const params = {
              include: 'credit',
            };
            if (!isBackground && !hasLoadedRef.current && !isRepaymentReview) {
                params.acquireLock = 'true';
            }

            const response = await adminAPI.getApplicationDetails(applicationId, params);
            if (fetchId !== fetchIdRef.current) return;

            if (response.status === 1) {
                const app = response.data.application || response.data;
                const fullData = { ...response.data, application: app };
                setData((prev) =>
                    mergeBootstrapSections(prev, fullData, {
                        isBackground,
                        invalidateSections,
                    })
                );
                hasLoadedRef.current = true;
                resolvedInternalIdRef.current = app.id;

                if (!isBackground) {
                    sectionsLoadedRef.current = {
                        documents: false,
                        kyc: false,
                        bank: false,
                        journey: false,
                    };
                    documentsFetchGenRef.current += 1;
                    documentsFetchInFlightRef.current = null;
                    bankFetchGenRef.current += 1;
                    kycFetchGenRef.current += 1;
                    journeyFetchGenRef.current += 1;
                    bankFetchInFlightRef.current = null;
                    kycFetchInFlightRef.current = null;
                    journeyFetchInFlightRef.current = null;
                    loanAccountLoadedRef.current = false;
                    prepaymentLoadedKeyRef.current = null;
                    setLoanAccountView(null);
                    setLoanAccountError('');
                } else if (invalidateSections === null) {
                    sectionsLoadedRef.current = {
                        ...sectionsLoadedRef.current,
                        repayments: false,
                    };
                } else if (Array.isArray(invalidateSections) && invalidateSections.length > 0) {
                    invalidateSections.forEach((section) => {
                        sectionsLoadedRef.current[section] = false;
                    });
                    if (invalidateSections.includes('documents')) {
                        documentsFetchGenRef.current += 1;
                        documentsFetchInFlightRef.current = null;
                    }
                    if (invalidateSections.includes('bank')) {
                        bankFetchGenRef.current += 1;
                        bankFetchInFlightRef.current = null;
                    }
                    if (invalidateSections.includes('kyc')) {
                        kycFetchGenRef.current += 1;
                        kycFetchInFlightRef.current = null;
                    }
                    if (invalidateSections.includes('journey')) {
                        journeyFetchGenRef.current += 1;
                        journeyFetchInFlightRef.current = null;
                    }
                }
                setBootstrapEpoch((epoch) => epoch + 1);

                if (app.lead_id && String(app.lead_id) !== String(applicationId)) {
                    window.history.replaceState(
                        null,
                        '',
                        `/admin/applications/${encodeURIComponent(app.lead_id)}`
                    );
                }

                if (response.data.breSummary) {
                    setLatestBreEvaluation(response.data.breSummary);
                    setHasFetchedBre(true);
                }

                if (Object.prototype.hasOwnProperty.call(response.data || {}, 'latestCreditDecision')) {
                    setCreditDecisionResult(response.data.latestCreditDecision ?? null);
                    setCreditLoading(false);
                } else if (!isRepaymentReview) {
                    fetchLatestCreditInBackground(app.lead_id || app.loan_account_number || applicationId, fetchId);
                } else {
                    setCreditLoading(false);
                }

                if (response.data.repayments?.emis) {
                    setRepayments(response.data.repayments.emis);
                    if (typeof setPartPayments === 'function') {
                        setPartPayments(response.data.repayments.partPayments || []);
                    }
                    if (response.data.repayments.prepayment) {
                        setPrepaymentData(response.data.repayments.prepayment);
                    }
                    repaymentsLoadedRef.current = true;
                }

                setStatusUpdate({
                    status: app.application_status || '',
                    approvedAmount: (() => {
                        const candidates = [app.approved_amount, app.recommended_loan_amount, app.principal_amount];
                        for (const c of candidates) {
                            if (c == null || c === '') continue;
                            const n = Number(String(c).replace(/,/g, ''));
                            if (Number.isFinite(n) && n > 0) return n;
                        }
                        return '';
                    })(),
                    tenureMonths: app.approved_tenure_months || Math.ceil((app.tenure_days || 30) / 30),
                    tenureDays: app.tenure_days || '',
                    interestRate: app.approved_interest_rate || 12,
                    interestRateDaily: app.applied_interest_rate_daily || '',
                    rejectionReason: app.rejection_reason || '',
                    remarks: '',
                    productId: app.product_id || '',
                    feeBreakdown: {},
                });

                if (response.data.lockStatus === 'locked_by_other') {
                    isLockedByMe.current = false;
                    lockSentRef.current = false;
                    setLockWarning(response.data.lockMessage || 'This application is locked by another user.');
                } else if (response.data.lockAcquired || response.data.lockStatus === 'locked_by_me') {
                    isLockedByMe.current = true;
                    lockSentRef.current = true;
                    lockReleasedRef.current = false;
                    setLockWarning('');
                }
            } else {
                setError(response.message || 'Failed to fetch application details');
                setCreditLoading(false);
            }
        } catch (err) {
            if (fetchId !== fetchIdRef.current) return;
            console.error('Fetch error:', err);
            setError(err.message || 'Error occurred while fetching application');
            setCreditLoading(false);
        } finally {
            if (fetchId === fetchIdRef.current) setLoading(false);
        }
    }, [
        applicationId,
        isRepaymentReview,
        fetchLatestCreditInBackground,
        setCreditDecisionResult,
        setData,
        setError,
        setHasFetchedBre,
        setLatestBreEvaluation,
        setMessage,
        setPrepaymentData,
        setRepayments,
        setStatusUpdate,
    ]);

    const fetchPrepayment = useCallback(async (date, force = false) => {
        if (!applicationId) return;
        if (loanAppApplicationStatus !== 'disbursed') return;
        // Ignore SyntheticEvent from onClick={fetchPrepayment}
        const calcDate = typeof date === 'string' && date ? date : prepaymentDate;
        const loadKey = `${applicationId}:${calcDate || ''}`;
        if (!force && prepaymentLoadedKeyRef.current === loadKey) return;
        setLoadingPrepayment(true);
        try {
            const resp = await adminAPI.calculatePrepayment(applicationId, calcDate);
            if (resp.status === 1) {
                setPrepaymentData(resp.data);
                prepaymentLoadedKeyRef.current = loadKey;
            }
        } catch (err) {
            console.error('Failed to calculate prepayment:', err);
        } finally {
            setLoadingPrepayment(false);
        }
    }, [applicationId, loanAppApplicationStatus, prepaymentDate, setPrepaymentData]);

    const fetchDocumentsSection = useCallback(async (force = false) => {
        if (!applicationId) return;
        if (!force && sectionsLoadedRef.current.documents) return;
        if (documentsFetchInFlightRef.current) {
            if (!force) return documentsFetchInFlightRef.current;
            await documentsFetchInFlightRef.current;
        }
        if (!force && sectionsLoadedRef.current.documents) return;

        const gen = ++documentsFetchGenRef.current;
        const stillCurrent = () => gen === documentsFetchGenRef.current;

        const run = (async () => {
            const alreadyLoaded = sectionsLoadedRef.current.documents;
            if (!stillCurrent()) return;
            setData((prev) => prev && ({
                ...prev,
                documentsLoading: !alreadyLoaded,
                documentsRefreshing: alreadyLoaded,
                documentsError: null,
            }));
            try {
                const resp = await adminAPI.getApplicationDocumentsSection(applicationId, {
                    bustCache: force,
                });
                if (!stillCurrent()) return;
                if (resp.status !== 1) {
                    setData((prev) => {
                        if (!prev || !stillCurrent()) return prev;
                        sectionsLoadedRef.current.documents = true;
                        return {
                            ...prev,
                            documentsLoading: false,
                            documentsRefreshing: false,
                            documentsError: resp.message || 'Failed to load documents',
                            sectionsLoaded: { ...(prev.sectionsLoaded || {}), documents: true },
                        };
                    });
                    return;
                }
                const section = resp.data || {};
                setData((prev) => {
                    if (!prev || !stillCurrent()) return prev;
                    sectionsLoadedRef.current.documents = true;
                    return {
                        ...prev,
                        residenceProofs: section.residenceProofs || [],
                        bankStatements: section.bankStatements || [],
                        salarySlips: section.salarySlips || [],
                        esignDocs: section.esignDocs || [],
                        otherDocuments: section.otherDocuments || [],
                        documentRemarks: section.documentRemarks || [],
                        documentsLoading: false,
                        documentsRefreshing: false,
                        documentsError: null,
                        sectionsLoaded: { ...(prev.sectionsLoaded || {}), documents: true },
                    };
                });
            } catch (err) {
                if (!stillCurrent()) return;
                console.error('Failed to fetch documents section:', err);
                setData((prev) => {
                    if (!prev || !stillCurrent()) return prev;
                    sectionsLoadedRef.current.documents = true;
                    return {
                        ...prev,
                        documentsLoading: false,
                        documentsRefreshing: false,
                        documentsError: err.response?.data?.message || err.message || 'Failed to load documents',
                        sectionsLoaded: { ...(prev.sectionsLoaded || {}), documents: true },
                    };
                });
            } finally {
                if (stillCurrent() && documentsFetchInFlightRef.current === run) {
                    documentsFetchInFlightRef.current = null;
                }
            }
        })();

        documentsFetchInFlightRef.current = run;
        return run;
    }, [applicationId, setData]);

    const fetchKycSection = useCallback(async (force = false) => {
        if (!applicationId) return;
        if (!force && sectionsLoadedRef.current.kyc) return;
        if (kycFetchInFlightRef.current) {
            if (!force) return kycFetchInFlightRef.current;
            await kycFetchInFlightRef.current;
        }
        if (!force && sectionsLoadedRef.current.kyc) return;

        const gen = ++kycFetchGenRef.current;
        const stillCurrent = () => gen === kycFetchGenRef.current;

        const run = (async () => {
            try {
                const resp = await adminAPI.getApplicationKycSection(applicationId, { bustCache: force });
                if (!stillCurrent()) return;
                if (resp.status !== 1) return;
                const section = resp.data || {};
                setData((prev) => {
                    if (!prev || !stillCurrent()) return prev;
                    const verifiedFromSection = section.profile_pan?.pancard_verified;
                    const nextProfile = prev.profile ? {
                        ...prev.profile,
                        pancard: section.profile_pan?.pancard || prev.profile.pancard,
                        pancard_verified: verifiedFromSection ?? prev.profile.pancard_verified,
                    } : prev.profile;
                    return {
                        ...prev,
                        profile: nextProfile,
                        kyc_details: section.kyc_details ?? prev.kyc_details,
                        selfie: section.selfie ?? prev.selfie,
                        pan_verification: section.pan_verification ?? prev.pan_verification,
                        employment: section.employment ?? prev.employment,
                        sectionsLoaded: { ...(prev.sectionsLoaded || {}), kyc: true },
                    };
                });
                if (stillCurrent()) sectionsLoadedRef.current.kyc = true;
            } catch (err) {
                if (!stillCurrent()) return;
                console.error('Failed to fetch KYC section:', err);
            } finally {
                if (stillCurrent() && kycFetchInFlightRef.current === run) {
                    kycFetchInFlightRef.current = null;
                }
            }
        })();

        kycFetchInFlightRef.current = run;
        return run;
    }, [applicationId, setData]);

    const fetchBankSection = useCallback(async (force = false) => {
        if (!applicationId) return;
        if (!force && sectionsLoadedRef.current.bank) return;
        if (bankFetchInFlightRef.current) {
            if (!force) return bankFetchInFlightRef.current;
            await bankFetchInFlightRef.current;
        }
        if (!force && sectionsLoadedRef.current.bank) return;

        const gen = ++bankFetchGenRef.current;
        const stillCurrent = () => gen === bankFetchGenRef.current;

        const run = (async () => {
            try {
                const resp = await adminAPI.getApplicationBankSection(applicationId, { bustCache: force });
                if (!stillCurrent()) return;
                if (resp.status !== 1) return;
                const section = resp.data || {};
                setData((prev) => {
                    if (!prev || !stillCurrent()) return prev;
                    const nextApp = prev.application ? {
                        ...prev.application,
                        fee_breakdown: section.fee_breakdown ?? prev.application.fee_breakdown,
                    } : prev.application;
                    const incoming = section.bankDetails ?? prev.bankDetails;
                    const prevBank = prev.bankDetails || {};
                    const mergedBank = incoming ? {
                        ...incoming,
                        is_verified: (
                            Number(incoming.is_verified) === 1 ||
                            Number(prevBank.is_verified) === 1 ||
                            Number(incoming.is_manual_verified) === 1 ||
                            Number(prevBank.is_manual_verified) === 1 ||
                            ['success'].includes(String(incoming.penny_drop_status || prevBank.penny_drop_status || '').toLowerCase())
                        ) ? 1 : incoming.is_verified,
                        penny_drop_status: (
                            String(incoming.penny_drop_status || '').toLowerCase() === 'success' ||
                            String(prevBank.penny_drop_status || '').toLowerCase() === 'success'
                        ) ? 'success' : incoming.penny_drop_status,
                    } : prev.bankDetails;
                    return {
                        ...prev,
                        application: nextApp,
                        bankDetails: mergedBank,
                        mandateRegistration: section.mandateRegistration ?? prev.mandateRegistration,
                        sectionsLoaded: { ...(prev.sectionsLoaded || {}), bank: true },
                    };
                });
                if (stillCurrent()) sectionsLoadedRef.current.bank = true;
            } catch (err) {
                if (!stillCurrent()) return;
                console.error('Failed to fetch bank section:', err);
            } finally {
                if (stillCurrent() && bankFetchInFlightRef.current === run) {
                    bankFetchInFlightRef.current = null;
                }
            }
        })();

        bankFetchInFlightRef.current = run;
        return run;
    }, [applicationId, setData]);

    const fetchJourneySection = useCallback(async (force = false) => {
        if (!applicationId) return;
        if (!force && sectionsLoadedRef.current.journey) return;
        if (journeyFetchInFlightRef.current) {
            if (!force) return journeyFetchInFlightRef.current;
            await journeyFetchInFlightRef.current;
        }
        if (!force && sectionsLoadedRef.current.journey) return;

        const gen = ++journeyFetchGenRef.current;
        const stillCurrent = () => gen === journeyFetchGenRef.current;

        const run = (async () => {
            if (!stillCurrent()) return;
            setData((prev) => prev && ({
                ...prev,
                journeyLoading: true,
            }));
            try {
                const resp = await adminAPI.getApplicationJourneySection(applicationId);
                if (!stillCurrent()) return;
                if (resp.status !== 1) {
                    setData((prev) => {
                        if (!prev || !stillCurrent()) return prev;
                        sectionsLoadedRef.current.journey = true;
                        return {
                            ...prev,
                            journeyLoading: false,
                            sectionsLoaded: { ...(prev.sectionsLoaded || {}), journey: true },
                        };
                    });
                    return;
                }
                const section = resp.data || {};
                setData((prev) => {
                    if (!prev || !stillCurrent()) return prev;
                    sectionsLoadedRef.current.journey = true;
                    return {
                        ...prev,
                        steps: section.steps || [],
                        references: section.references?.length ? section.references : prev.references,
                        sectionsLoaded: { ...(prev.sectionsLoaded || {}), journey: true },
                        journeyLoading: false,
                    };
                });
            } catch (err) {
                if (!stillCurrent()) return;
                console.error('Failed to fetch journey section:', err);
                setData((prev) => {
                    if (!prev || !stillCurrent()) return prev;
                    sectionsLoadedRef.current.journey = true;
                    return {
                        ...prev,
                        journeyLoading: false,
                        sectionsLoaded: { ...(prev.sectionsLoaded || {}), journey: true },
                    };
                });
            } finally {
                if (stillCurrent() && journeyFetchInFlightRef.current === run) {
                    journeyFetchInFlightRef.current = null;
                }
            }
        })();

        journeyFetchInFlightRef.current = run;
        return run;
    }, [applicationId, setData]);

    useEffect(() => {
        const eventMatchesApplication = (event) => {
            if (!event) return false;
            const ref = String(applicationId);
            if (String(event.applicationId) === ref || String(event.id) === ref) return true;
            if (event.application_number && String(event.application_number) === ref) return true;
            if (event.applicationNumber && String(event.applicationNumber) === ref) return true;
            if (event.lead_id && String(event.lead_id) === ref) return true;
            if (event.leadId && String(event.leadId) === ref) return true;
            if (event.loan_account_number && String(event.loan_account_number) === ref) return true;
            if (event.loanAccountNumber && String(event.loanAccountNumber) === ref) return true;
            return resolvedInternalIdRef.current != null
                && String(event.applicationId) === String(resolvedInternalIdRef.current);
        };
        const handleApplicationUpdate = (event) => {
            console.log('[ApplicationContext] Received application update:', event);
            if (!eventMatchesApplication(event)) return;
            if (isRepaymentReview) {
                fetchRepayments(true);
            } else {
                const sections = resolveSocketInvalidateSections(event, { source: 'application_updated' });
                fetchApplication(true, sections);
                if (repaymentsLoadedRef.current || activeTab === 'repayments') fetchRepayments(true);
                prepaymentLoadedKeyRef.current = null;
            }
            const eventType = (event.type || '').toLowerCase();
            if (eventType === 'esign_initiated' || eventType === 'esign_completed') {
                setMessage('E-Sign request processed successfully!');
                setIsEsignProcessing(false);
            }
        };
        const handleEsignSuccess = (event) => {
            console.log('[ApplicationContext] E-Sign success event received:', event);
            if (eventMatchesApplication(event)) {
                setMessage(event.message || 'E-Sign request initiated successfully!');
                setIsEsignProcessing(false);
                fetchApplication(true, resolveSocketInvalidateSections(event, { source: 'esign_success' }));
            }
        };
        const handleEsignError = (event) => {
            console.log('[ApplicationContext] E-Sign error event received:', event);
            if (eventMatchesApplication(event)) {
                setMessage('');
                setError(esignErrorMessage(event.error || event.message, event.code));
                setIsEsignProcessing(false);
            }
        };
        const handleKycWebhook = (event) => {
            if (event && event.applicationId && !eventMatchesApplication(event)) return;
            fetchApplication(true, resolveSocketInvalidateSections(event, { source: 'kyc_webhook' }));
            prepaymentLoadedKeyRef.current = null;
        };

        socketService.on('APPLICATION_UPDATED', handleApplicationUpdate);
        socketService.on('ESIGN_INITIATED_SUCCESS', handleEsignSuccess);
        socketService.on('ESIGN_INITIATED_ERROR', handleEsignError);
        socketService.on('KYC_WEBHOOK_RECEIVED', handleKycWebhook);
        socketService.on('DIGIO_WEBHOOK_RECEIVED', handleKycWebhook); // legacy alias
        return () => {
            socketService.off('APPLICATION_UPDATED', handleApplicationUpdate);
            socketService.off('ESIGN_INITIATED_SUCCESS', handleEsignSuccess);
            socketService.off('ESIGN_INITIATED_ERROR', handleEsignError);
            socketService.off('KYC_WEBHOOK_RECEIVED', handleKycWebhook);
            socketService.off('DIGIO_WEBHOOK_RECEIVED', handleKycWebhook);
        };
    }, [
        activeTab,
        applicationId,
        fetchApplication,
        fetchRepayments,
        isRepaymentReview,
        setError,
        setIsEsignProcessing,
        setMessage,
    ]);

    useEffect(() => {
        if (!applicationId) return;
        hasLoadedRef.current = false;
        resolvedInternalIdRef.current = null;
        repaymentsLoadedRef.current = false;
        loanAccountLoadedRef.current = false;
        prepaymentLoadedKeyRef.current = null;
        sectionsLoadedRef.current = {
            documents: false,
            kyc: false,
            bank: false,
            journey: false,
        };
        documentsFetchGenRef.current += 1;
        documentsFetchInFlightRef.current = null;
        bankFetchGenRef.current += 1;
        kycFetchGenRef.current += 1;
        journeyFetchGenRef.current += 1;
        bankFetchInFlightRef.current = null;
        kycFetchInFlightRef.current = null;
        journeyFetchInFlightRef.current = null;
        setData(null);
        setSelfieCheckFeedback(null);
        setRepayments([]);
        setPrepaymentData(null);
        setLoanAccountView(null);
        setLoanAccountError('');
        setLoadingLoanAccount(false);
        setCreditDecisionResult(null);
        setCreditLoading(true);
        setError('');
        setLockWarning('');
        if (isRepaymentReview) {
            fetchRepaymentReviewContext();
        } else {
            setLoading(true);
            fetchApplication(false);
        }
    }, [
        applicationId,
        fetchApplication,
        fetchRepaymentReviewContext,
        isRepaymentReview,
        setCreditDecisionResult,
        setData,
        setError,
        setPrepaymentData,
        setRepayments,
        setSelfieCheckFeedback,
    ]);

    useEffect(() => {
        lockReleasedRef.current = false;
        const releaseLockOnce = (preferBeacon = false) => {
            if (
                lockReleasedRef.current ||
                !applicationId ||
                !isLockedByMe.current ||
                isRepaymentReview
            ) return;
            lockReleasedRef.current = true;
            isLockedByMe.current = false;
            lockSentRef.current = false;

            if (preferBeacon && typeof fetch === 'function') {
                const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1'}/admin/applications/${applicationId}/unlock`;
                try {
                    fetch(url, { method: 'POST', credentials: 'include', keepalive: true }).catch(() => {});
                    return;
                } catch {
                    // fall through to API
                }
            }
            adminAPI.unlockApplication(applicationId).catch(() => {});
        };
        const onBeforeUnload = () => releaseLockOnce(true);
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload);
            releaseLockOnce(false);
        };
    }, [applicationId, isRepaymentReview]);

    return {
        loading,
        setLoading,
        creditLoading,
        bootstrapEpoch,
        lockWarning,
        setLockWarning,
        loanAccountView,
        loadingLoanAccount,
        loanAccountError,
        loadingPrepayment,
        setLoadingPrepayment,
        hasLoadedRef,
        resolvedInternalIdRef,
        sectionsLoadedRef,
        fetchApplication,
        fetchRepayments,
        fetchLoanAccountView,
        fetchRepaymentReviewContext,
        fetchLatestCreditInBackground,
        fetchPrepayment,
        fetchDocumentsSection,
        fetchKycSection,
        fetchBankSection,
        fetchJourneySection,
    };
}
