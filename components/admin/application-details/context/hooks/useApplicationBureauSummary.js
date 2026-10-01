import { useCallback, useEffect, useRef, useState } from 'react';
import { adminAPI } from '@/lib/api';

export function useApplicationBureauSummary({ applicationId, loanApp }) {
    const [bureauSummary, setBureauSummary] = useState(null);
    const [bureauSummaryLoading, setBureauSummaryLoading] = useState(false);
    const bureauSummaryRef = useRef(null);
    const inflightRef = useRef(null);

    const [bureauDetail, setBureauDetail] = useState(null);
    const [bureauDetailLoading, setBureauDetailLoading] = useState(false);
    const [bureauDetailError, setBureauDetailError] = useState('');
    const bureauDetailRef = useRef(null);
    const inflightDetailRef = useRef(null);

    const applicationRef = loanApp?.application_number || applicationId;

    useEffect(() => {
        bureauSummaryRef.current = null;
        setBureauSummary(null);
        inflightRef.current = null;
        bureauDetailRef.current = null;
        setBureauDetail(null);
        setBureauDetailError('');
        inflightDetailRef.current = null;
    }, [applicationRef]);

    const fetchBureauSummary = useCallback(async ({ force = false } = {}) => {
        if (!applicationRef) return null;
        if (!force && bureauSummaryRef.current) return bureauSummaryRef.current;
        if (inflightRef.current) return inflightRef.current;

        setBureauSummaryLoading(true);
        const promise = adminAPI
            .getCreditBureauSummary(applicationRef)
            .then((res) => {
                if (res?.status === 1 && res.data) {
                    bureauSummaryRef.current = res.data;
                    setBureauSummary(res.data);
                    return res.data;
                }
                bureauSummaryRef.current = null;
                setBureauSummary(null);
                return null;
            })
            .catch(() => {
                bureauSummaryRef.current = null;
                setBureauSummary(null);
                return null;
            })
            .finally(() => {
                inflightRef.current = null;
                setBureauSummaryLoading(false);
            });

        inflightRef.current = promise;
        return promise;
    }, [applicationRef]);

    const fetchBureauDetail = useCallback(async ({ force = false } = {}) => {
        if (!applicationRef) return null;
        if (!force && bureauDetailRef.current) return bureauDetailRef.current;
        if (inflightDetailRef.current) return inflightDetailRef.current;

        setBureauDetailLoading(true);
        setBureauDetailError('');
        const promise = adminAPI
            .getCreditBureauDetail(applicationRef)
            .then((res) => {
                if (res?.status === 1 && res.data) {
                    bureauDetailRef.current = res.data;
                    setBureauDetail(res.data);
                    return res.data;
                }
                bureauDetailRef.current = null;
                setBureauDetail(null);
                if (res?.message) setBureauDetailError(res.message);
                return null;
            })
            .catch((err) => {
                bureauDetailRef.current = null;
                setBureauDetail(null);
                setBureauDetailError(err?.message || 'Failed to load full credit report');
                return null;
            })
            .finally(() => {
                inflightDetailRef.current = null;
                setBureauDetailLoading(false);
            });

        inflightDetailRef.current = promise;
        return promise;
    }, [applicationRef]);

    const invalidateBureauSummary = useCallback(() => {
        bureauSummaryRef.current = null;
        setBureauSummary(null);
        inflightRef.current = null;
        bureauDetailRef.current = null;
        setBureauDetail(null);
        setBureauDetailError('');
        inflightDetailRef.current = null;
    }, []);

    return {
        bureauSummary,
        setBureauSummary,
        bureauSummaryLoading,
        fetchBureauSummary,
        bureauDetail,
        setBureauDetail,
        bureauDetailLoading,
        bureauDetailError,
        fetchBureauDetail,
        invalidateBureauSummary,
    };
}
