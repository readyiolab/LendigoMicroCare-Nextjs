import { useCallback, useEffect, useRef, useState } from 'react';
import { adminAPI } from '@/lib/api/admin';

export function useApplicationBankReport({ applicationId, loanApp }) {
    const [aaStatus, setAaStatus] = useState(null);
    const [bankReport, setBankReport] = useState(null);
    const [bankReportLoading, setBankReportLoading] = useState(false);
    const [bankReportError, setBankReportError] = useState('');

    const aaStatusRef = useRef(null);
    const bankReportRef = useRef(null);
    const inflightRef = useRef(null);

    const applicationRef = loanApp?.application_number || applicationId;

    useEffect(() => {
        aaStatusRef.current = null;
        bankReportRef.current = null;
        setAaStatus(null);
        setBankReport(null);
        setBankReportError('');
        inflightRef.current = null;
    }, [applicationRef]);

    const fetchBankReport = useCallback(async ({ force = false } = {}) => {
        if (!applicationRef) return null;
        if (!force && (aaStatusRef.current || bankReportRef.current)) {
            return { aaStatus: aaStatusRef.current, bankReport: bankReportRef.current };
        }
        if (inflightRef.current) return inflightRef.current;

        setBankReportLoading(true);
        setBankReportError('');

        const promise = Promise.all([
            adminAPI.getCreditDecisionAaStatus(applicationRef, { force }).catch(() => null),
            adminAPI.getCreditBankDataReport(applicationRef, { force }).catch(() => null),
        ])
            .then(([statusRes, bankRes]) => {
                const s = statusRes?.status === 1 ? statusRes.data : null;
                const b = bankRes?.status === 1 ? bankRes.data : null;
                aaStatusRef.current = s;
                bankReportRef.current = b;
                if (s) setAaStatus(s);
                if (b) setBankReport(b);
                if (!s && statusRes?.message) setBankReportError(statusRes.message);
                return { aaStatus: s, bankReport: b };
            })
            .catch((err) => {
                setBankReportError(err?.message || 'Failed to load AA / bank data');
                return null;
            })
            .finally(() => {
                inflightRef.current = null;
                setBankReportLoading(false);
            });

        inflightRef.current = promise;
        return promise;
    }, [applicationRef]);

    const invalidateBankReport = useCallback(() => {
        aaStatusRef.current = null;
        bankReportRef.current = null;
        setAaStatus(null);
        setBankReport(null);
        setBankReportError('');
        inflightRef.current = null;
    }, []);

    return {
        aaStatus,
        setAaStatus,
        bankReport,
        setBankReport,
        bankReportLoading,
        bankReportError,
        fetchBankReport,
        invalidateBankReport,
    };
}
