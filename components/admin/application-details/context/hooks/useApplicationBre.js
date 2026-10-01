import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { breAPI } from '@/lib/api';
import { buildBreEvaluationsFromRow } from '../utils/breEvaluationMappers';

export function useApplicationBre({
    applicationId,
    loanApp,
    setError,
    setMessage,
    dataBreSummary,
}) {
    const [breEvaluations, setBreEvaluations] = useState([]);
    const [latestBreEvaluation, setLatestBreEvaluation] = useState(dataBreSummary || null);
    const [loadingBRE, setLoadingBRE] = useState(false);
    const [breRerunBlockedUntil, setBreRerunBlockedUntil] = useState(0);
    const [breCooldownTick, setBreCooldownTick] = useState(0);
    const breRerunInFlightRef = useRef(false);
    const breRerunDebounceRef = useRef(null);
    const [hasFetchedBre, setHasFetchedBre] = useState(Boolean(dataBreSummary));

    const breRerunWaitSec = useMemo(() => {
        if (breRerunBlockedUntil <= Date.now()) return 0;
        return Math.max(1, Math.ceil((breRerunBlockedUntil - Date.now()) / 1000));
    }, [breRerunBlockedUntil, breCooldownTick]);

    const formatBreLastRun = useCallback((evaluatedAt) => {
        if (!evaluatedAt) return null;
        const normalized = String(evaluatedAt).includes('T')
            ? evaluatedAt
            : String(evaluatedAt).replace(' ', 'T');
        const d = new Date(normalized);
        if (Number.isNaN(d.getTime())) return String(evaluatedAt);
        return d.toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    }, []);

    useEffect(() => {
        if (!latestBreEvaluation?.evaluated_at) return;
        const normalized = String(latestBreEvaluation.evaluated_at).replace(' ', 'T');
        const at = new Date(normalized).getTime();
        if (Number.isNaN(at)) return;
        const elapsedSec = (Date.now() - at) / 1000;
        const cooldown = breAPI.adminReEvaluateCooldownSec;
        if (elapsedSec < cooldown) {
            setBreRerunBlockedUntil(at + cooldown * 1000);
        }
    }, [latestBreEvaluation?.evaluation_id, latestBreEvaluation?.evaluated_at]);

    useEffect(() => {
        if (!breRerunBlockedUntil || breRerunBlockedUntil <= Date.now()) return undefined;
        const timer = setInterval(() => {
            if (Date.now() >= breRerunBlockedUntil) {
                setBreRerunBlockedUntil(0);
            } else {
                setBreCooldownTick((n) => n + 1);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [breRerunBlockedUntil]);

    const applyBreEvaluationRow = useCallback((latest) => {
        const { latest: nextLatest, evaluations } = buildBreEvaluationsFromRow(latest);
        setLatestBreEvaluation(nextLatest);
        setBreEvaluations(evaluations);
    }, []);

    const fetchBREDetails = useCallback(async (force = false) => {
        if (!applicationId) return;

        // Prevent redundant API calls if we've already fetched and aren't forcing a refresh
        if (!force && hasFetchedBre) return;

        setLoadingBRE(true);
        try {
             const resp = await breAPI.getAdminApplicationEvaluations(applicationId, {
                limit: 1,
                ...(force ? { _ts: Date.now() } : {}),
             });
             setHasFetchedBre(true);

             if (resp.success && resp.data?.length > 0) {
                applyBreEvaluationRow(resp.data[0]);
             } else if (force) {
                // Do not wipe an in-memory result just applied by reEvaluate
                // (list can lag empty briefly after a successful staff run).
             }
        } catch (err) {
             console.error('Failed to fetch BRE:', err);
        } finally {
             setLoadingBRE(false);
        }
    }, [applicationId, hasFetchedBre, applyBreEvaluationRow]);

    const applyBreAutoFromStaffAction = useCallback((response) => {
        const bre = response?.data?.breAutoEvaluation;
        if (!bre?.ran || !bre.evaluation) {
            return;
        }
        applyBreEvaluationRow({
            ...bre.evaluation,
            evaluation_results: bre.evaluation.evaluation_results,
            failed_rules: bre.evaluation.failed_rules,
            evaluated_at: bre.evaluation.evaluated_at || new Date().toISOString(),
        });
        setHasFetchedBre(false);
        fetchBREDetails(true);
    }, [applyBreEvaluationRow, fetchBREDetails]);

    const runBreReEvaluate = useCallback(async (options = {}) => {
        if (!applicationId || !loanApp?.user_id) return;
        if (breRerunInFlightRef.current) return;

        const force = Boolean(options.force);
        if (!force && breRerunBlockedUntil > Date.now()) {
            setMessage(`BRE cooldown: wait ${breRerunWaitSec}s, or hold Shift and click RE-RUN.`);
            return;
        }

        breRerunInFlightRef.current = true;
        setLoadingBRE(true);
        setError('');
        setMessage('');
        try {
          const resp = await breAPI.reEvaluateApplication({
            user_id: loanApp.user_id,
            application_id: loanApp?.id || applicationId,
            force
          });
          if (resp.success) {
            const row = resp.data;
            if (row?.overall_decision) {
              applyBreEvaluationRow({
                ...row,
                evaluation_results: row.evaluation_results,
                failed_rules: row.failed_rules,
                evaluated_at: row.evaluated_at || new Date().toISOString(),
              });
            }
            setBreRerunBlockedUntil(Date.now() + breAPI.adminReEvaluateCooldownSec * 1000);
            setMessage(
              row?.overall_decision
                ? `BRE complete: ${row.overall_decision.replace(/_/g, ' ')} (score ${row.approval_score ?? 0}%)`
                : 'Evaluation triggered successfully'
            );
            setHasFetchedBre(false);
            // Soft refresh only — keep the row we just applied if list is temporarily empty
            try {
              const refresh = await breAPI.getAdminApplicationEvaluations(applicationId, {
                limit: 1,
                _ts: Date.now(),
              });
              if (refresh.success && refresh.data?.length > 0) {
                applyBreEvaluationRow(refresh.data[0]);
              }
              setHasFetchedBre(true);
            } catch {
              setHasFetchedBre(true);
            }
          } else {
            setError(resp.message || 'Failed to trigger evaluation');
          }
        } catch (err) {
          const payload = err?.code ? err : err.response?.data;
          if (payload?.code === 'BRE_COOLDOWN') {
            if (payload.data) {
              applyBreEvaluationRow(payload.data);
            }
            if (payload.retry_after_sec) {
              setBreRerunBlockedUntil(Date.now() + payload.retry_after_sec * 1000);
            }
            setMessage(payload.message || 'BRE was run recently — showing last result.');
            return;
          }
          if (payload?.code === 'BRE_IN_PROGRESS') {
            setMessage(payload.message || 'BRE is already running for this application.');
            return;
          }
          setError(payload?.message || err.message || 'Evaluation trigger failed');
        } finally {
          breRerunInFlightRef.current = false;
          setLoadingBRE(false);
        }
    }, [
        applicationId,
        loanApp?.id,
        loanApp?.user_id,
        breRerunBlockedUntil,
        breRerunWaitSec,
        applyBreEvaluationRow,
        fetchBREDetails
    ]);

    const handleTriggerEvaluation = useCallback((options = {}) => {
        if (breRerunDebounceRef.current) {
            clearTimeout(breRerunDebounceRef.current);
        }
        breRerunDebounceRef.current = setTimeout(() => {
            breRerunDebounceRef.current = null;
            runBreReEvaluate(options);
        }, 400);
    }, [runBreReEvaluate]);

    return {
        breEvaluations,
        setBreEvaluations,
        latestBreEvaluation,
        setLatestBreEvaluation,
        loadingBRE,
        setLoadingBRE,
        breRerunWaitSec,
        breAdminCooldownSec: breAPI.adminReEvaluateCooldownSec,
        formatBreLastRun,
        fetchBREDetails,
        applyBreAutoFromStaffAction,
        handleTriggerEvaluation,
        applyBreEvaluationRow,
        setHasFetchedBre,
    };
}
