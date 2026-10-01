import { useCallback, useEffect, useRef } from 'react';
import { adminAPI } from '@/lib/api';
import { esignErrorMessage } from '../utils/esignErrorMessage';

const ESIGN_POLL_INTERVAL_MS = 2000;
const ESIGN_POLL_MAX_ATTEMPTS = 30; // ~60s

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBankVerifiedFromPayload(data) {
    return (
        data?.bank_verified === true ||
        data?.verified === true ||
        Number(data?.is_verified) === 1
    );
}

function applyBankVerifiedToState(prev, payload, extra = {}) {
    if (!prev) return prev;
    const verified = isBankVerifiedFromPayload(payload);
    return {
        ...prev,
        bankDetails: {
            ...(prev.bankDetails || {}),
            ...extra,
            ...(verified
                ? {
                    is_verified: 1,
                    penny_drop_status: payload?.penny_drop_status || 'success',
                }
                : {}),
        },
    };
}

export function useApplicationKyc({
    applicationId,
    loanApp,
    admin,
    setData,
    setError,
    setMessage,
    setUpdating,
    fetchApplication,
    fetchKycSection,
    fetchBankSection,
    applyBreAutoFromStaffAction,
    onUpdate,
    isEsignProcessing,
    setIsEsignProcessing,
    selfieCheckFeedback,
    setSelfieCheckFeedback,
}) {
    const esignPollCancelRef = useRef(false);

    useEffect(() => {
        if (!isEsignProcessing) {
            esignPollCancelRef.current = true;
            return undefined;
        }
        const timeout = setTimeout(() => {
            console.warn('[ApplicationContext] E-Sign processing timeout — clearing state');
            esignPollCancelRef.current = true;
            setIsEsignProcessing(false);
            setMessage('');
            fetchApplication(true);
        }, 90000); // 90 seconds
        return () => clearTimeout(timeout);
    }, [isEsignProcessing, fetchApplication, setIsEsignProcessing, setMessage]);

    const pollUntilEsignSettled = useCallback(async () => {
        esignPollCancelRef.current = false;
        for (let attempt = 0; attempt < ESIGN_POLL_MAX_ATTEMPTS; attempt += 1) {
            if (esignPollCancelRef.current) return;
            await sleep(ESIGN_POLL_INTERVAL_MS);
            if (esignPollCancelRef.current) return;
            try {
                const resp = await adminAPI.getApplicationDetails(applicationId, { include: 'credit' });
                const status = String(resp?.data?.application?.esign_status || '').toLowerCase();
                if (['sent', 'initiated', 'signed', 'completed'].includes(status)) {
                    setMessage(
                        ['signed', 'completed'].includes(status)
                            ? 'E-Sign completed by customer.'
                            : 'E-Sign sent — waiting for customer to sign.'
                    );
                    setIsEsignProcessing(false);
                    await fetchApplication(true);
                    if (onUpdate) onUpdate();
                    return;
                }
            } catch (err) {
                console.warn('[useApplicationKyc] E-sign poll failed:', err?.message || err);
            }
        }
        if (esignPollCancelRef.current) return;
        setIsEsignProcessing(false);
        setMessage('E-Sign is taking longer than expected. Refresh the application to check status.');
        await fetchApplication(true);
    }, [applicationId, fetchApplication, onUpdate, setIsEsignProcessing, setMessage]);

    const handleInitiateDigioKYC = useCallback(async () => {
        setUpdating(true);
        setError('');
        setMessage('');
        try {
            const response = await adminAPI.initiateDigioKYC(applicationId);
            if (response.status === 1) {
                const accessUrl = response.data?.accessUrl || response.data?.kycUrl;
                const requestId = response.data?.requestId;
                const emailSent = !!response.data?.emailSent;
                const emailTo = response.data?.emailTo;
                setMessage(
                    accessUrl
                        ? emailSent
                            ? `Digitap DigiLocker started (Txn: ${requestId || '—'}). Link emailed to ${emailTo || 'customer'} for Aadhaar + PAN.`
                            : `Digitap DigiLocker started (Txn: ${requestId || '—'}). Open or copy the link for the customer (no email on file / email not sent).`
                        : response.data?.message ||
                          `Digitap DigiLocker initiated (Txn: ${requestId}).`
                );
                if (accessUrl && typeof window !== 'undefined') {
                    try {
                        await navigator.clipboard?.writeText?.(accessUrl);
                        setMessage((prev) => `${prev} Link copied to clipboard.`);
                    } catch {
                        /* clipboard may be blocked */
                    }
                    setData((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  digilockerAccessUrl: accessUrl,
                                  kyc_details: {
                                      ...(prev.kyc_details || {}),
                                      digilocker_access_url: accessUrl,
                                      digio_request_id: requestId || prev.kyc_details?.digio_request_id,
                                  },
                              }
                            : prev
                    );
                }
                await fetchKycSection(true);
                if (onUpdate) onUpdate();
            } else {
                setError(response.message || 'Failed to initiate verification');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Initiation failed');
        } finally {
            setUpdating(false);
        }
    }, [applicationId, fetchKycSection, onUpdate, setData, setError, setMessage, setUpdating]);

    const handleVerifyBankDetails = useCallback(async () => {
        setUpdating(true);
        setError('');
        setMessage('');
        try {
            const response = await adminAPI.verifyBankDetails(applicationId);
            if (response.status === 1) {
                // The API returns 200 even when Digitap declines, so trust the payload flags.
                const pennyFailed =
                    response.data?.verified === false || response.data?.status === 'failed';
                if (pennyFailed) {
                    setError(
                        response.data?.wf_customer_message ||
                        response.message ||
                        'Bank verification failed. Check IFSC / account number and try again.'
                    );
                } else {
                    setMessage(response.message || 'Penny Drop verified successfully');
                    setData((prev) => applyBankVerifiedToState(prev, response.data, {
                        bank_matched_name: response.data?.bankMatchedName ?? prev?.bankDetails?.bank_matched_name,
                        fuzzy_match_score: response.data?.fuzzyMatchScore ?? prev?.bankDetails?.fuzzy_match_score,
                    }));
                }
                applyBreAutoFromStaffAction(response);
                // Do not block spinner on section refresh
                void fetchBankSection(true);
                if (onUpdate) onUpdate();
            } else {
                setError(response.message || 'Failed to verify bank details');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Verification failed');
        } finally {
            setUpdating(false);
        }
    }, [applicationId, fetchBankSection, onUpdate, applyBreAutoFromStaffAction, setData, setMessage, setError, setUpdating]);

    const handleManualVerifyBank = useCallback(async (remark) => {
        if (!remark || String(remark).trim().length < 10) {
            setError('Please enter a remark (at least 10 characters) to manually verify the bank account');
            return;
        }
        setUpdating(true);
        setError('');
        setMessage('');
        try {
            const response = await adminAPI.manualVerifyBankDetails(applicationId, { remark });
            if (response.status === 1) {
                setMessage(response.message || 'Bank account manually verified');
                setData((prev) => applyBankVerifiedToState(prev, response.data, {
                    is_manual_verified: 1,
                    penny_drop_remark: remark,
                }));
                applyBreAutoFromStaffAction(response);
                void fetchBankSection(true);
                if (onUpdate) onUpdate();
            } else {
                setError(response.message || 'Manual bank verification failed');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Manual bank verification failed');
        } finally {
            setUpdating(false);
        }
    }, [applicationId, fetchBankSection, onUpdate, applyBreAutoFromStaffAction, setData, setMessage, setError, setUpdating]);

    /** viaAdmin: admin PATCH (Overview / Loan Account / post e-sign); otherwise the Digitap KYC PUT */
    const handleUpdateDisbursalBankDetails = useCallback(async ({ ifscCode, accountNumber, viaAdmin = false } = {}) => {
        const ifsc = String(ifscCode || '').trim().toUpperCase();
        const account = String(accountNumber || '').trim().replace(/\s+/g, '');
        if (!ifsc && !account) {
            setError('Enter IFSC and/or account number to update');
            return false;
        }
        setUpdating(true);
        setError('');
        setMessage('');
        try {
            const payload = {
                ifsc_code: ifsc || undefined,
                account_number: account || undefined,
            };
            const response = viaAdmin
                ? await adminAPI.updateLoanBankDetails(applicationId, payload)
                : await adminAPI.updateDisbursalBankDetails(applicationId, payload);
            if (response.status === 1) {
                setMessage(response.message || 'Bank details updated. Click Verify bank (₹1).');
                const updatedBank = response.data?.bankDetails || null;
                setData((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        bankDetails: {
                            ...(prev.bankDetails || {}),
                            ...(updatedBank || {
                                ifsc_code: ifsc || prev.bankDetails?.ifsc_code,
                                account_number: account || prev.bankDetails?.account_number,
                                account_number_masked:
                                    response.data?.account_number_masked ||
                                    (account ? `****${account.slice(-4)}` : prev.bankDetails?.account_number_masked),
                                is_verified: 0,
                                is_manual_verified: 0,
                                penny_drop_status: 'pending',
                                penny_drop_ref: null,
                                penny_drop_remark: null,
                            }),
                        },
                    };
                });
                await fetchBankSection(true);
                if (onUpdate) onUpdate();
                return true;
            } else {
                setError(response.message || 'Failed to update bank details');
                return false;
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to update bank details');
            return false;
        } finally {
            setUpdating(false);
        }
    }, [applicationId, fetchBankSection, onUpdate, setData, setError, setMessage, setUpdating]);

    /** Ops or Credit Manager may run post-offer Digitap e-sign / e-mandate. */
    const canRunPostOfferDigio = useCallback(() => {
        const role = String(admin?.role_code || admin?.role || '').toLowerCase();
        return ['operations', 'operations_manager', 'credit_manager', 'underwriter', 'super_admin', 'admin'].includes(role);
    }, [admin]);
    const isOpsStaff = canRunPostOfferDigio;

    const handleInitiateEsign = useCallback(async () => {
        if (!canRunPostOfferDigio()) {
            setError('Only Credit Manager, Underwriter, or Operations can send the loan agreement for signing.');
            return;
        }
        if (isEsignProcessing) {
            setMessage('E-Sign generation is already in progress. Please wait...');
            return;
        }
        setUpdating(true);
        setIsEsignProcessing(true);
        setError('');
        setMessage('');
        try {
            const response = await adminAPI.initiateEsign(applicationId);
            if (response.status === 1) {
                if (response.message && String(response.message).toLowerCase().includes('queued')) {
                    setMessage('E-Sign generation started in background. Please wait...');
                    // Socket clears processing early; poll is fallback if socket misses
                    pollUntilEsignSettled();
                } else {
                    setMessage(response.message || 'E-Sign request initiated successfully!');
                    fetchApplication(true);
                    if (onUpdate) onUpdate();
                    setIsEsignProcessing(false);
                }
            } else {
                setMessage('');
                setError(esignErrorMessage(response.message, response.errors?.code));
                setIsEsignProcessing(false);
            }
        } catch (err) {
            const data = err.response?.data;
            setMessage('');
            setError(esignErrorMessage(data?.message || err.message, data?.errors?.code));
            setIsEsignProcessing(false);
        } finally {
            setUpdating(false);
        }
    }, [
        applicationId,
        fetchApplication,
        onUpdate,
        isOpsStaff,
        canRunPostOfferDigio,
        isEsignProcessing,
        pollUntilEsignSettled,
        setError,
        setIsEsignProcessing,
        setMessage,
        setUpdating,
    ]);

    const handleInitiateMandate = useCallback(async (authMode = 'Netbanking') => {
        if (!isOpsStaff()) {
            setError('Only Credit Manager, Underwriter, or Operations can register EMI auto-debit.');
            return;
        }
        setUpdating(true);
        setError('');
        setMessage('');
        try {
            const response = await adminAPI.initiateMandate(applicationId, {
                mandate_type: 'NACH',
                auth_mode: authMode || 'Netbanking',
            });
            if (response.status === 1) {
                const authLink =
                    response.data?.authLink ||
                    response.data?.authorizationUrl ||
                    response.authLink ||
                    null;
                setMessage(
                    authLink
                        ? `${response.message || 'Auto-debit mandate initiated.'} Auth link ready — use Copy / Open / Resend below.`
                        : (response.message || 'Auto-Debit Mandate initiated successfully!')
                );
                fetchApplication(true);
                if (typeof fetchBankSection === 'function') fetchBankSection(true);
                if (onUpdate) onUpdate();
            } else {
                setError(response.message || 'Failed to initiate Auto-Debit Mandate');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Mandate initiation failed');
        } finally {
            setUpdating(false);
        }
    }, [applicationId, fetchApplication, fetchBankSection, onUpdate, isOpsStaff]);

    const handleManualVerifyMandate = useCallback(async (remark) => {
        if (!isOpsStaff()) {
            setError('Only Credit Manager, Underwriter, or Operations can manually verify e-mandate.');
            return;
        }
        if (!remark || String(remark).trim().length < 10) {
            setError('Please enter a remark (at least 10 characters) to manually verify e-mandate');
            return;
        }
        setUpdating(true);
        setError('');
        setMessage('');
        try {
            const response = await adminAPI.manualVerifyMandate(applicationId, { remark });
            if (response.status === 1) {
                setMessage(response.message || 'e-Mandate manually verified');
                setData((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        application: {
                            ...(prev.application || {}),
                            mandate_status: 'registered',
                            application_status: 'payment_pending',
                            customer_status: 'payment_pending',
                        },
                        mandateRegistration: {
                            ...(prev.mandateRegistration || {}),
                            status: 'registered',
                            is_manual_verified: 1,
                        },
                    };
                });
                fetchApplication(true);
                if (typeof fetchBankSection === 'function') fetchBankSection(true);
                if (onUpdate) onUpdate();
            } else {
                setError(response.message || 'Manual e-mandate verification failed');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Manual e-mandate verification failed');
        } finally {
            setUpdating(false);
        }
    }, [applicationId, fetchApplication, fetchBankSection, onUpdate, isOpsStaff, setData]);

    const handleResendMandateAuthLink = useCallback(async () => {
        if (!isOpsStaff()) {
            setError('Only Credit Manager, Underwriter, or Operations can resend the mandate link.');
            return;
        }
        setUpdating(true);
        setError('');
        setMessage('');
        try {
            const response = await adminAPI.resendMandateAuthLink(applicationId);
            if (response.status === 1) {
                const authLink =
                    response.data?.authLink ||
                    response.data?.authorizationUrl ||
                    response.authLink ||
                    null;
                setMessage(
                    authLink
                        ? (response.message || 'Mandate authorization link re-sent to customer.')
                        : (response.message || 'Mandate link re-sent.')
                );
                if (typeof fetchBankSection === 'function') fetchBankSection(true);
            } else {
                setError(response.message || 'Failed to resend mandate link');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to resend mandate link');
        } finally {
            setUpdating(false);
        }
    }, [applicationId, fetchBankSection, isOpsStaff]);

    const handleFaceMatch = useCallback(async () => {
        setUpdating(true);
        setError('');
        setMessage('');
        try {
            const response = await adminAPI.faceMatch(applicationId);
            if (response.status === 1) {
                const isSuccess = response.success !== false && response.data?.success !== false;
                setSelfieCheckFeedback({
                    matchScore: response.data?.matchScore,
                    faceMatchStatus: isSuccess ? 'matched' : 'failed',
                    message: response.message || response.data?.message,
                });
                if (isSuccess) {
                    // Optimistic update for instant UI
                    setData((prev) => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            selfie: {
                                ...(prev.selfie || {}),
                                face_match_status: 'matched',
                                face_match_score: response.data?.matchScore,
                            },
                        };
                    });
                    setMessage(response.message || response.data?.message || 'Face match completed');
                    applyBreAutoFromStaffAction(response);
                } else {
                    setError(response.data?.wf_customer_message || response.wf_customer_message || response.message || response.data?.message || 'Face match failed');
                }
                await fetchKycSection(true);
                if (onUpdate) onUpdate();
            } else {
                setError(response.data?.wf_customer_message || response.wf_customer_message || response.message || 'Face match failed');
            }
        } catch (err) {
            setError(err.response?.data?.wf_customer_message || err.response?.data?.message || err.message || 'Face match failed');
        } finally {
            setUpdating(false);
        }
    }, [applicationId, fetchKycSection, onUpdate, applyBreAutoFromStaffAction]);

    const handleLivenessCheck = useCallback(async () => {
        setUpdating(true);
        setError('');
        setMessage('');
        try {
            const response = await adminAPI.livenessCheck(applicationId);
            if (response.status === 1) {
                const isSuccess = response.success !== false && response.data?.success !== false;
                setSelfieCheckFeedback((prev) => ({
                    ...prev,
                    matchScore: response.data?.matchScore ?? prev?.matchScore,
                    livenessResult: response.data?.livenessResult,
                    livenessSuccess: isSuccess,
                    liveness_check: response.data?.liveness_check,
                    message: response.message || response.data?.message,
                }));
                if (isSuccess) {
                    // Optimistic update for instant UI
                    setData((prev) => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            selfie: {
                                ...(prev.selfie || {}),
                                liveness_check: 1,
                                liveness_response: response.data?.digio ? JSON.stringify(response.data.digio) : (prev.selfie?.liveness_response),
                            },
                        };
                    });
                    setMessage(response.message || response.data?.message || 'Liveness check completed');
                    applyBreAutoFromStaffAction(response);
                } else {
                    setError(response.data?.wf_customer_message || response.wf_customer_message || response.message || response.data?.message || 'Liveness check failed');
                }
                await fetchKycSection(true);
                if (onUpdate) onUpdate();
            } else {
                setError(response.data?.wf_customer_message || response.wf_customer_message || response.message || 'Liveness check failed');
            }
        } catch (err) {
            setError(err.response?.data?.wf_customer_message || err.response?.data?.message || err.message || 'Liveness check failed');
        } finally {
            setUpdating(false);
        }
    }, [applicationId, fetchKycSection, onUpdate, applyBreAutoFromStaffAction]);

    const handleRejectSelfie = useCallback(async (reason) => {
        setUpdating(true);
        setError('');
        setMessage('');
        try {
            const response = await adminAPI.rejectSelfie(applicationId, { reason });
            if (response.status === 1) {
                setMessage(response.message || 'Email sent — customer can open the link on their phone and take a new selfie.');
                await fetchKycSection(true);
                if (onUpdate) onUpdate();
            } else {
                setError(response.message || 'Could not send the selfie email. Check that the customer has an email on file.');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Reject selfie failed');
        } finally {
            setUpdating(false);
        }
    }, [applicationId, fetchKycSection, onUpdate]);

    const handleManualVerifyPan = useCallback(async (panNumber, remark) => {
        const pan = String(panNumber || '').trim().toUpperCase();
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
            setError('Enter a valid PAN (e.g. ABCDE1234F)');
            return;
        }
        if (!remark || String(remark).trim().length < 10) {
            setError('Please enter a remark (at least 10 characters) to manually verify PAN');
            return;
        }
        if (!loanApp?.user_id) {
            setError('User not found for this application');
            return;
        }

        setUpdating(true);
        setError('');
        setMessage('');
        try {
            const response = await adminAPI.manualVerifyPan(loanApp.user_id, {
                pan,
                remark: String(remark).trim(),
                name: loanApp?.customer_name || undefined,
            });
            if (response.status === 1) {
                setMessage(response.message || 'PAN marked as verified (manual)');
                setData((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        pan_verification: {
                            ...(prev.pan_verification || {}),
                            verification_status: 'valid',
                            wf_source: 'MANUAL',
                            pan_number: pan,
                            pancard: pan,
                        },
                        profile: {
                            ...(prev.profile || {}),
                            pancard: pan,
                            pancard_verified: 1,
                        },
                    };
                });
                applyBreAutoFromStaffAction(response);
                await fetchKycSection(true);
                if (onUpdate) onUpdate();
            } else {
                setError(response.message || 'Manual PAN verification failed');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Manual PAN verification failed');
        } finally {
            setUpdating(false);
        }
    }, [loanApp, fetchKycSection, onUpdate, applyBreAutoFromStaffAction, setData]);

    const handleVerifyPan = useCallback(async (panNumber, fullName, dob) => {
        if (!panNumber || !fullName || !dob) {
            setError('PAN Number, Name, and DOB are required for verification');
            return;
        }

        setUpdating(true);
        setError('');
        setMessage('');
        try {
            const datePart = String(dob).split('T')[0];
            let formattedDob = datePart;
            if (datePart.includes('-')) {
                const parts = datePart.split('-');
                if (parts.length === 3) {
                    formattedDob = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
            }

            const response = await adminAPI.verifyPan(loanApp.user_id, {
                id_no: panNumber,
                name: fullName,
                dob: formattedDob
            });

            // Only treat as verified when Digitap returns valid status
            const digioSuccess = response.data?.success === true || response.data?.data?.status === 'valid';

            if (response.status === 1 && digioSuccess) {
                // Optimistic update
                setData((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        profile: {
                            ...(prev.profile || {}),
                            pancard: panNumber,
                            pancard_verified: 1,
                        },
                    };
                });
                setMessage(response.message || 'PAN verified successfully');
                applyBreAutoFromStaffAction(response);
                await fetchKycSection(true);
                if (onUpdate) onUpdate();
            } else if (response.status === 1 && !digioSuccess) {
                // HTTP success but Digitap said invalid — show the failure message
                setError(
                    response.data?.wf_customer_message ||
                    response.data?.data?.remarks ||
                    response.message ||
                    'PAN verification failed — the details did not match'
                );
                await fetchKycSection(true);
            } else {
                setError(response.message || 'PAN verification failed');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'PAN verification failed');
        } finally {
            setUpdating(false);
        }
    }, [loanApp?.user_id, fetchKycSection, onUpdate, applyBreAutoFromStaffAction]);

    const handleVerifyEmployment = useCallback(async (identifierOrOpts, uanHistory = 'YES') => {
        let lookupType = 'UAN';
        let identifier = identifierOrOpts;
        let historyFlag = uanHistory;

        if (identifierOrOpts && typeof identifierOrOpts === 'object' && !Array.isArray(identifierOrOpts)) {
            lookupType = String(identifierOrOpts.type || 'UAN').toUpperCase() === 'MOBILE' ? 'MOBILE' : 'UAN';
            identifier = identifierOrOpts.identifier;
            if (identifierOrOpts.uan_history != null) historyFlag = identifierOrOpts.uan_history;
        }

        const digits = String(identifier || '').replace(/\D/g, '');
        if (lookupType === 'MOBILE') {
            const mobile = digits.length >= 10 ? digits.slice(-10) : digits;
            if (!/^\d{10}$/.test(mobile)) {
                setError('Customer mobile is missing or invalid (need 10 digits)');
                return;
            }
            identifier = mobile;
        } else if (!/^\d{12}$/.test(digits)) {
            setError('Enter a valid 12-digit UAN');
            return;
        } else {
            identifier = digits;
        }

        setUpdating(true);
        setError('');
        setMessage('');
        try {
            const response = await adminAPI.verifyEmployment(applicationId, {
                type: lookupType,
                identifier,
                uan_history: historyFlag
            });
            if (response.status === 1) {
                setMessage(response.message || 'Employment verification completed');
                // Optimistic patch so employer cards show immediately (full Digitap payload)
                const respData = response.data || {};
                const historyRaw = respData.employment_history;
                const historyArr = Array.isArray(historyRaw)
                    ? historyRaw
                    : typeof historyRaw === 'string'
                        ? (() => { try { return JSON.parse(historyRaw); } catch { return []; } })()
                        : [];
                const primaryUan = respData.uan || (lookupType === 'UAN' ? identifier : null);
                setData((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        employment: {
                            uan: primaryUan,
                            uan_status: 'success',
                            moonlighting_detected:
                                respData.moonlighting_detected ??
                                (response.moonlightingDetected ? 1 : 0),
                            employment_history: historyArr,
                            summary: respData.summary || null,
                            uan_list: respData.uan_list || (primaryUan ? [primaryUan] : []),
                            basic_details_by_uan: respData.basic_details_by_uan || {},
                            epfo_details: respData.epfo_details || null,
                            name_dob_filtering_score: respData.name_dob_filtering_score ?? null,
                            input_data:
                                respData.input_data ||
                                (lookupType === 'MOBILE' ? { mobile: identifier } : { uan: identifier }),
                            verified_at: new Date().toISOString(),
                        },
                    };
                });
                fetchKycSection(true);
                if (onUpdate) onUpdate();
            } else {
                const code = Number(response.errors?.result_code ?? response.result_code);
                if (code === 103 || /no record/i.test(String(response.message || ''))) {
                    setError(
                        'No employment records found for this UAN or mobile. Confirm the number with the customer and try again.'
                    );
                } else {
                    setError(response.message || 'Employment verification failed');
                }
            }
        } catch (err) {
            const payload = err.response?.data || err;
            const code = Number(
                payload?.errors?.result_code ??
                payload?.result_code ??
                err.result_code ??
                err.errors?.result_code
            );
            const raw = String(
                payload?.message ||
                err.message ||
                (typeof payload === 'string' ? payload : '') ||
                ''
            ).trim();

            if (code === 103 || /no record/i.test(raw)) {
                setError(
                    'No employment records found for this UAN or mobile. Confirm the number with the customer and try again.'
                );
            } else if (/source is busy|busy or unavailable|try again later/i.test(raw)) {
                setError('EPFO / Digitap source is currently busy or unavailable. Please wait a few moments and try again.');
            } else if (err.status === 503 || payload?.status === 503 || /503/i.test(raw)) {
                setError(raw && !/Request failed|AxiosError/i.test(raw) ? raw : 'Employment verification service is temporarily busy. Please try again shortly.');
            } else {
                setError(raw && !/Request failed|AxiosError/i.test(raw) ? raw : 'Employment verification failed. Please try again.');
            }
        } finally {
            setUpdating(false);
        }
    }, [applicationId, fetchKycSection, onUpdate]);

    const handleUpdateUPIId = useCallback(async (upiId) => {
        if (!upiId) return;
        setUpdating(true);
        setError('');
        setMessage('');
        try {
            const response = await adminAPI.updateUPIId(applicationId, { upiId });
            if (response.status === 1) {
                setMessage(response.message || 'UPI ID updated successfully');
                fetchApplication(true);
                if (onUpdate) onUpdate();
            } else {
                setError(response.message || 'Failed to update UPI ID');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update UPI ID');
        } finally {
            setUpdating(false);
        }
    }, [applicationId, fetchApplication, onUpdate]);

    return {
        isEsignProcessing,
        setIsEsignProcessing,
        selfieCheckFeedback,
        setSelfieCheckFeedback,
        handleInitiateDigioKYC,
        handleVerifyBankDetails,
        handleManualVerifyBank,
        handleUpdateDisbursalBankDetails,
        isOpsStaff,
        handleInitiateEsign,
        handleInitiateMandate,
        handleManualVerifyMandate,
        handleResendMandateAuthLink,
        handleFaceMatch,
        handleLivenessCheck,
        handleRejectSelfie,
        handleVerifyPan,
        handleManualVerifyPan,
        handleVerifyEmployment,
        handleUpdateUPIId,
    };
}
