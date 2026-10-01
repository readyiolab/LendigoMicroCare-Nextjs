import { useState } from 'react';
import { adminAPI } from '@/lib/api';

export function useApplicationCreditDecision({
    applicationId,
    loanApp,
    setCreditDecisionResult,
    fetchBureauSummary,
    invalidateBureauSummary,
    fetchApplication,
    onUpdate,
}) {
    const [creditDecisionLoading, setCreditDecisionLoading] = useState(false);
    const [creditDecisionError, setCreditDecisionError] = useState('');
    const [crifMissingDialog, setCrifMissingDialog] = useState({
        open: false,
        missing: [],
        prefilled: {},
        ref: null,
    });

    const afterCreditResult = async (data) => {
        setCreditDecisionResult(data);
        invalidateBureauSummary?.();
        await fetchBureauSummary?.({ force: true });
        const verdict = data?.finalVerdict || data?.verdict;
        if (verdict === 'REJECTED') {
            await fetchApplication?.(true);
            onUpdate?.();
        }
    };

    const executeCreditDecision = async (ref, overrides = null) => {
        setCreditDecisionLoading(true);
        setCreditDecisionError('');
        setCreditDecisionResult(null);
        try {
            const res = await adminAPI.runCreditDecision(ref, overrides);
            if (res.status === 1) {
                await afterCreditResult(res.data);
            } else {
                setCreditDecisionError(res.message || 'Credit decision failed');
            }
        } catch (err) {
            const data = err.response?.data || err;
            const msg = data?.message || err.message || 'Credit decision failed';
            setCreditDecisionError(msg);
            const isValidation =
                data?.code === 'DIGITAP_CRIF_VALIDATION' ||
                /applicant incomplete|missing/i.test(msg);
            if (isValidation) {
                const apiMissing = Array.isArray(data?.missing) ? data.missing : [];
                if (apiMissing.length > 0) {
                    setCrifMissingDialog({
                        open: true,
                        missing: apiMissing,
                        prefilled: {},
                        ref,
                    });
                } else {
                    try {
                        const fieldsRes = await adminAPI.getCreditApplicantFields(ref);
                        if (fieldsRes?.status === 1 && fieldsRes.data?.missing?.length > 0) {
                            setCrifMissingDialog({
                                open: true,
                                missing: fieldsRes.data.missing,
                                prefilled: fieldsRes.data.fields || {},
                                ref,
                            });
                        }
                    } catch {
                        /* ignore */
                    }
                }
            }
        } finally {
            setCreditDecisionLoading(false);
        }
    };

    const handleCreditDecision = async ({ forceCrif = false } = {}) => {
        const ref = loanApp?.application_number || applicationId;
        if (!ref) return;

        await executeCreditDecision(ref, forceCrif ? { force: true } : null);
    };

    const handleCrifMissingConfirm = async (overrides) => {
        const ref = crifMissingDialog.ref;
        setCrifMissingDialog({ open: false, missing: [], prefilled: {}, ref: null });
        if (ref) await executeCreditDecision(ref, overrides);
    };

    const handleCrifMissingCancel = () => {
        setCrifMissingDialog({ open: false, missing: [], prefilled: {}, ref: null });
    };

    const handleForceCrifRefetch = async () => {
        invalidateBureauSummary?.();
        await handleCreditDecision({ forceCrif: true });
    };

    const handleResumeCreditDecision = async () => {
        const ref = loanApp?.application_number || applicationId;
        if (!ref) return;

        setCreditDecisionLoading(true);
        setCreditDecisionError('');
        try {
            const res = await adminAPI.resumeCreditDecision(ref);
            if (res.status === 1) {
                await afterCreditResult(res.data);
            } else {
                setCreditDecisionError(res.message || 'Resume failed');
            }
        } catch (err) {
            setCreditDecisionError(err.response?.data?.message || err.message || 'Resume failed');
        } finally {
            setCreditDecisionLoading(false);
        }
    };

    return {
        creditDecisionLoading,
        setCreditDecisionLoading,
        creditDecisionError,
        setCreditDecisionError,
        crifMissingDialog,
        setCrifMissingDialog,
        setCreditDecisionResult,
        executeCreditDecision,
        handleCreditDecision,
        handleCrifMissingConfirm,
        handleCrifMissingCancel,
        handleForceCrifRefetch,
        handleResumeCreditDecision,
    };
}
