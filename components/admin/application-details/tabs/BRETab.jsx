
import { ListChecks, ShieldCheck, CheckCircle2, XCircle, Clock, RefreshCw, FileText, TrendingUp, AlertTriangle, CreditCard, Fingerprint, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApplicationContext } from '@/components/admin/application-details/context/ApplicationContext';
import BREExplanationPanel from '@/components/admin/BREExplanationPanel';
import { computeStaffVerificationGates } from '@/lib/utils/staffVerificationGates';
import { buildBreViewFromCreditRun } from '@/components/admin/application-details/context/utils/breEvaluationMappers';
import { lacksCreditRuleBuckets } from '@/lib/utils/creditDecisionDisplay';
import { adminAPI } from '@/lib/api/admin';

export default function BRETab() {
    const { 
        breEvaluations, latestBreEvaluation, loadingBRE, 
        handleTriggerEvaluation, data, userData,
        breRerunWaitSec, breAdminCooldownSec, formatBreLastRun, creditDecisionResult,
        setCreditDecisionResult, loanApp, applicationId,
    } = useApplicationContext();

    const [detailLoading, setDetailLoading] = useState(false);
    const detailFetchedRunRef = useRef(null);
    const applicationRef = loanApp?.application_number || loanApp?.lead_id || applicationId;

    useEffect(() => {
        if (latestBreEvaluation) return undefined;
        if (!applicationRef || !creditDecisionResult) return undefined;
        if (!lacksCreditRuleBuckets(creditDecisionResult)) return undefined;

        const runKey = `${applicationRef}:${creditDecisionResult.runId || creditDecisionResult.id || 'none'}`;
        if (detailFetchedRunRef.current === runKey) return undefined;

        let cancelled = false;
        setDetailLoading(true);
        (async () => {
            try {
                const latestRes = await adminAPI.getLatestCreditDecision(applicationRef, {
                    view: 'detail',
                });
                if (cancelled) return;
                if (latestRes?.status === 1 && latestRes.data) {
                    detailFetchedRunRef.current = runKey;
                    setCreditDecisionResult((prev) =>
                        prev ? { ...prev, ...latestRes.data } : latestRes.data
                    );
                }
            } catch {
                /* ignore — table stays empty until sheet opens */
            } finally {
                if (!cancelled) setDetailLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        applicationRef,
        creditDecisionResult,
        latestBreEvaluation,
        setCreditDecisionResult,
    ]);

    const creditBridge = useMemo(
        () => buildBreViewFromCreditRun(creditDecisionResult),
        [creditDecisionResult]
    );

    const displayLatest = latestBreEvaluation || creditBridge.latest;
    const displayRules = latestBreEvaluation ? breEvaluations : (creditBridge.evaluations || []);
    const fromCreditRun = Boolean(!latestBreEvaluation && creditBridge.latest);

    const lastBreRunLabel = formatBreLastRun(displayLatest?.evaluated_at);

    const kycDetails = data?.kyc_details || {};
    const bankDetails = data?.bankDetails || data?.bank_details || {};

    const gates = computeStaffVerificationGates({
        userData,
        kycDetails,
        bankDetails,
        selfie: data?.selfie,
        breEvaluation: displayLatest,
        latestCreditRun: creditDecisionResult,
        panVerification: data?.pan_verification,
    });
    const allPrerequisitesMet = gates.panOk && gates.ekycOk && gates.bankOk && gates.selfieOk;

    return (
        <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            
            {/* Header: Actions */}
            <div className="col-span-12 flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div>
                        <h3 className="text-xs font-medium text-slate-800 uppercase tracking-widest leading-none">Result from Computer (BRE)</h3>
                        <p className="text-[10px] text-slate-500 mt-1">
                            {fromCreditRun
                                ? 'Showing latest credit-decision run (AA + bureau). Legacy BRE pack can still be run below.'
                                : `Runs automatically when PAN, Aadhaar, bank, and selfie are verified. RE-RUN is limited to once per ${breAdminCooldownSec}s per application.`}
                        </p>
                        {lastBreRunLabel && (
                            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Last run: {lastBreRunLabel}
                                {fromCreditRun && <span className="text-slate-500"> · credit decision</span>}
                                {breRerunWaitSec > 0 && (
                                    <span className="text-amber-600 font-medium"> · re-run in {breRerunWaitSec}s</span>
                                )}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {displayLatest && (
                        <>
                            <button
                                type="button"
                                title={breRerunWaitSec > 0 ? `Wait ${breRerunWaitSec}s, or Shift+click to force` : 'Shift+click to bypass cooldown'}
                                onClick={(e) => handleTriggerEvaluation({ force: e.shiftKey })}
                                disabled={loadingBRE}
                                className={cn(
                                    "h-8 px-4 rounded-lg text-[10px] font-medium uppercase tracking-widest transition-all flex items-center gap-2",
                                    breRerunWaitSec > 0 && !loadingBRE
                                        ? "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                                        : "bg-slate-900 text-white hover:bg-slate-800"
                                )}
                            >
                                <RefreshCw className={cn("w-3 h-3", loadingBRE && "animate-spin")} />
                                {loadingBRE ? 'RUNNING' : breRerunWaitSec > 0 ? `WAIT ${breRerunWaitSec}s` : fromCreditRun ? 'RUN LEGACY BRE' : 'RE-RUN'}
                            </button>
                            <span className="h-8 px-4 bg-white border border-slate-100 text-slate-500 rounded-lg text-[10px] font-medium uppercase tracking-widest inline-flex items-center">
                                Use CAM tab
                            </span>
                        </>
                    )}
                </div>
            </div>

            {loadingBRE ? (
                <div className="col-span-12 py-20 flex flex-col items-center justify-center bg-white rounded-lg border border-slate-100">
                    <Spinner size="lg" variant="primary" />
                    <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-bold animate-pulse mt-4">Running AI Calculations...</p>
                </div>
            ) : !displayLatest ? (
                <div className="col-span-12 py-20 text-center bg-white rounded-lg border border-slate-100">
                    <ShieldCheck className="w-12 h-12 text-slate-100 mx-auto mb-6" />
                    <p className="text-xs text-slate-400 font-normal mb-2">No computer decision saved yet.</p>
                    <p className="text-[10px] text-slate-500 mb-8 max-w-md mx-auto">
                        Complete Digitap KYC (PAN, Aadhaar, bank, selfie). Click Run to evaluate this application.
                    </p>
                    <Button
                        onClick={(e) => handleTriggerEvaluation({ force: e.shiftKey })}
                        disabled={!allPrerequisitesMet || loadingBRE}
                        className="rounded-lg h-12 px-12 bg-slate-900 text-white font-medium text-xs shadow-lg shadow-slate-200"
                    >
                        {loadingBRE ? 'RUNNING…' : 'RUN BRE NOW'}
                    </Button>
                </div>
            ) : (
                <>
                    {/* Summary Metrics */}
                    <div className="col-span-12 grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Confidence', value: `${displayLatest?.approval_score}%`, sub: 'How sure the computer is', color: 'text-emerald-600', progress: displayLatest?.approval_score },
                            { label: 'Risk Probability', value: `${displayLatest?.risk_score}%`, sub: 'Default trend', color: 'text-amber-600', progress: displayLatest?.risk_score },
                            { label: 'Policy ID', value: displayLatest?.policy_id || 'DEFAULT', sub: 'Active engine', color: 'text-slate-900' },
                            { label: 'Computer decision', value: displayLatest?.overall_decision?.replace(/_/g, ' '), sub: 'System Output', color: displayLatest?.overall_decision === 'auto_approved' ? 'text-emerald-700' : 'text-amber-700' }
                        ].map((stat, i) => (
                            <div key={i} className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
                                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-4">{stat.label}</p>
                                <p className={cn("text-xl font-medium tracking-tight mb-1 uppercase", stat.color)}>{stat.value}</p>
                                <p className="text-[9px] text-slate-300 font-normal uppercase tracking-tighter">{stat.sub}</p>
                                {stat.progress !== undefined && (
                                    <div className="w-full bg-slate-50 h-1 rounded-full mt-4 overflow-hidden">
                                        <div className={cn("h-full", stat.color.replace('text-', 'bg-'))} style={{ width: `${stat.progress}%` }} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="col-span-12 lg:col-span-12 xl:col-span-12 space-y-6">
                        {displayLatest?.manual_review_reason && (
                            <div className="p-6 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-4 animate-in fade-in zoom-in-95 duration-500">
                                <div className="p-3 bg-white rounded-lg shadow-sm">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-bold text-amber-900 uppercase tracking-widest mb-1">Manual Review Required</h4>
                                    <p className="text-xs text-amber-700 font-medium">{displayLatest.manual_review_reason}</p>
                                </div>
                            </div>
                        )}
                        <BREExplanationPanel explanation={displayLatest?.explanation} title="Executive Credit Memo" />
                    </div>

                    {/* Rule Table */}
                    <div className="col-span-12 rounded-md border border-slate-200 bg-white overflow-hidden">
                        <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between bg-white">
                             <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                               {fromCreditRun ? 'Credit-decision rules' : 'Audit Results'}
                             </h4>
                             <div className="flex gap-4 items-center">
                                {detailLoading && (
                                  <span className="text-[10px] font-medium text-slate-400 uppercase flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    Loading rules…
                                  </span>
                                )}
                                <span className="text-[10px] font-medium text-emerald-600 uppercase">
                                  PASS: {displayRules.filter(r => r.status === 'passed').length}
                                </span>
                                {fromCreditRun ? (
                                  <>
                                    <span className="text-[10px] font-medium text-rose-500 uppercase">
                                      FIRED: {displayRules.filter(r => r.status === 'failed').length}
                                    </span>
                                    <span className="text-[10px] font-medium text-amber-600 uppercase">
                                      WAITING AA: {displayRules.filter(r => r.status === 'waiting').length}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-[10px] font-medium text-rose-500 uppercase">
                                    FAIL: {displayRules.filter(r => r.status === 'failed').length}
                                  </span>
                                )}
                             </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-50">
                                        <th className="px-8 py-4 text-[9px] font-medium text-slate-300 uppercase tracking-widest">Rule</th>
                                        <th className="px-8 py-4 text-[9px] font-medium text-slate-300 uppercase tracking-widest">Benchmark</th>
                                        <th className="px-8 py-4 text-[9px] font-medium text-slate-300 uppercase tracking-widest">Actual Result</th>
                                        <th className="px-8 py-4 text-[9px] font-medium text-slate-300 uppercase tracking-widest text-right">Result</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50/50">
                                    {displayRules.map((r, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-all">
                                            <td className="px-8 py-4">
                                                <div className="text-xs font-medium text-slate-800">{r.rule_name}</div>
                                                <div className="text-[9px] text-slate-300 uppercase font-mono mt-1">{r.rule_code}</div>
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded inline-flex items-center gap-1">
                                                    <span className="opacity-40">{r.operator}</span>
                                                    <span>{r.expected_value}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="text-xs font-medium text-slate-700">{String(r.actual_value || 'N/A')}</div>
                                                <div className="text-[9px] text-slate-300 uppercase font-mono mt-1">SRC: {r.field_name}</div>
                                            </td>
                                            <td className="px-8 py-4 text-right">
                                                <Badge className={cn(
                                                    "text-[8px] border-none font-medium uppercase px-2 py-0.5",
                                                    r.status === 'passed'
                                                      ? "bg-emerald-50 text-emerald-600"
                                                      : r.status === 'waiting'
                                                        ? "bg-amber-50 text-amber-700"
                                                        : "bg-rose-50 text-rose-600"
                                                )}>
                                                    {r.status === 'waiting' ? 'waiting aa' : r.status === 'failed' && fromCreditRun ? 'fired' : r.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
