import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Copy,
  ArrowRight,
  ExternalLink,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  verdictLabel,
  bandLabel,
  aaCleanlinessLabel,
  defaultStaffSummary,
  ruleActionLabel,
  groupFiredRulesByTier,
  groupRulesByStatus,
  getFeatureCoverage,
  getEligibilityBreakdown,
  bankCoverageSuffix,
  lacksCreditRuleBuckets as lacksCreditRuleBucketsShared,
} from '@/lib/utils/creditDecisionDisplay';
import { buildCustomerAaConsentMessage } from '@/lib/utils/applicationNextStep';
import { aaStatusDisplay } from '@/lib/utils/aaStatusDisplay';
import { adminAPI } from '@/lib/api/admin';
import { useApplicationContext } from './context/ApplicationContext';

function lacksCreditRuleBuckets(result) {
  return lacksCreditRuleBucketsShared(result);
}

export default function CreditDecisionSheet({
  open,
  onOpenChange,
  loading,
  result,
  error,
  isReadOnly,
  customerName,
  applicationRef,
  onRun,
  onResume,
  onGoToDecision,
  onCopyMessage,
  onResultPatch,
  onOpenAaTab,
  onOpenCrifTab,
}) {
  const { bureauSummary, fetchBureauSummary } = useApplicationContext();
  const [copyDone, setCopyDone] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [aaStatus, setAaStatus] = useState(null);
  const [aaConfig, setAaConfig] = useState(null);
  const [bankReport, setBankReport] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const pollTimerRef = useRef(null);
  const resumeOnceRef = useRef(false);
  const detailFetchedRunRef = useRef(null);
  const resultRef = useRef(result);
  resultRef.current = result;

  // Unstable parent callbacks must not appear in effect/callback deps (infinite GET storm).
  const onResultPatchRef = useRef(onResultPatch);
  onResultPatchRef.current = onResultPatch;
  const fetchBureauSummaryRef = useRef(fetchBureauSummary);
  fetchBureauSummaryRef.current = fetchBureauSummary;
  const onResumeRef = useRef(onResume);
  onResumeRef.current = onResume;
  const bureauSummaryRef = useRef(bureauSummary);
  bureauSummaryRef.current = bureauSummary;

  const hostedUrl = result?.hostedUrl || aaStatus?.hostedUrl || null;
  const awaiting = Boolean(result?.awaitingAaConsent || result?.finalVerdict === 'AWAITING_AA_CONSENT');

  const patchResultIfChanged = useCallback((patch) => {
    if (!patch || typeof patch !== 'object') return;
    const current = resultRef.current || {};
    const keys = Object.keys(patch);
    if (keys.length === 0) return;
    const changed = keys.some((key) => current[key] !== patch[key]);
    if (!changed) return;
    onResultPatchRef.current?.(patch);
  }, []);

  const handleCopyCustomerMessage = async () => {
    const text = buildCustomerAaConsentMessage(customerName, hostedUrl);
    try {
      await navigator.clipboard.writeText(text);
      setCopyDone(true);
      onCopyMessage?.('Message copied — paste in WhatsApp or SMS for the customer.');
      setTimeout(() => setCopyDone(false), 2500);
    } catch {
      onCopyMessage?.('Could not copy. Please copy the message manually from the steps above.');
    }
  };

  const handleCopyLink = async () => {
    if (!hostedUrl) return;
    try {
      await navigator.clipboard.writeText(hostedUrl);
      setLinkCopied(true);
      onCopyMessage?.('Secure bank link copied.');
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      onCopyMessage?.('Could not copy link.');
    }
  };

  const handleResendAaEmail = async () => {
    if (!applicationRef || !hostedUrl) return;
    setEmailSending(true);
    try {
      const res = await adminAPI.resendAaConsentEmail(applicationRef);
      if (res.status === 1) {
        setEmailSent(true);
        onCopyMessage?.(res.message || 'AA consent email sent to customer.');
        setTimeout(() => setEmailSent(false), 3000);
      } else {
        onCopyMessage?.(res.message || 'Could not send AA consent email.');
      }
    } catch (err) {
      onCopyMessage?.(err?.message || 'Could not send AA consent email.');
    } finally {
      setEmailSending(false);
    }
  };

  const loadSheetData = useCallback(async () => {
    if (!applicationRef || !open) return;
    try {
      const current = resultRef.current;
      const needsDetail = lacksCreditRuleBuckets(current);
      const detailKey = `${applicationRef}:${current?.runId || 'none'}`;
      const shouldFetchDetail =
        needsDetail && detailFetchedRunRef.current !== detailKey;

      const detailPromise = shouldFetchDetail
        ? (async () => {
            setDetailLoading(true);
            try {
              const latestRes = await adminAPI.getLatestCreditDecision(applicationRef, {
                view: 'detail',
              });
              if (latestRes?.status === 1 && latestRes.data) {
                detailFetchedRunRef.current = detailKey;
                onResultPatchRef.current?.(latestRes.data);
              }
            } finally {
              setDetailLoading(false);
            }
          })()
        : Promise.resolve();

      const cachedBureau = bureauSummaryRef.current;
      const skipBureau =
        cachedBureau && (cachedBureau.alreadyFetched || cachedBureau.score != null);

      const [aaRes, bankRes] = await Promise.all([
        adminAPI.getCreditDecisionAaStatus(applicationRef).catch(() => null),
        adminAPI.getCreditBankDataReport(applicationRef).catch(() => null),
        skipBureau
          ? Promise.resolve(null)
          : fetchBureauSummaryRef.current().catch(() => null),
        detailPromise,
      ]);
      if (aaRes?.status === 1) {
        setAaStatus(aaRes.data);
        if (aaRes.data?.aaConfig) setAaConfig(aaRes.data.aaConfig);
        if (aaRes.data?.hostedUrl) {
          patchResultIfChanged({
            hostedUrl: aaRes.data.hostedUrl,
            aaConsentStatus: aaRes.data.status,
          });
        }
      }
      if (bankRes?.status === 1) setBankReport(bankRes.data);
    } catch {
      /* ignore */
    }
  }, [applicationRef, open, patchResultIfChanged]);

  const loadReports = useCallback(async () => {
    if (!applicationRef || !open) return;
    try {
      const cachedBureau = bureauSummaryRef.current;
      const skipBureau =
        cachedBureau && (cachedBureau.alreadyFetched || cachedBureau.score != null);
      const [bankRes] = await Promise.all([
        adminAPI.getCreditBankDataReport(applicationRef).catch(() => null),
        skipBureau
          ? Promise.resolve(null)
          : fetchBureauSummaryRef.current().catch(() => null),
      ]);
      if (bankRes?.status === 1) setBankReport(bankRes.data);
    } catch {
      /* ignore */
    }
  }, [applicationRef, open]);

  const loadSheetDataRef = useRef(loadSheetData);
  loadSheetDataRef.current = loadSheetData;
  const loadReportsRef = useRef(loadReports);
  loadReportsRef.current = loadReports;

  useEffect(() => {
    if (open) {
      void loadSheetDataRef.current();
      resumeOnceRef.current = false;
    } else {
      setAaStatus(null);
      setAaConfig(null);
      setDetailLoading(false);
      detailFetchedRunRef.current = null;
    }
  }, [open, applicationRef, result?.runId]);

  // Poll AA status only while sheet open + awaiting consent (first status already loaded via loadSheetData)
  useEffect(() => {
    // Always clear any existing interval first to prevent stacking when effect re-runs
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (!open || !awaiting || !applicationRef) return undefined;

    let pollCount = 0;
    const MAX_POLLS = 60; // 60 × 8s = ~8 minutes hard stop

    const poll = async () => {
      pollCount += 1;
      if (pollCount > MAX_POLLS) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
        return;
      }
      try {
        const res = await adminAPI.getCreditDecisionAaStatus(applicationRef);
        if (res.status === 1) {
          setAaStatus(res.data);
          if (res.data?.hostedUrl) {
            const cur = resultRef.current || {};
            if (
              cur.hostedUrl !== res.data.hostedUrl ||
              cur.aaConsentStatus !== res.data.status
            ) {
              onResultPatchRef.current?.({
                hostedUrl: res.data.hostedUrl,
                aaConsentStatus: res.data.status,
              });
            }
          }
          // not_initiated = AA not live (mock mode) — treat as terminal to stop polling
          const terminal = ['granted', 'report_ready', 'denied', 'timeout', 'failed', 'not_initiated'].includes(
            String(res.data?.status || '')
          );
          if (terminal) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            if (!resumeOnceRef.current && res.data?.status !== 'not_initiated') {
              resumeOnceRef.current = true;
              await onResumeRef.current?.();
              await loadReportsRef.current();
            }
          }
        }
      } catch {
        /* ignore transient poll errors */
      }
    };

    pollTimerRef.current = setInterval(poll, 8000);
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [open, awaiting, applicationRef]);

  const suggestedAmount =
    result?.suggested_terms?.amount ?? result?.approvedAmount ?? result?.eligibleAmount ?? null;

  const compositeScore =
    result?.composite_score ??
    result?.suggested_terms?.composite_score ??
    result?.scorecard?.composite_score ??
    null;

  const ruleGroups = groupRulesByStatus(result || {});
  const firedRules = ruleGroups.fired;
  const firedByTier = groupFiredRulesByTier(firedRules);
  const coverage = getFeatureCoverage(result);
  const eligibility = getEligibilityBreakdown(result);
  const scorecardCategories = result?.scorecard?.categories || result?.suggested_terms?.scorecard?.categories || [];

  const showGoToDecision =
    result &&
    !result.awaitingAaConsent &&
    ['PRE_APPROVED', 'APPROVED', 'MANUAL_REVIEW', 'REJECTED', 'AA_CONSENT_TIMEOUT'].includes(
      result.finalVerdict
    );

  const bankMetrics = result?.aa_snapshot || bankReport?.normalized || null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader className="pr-8">
          <SheetTitle className="text-base">Credit check result</SheetTitle>
          <SheetDescription className="text-xs leading-relaxed">
            This is a suggestion only. You still save the final outcome on the Decision tab.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-4">
          {aaConfig && !aaConfig.live && (
            <Alert className="rounded-lg border-amber-200 bg-amber-50 text-amber-950">
              <AlertDescription className="text-xs space-y-2">
                <p className="font-semibold">Bank consent (AA) is off on the server</p>
                <p>Credit check runs bureau only. Fix .env and restart API to get the Digitap bank link.</p>
                {Array.isArray(aaConfig.reasons) && aaConfig.reasons.length > 0 && (
                  <ul className="list-disc list-inside text-[11px] space-y-0.5">
                    {aaConfig.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          {!isReadOnly && (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={onRun}
                disabled={loading}
                className="h-9 px-4 bg-slate-900 hover:bg-black text-white font-bold rounded-lg text-xs shadow-2xs"
              >
                {loading ? (
                  <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 mr-2" />
                )}
                {loading ? 'Running…' : 'Run again'}
              </Button>
              {awaiting && (
                <>
                  <Button
                    variant="outline"
                    onClick={onResume}
                    disabled={loading}
                    className="h-9 px-4 rounded-lg text-xs"
                  >
                    Check again after customer approves
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCopyCustomerMessage}
                    className="h-9 px-4 rounded-lg text-xs"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    {copyDone ? 'Copied' : 'Copy message for customer'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleResendAaEmail}
                    disabled={emailSending || !hostedUrl}
                    className="h-9 px-4 rounded-lg text-xs"
                  >
                    <Mail className="w-3.5 h-3.5 mr-1.5" />
                    {emailSending ? 'Sending…' : emailSent ? 'Email sent' : 'Email link to customer'}
                  </Button>
                </>
              )}
              {showGoToDecision && (
                <Button
                  onClick={onGoToDecision}
                  className="h-9 px-4 rounded-lg text-xs bg-slate-900 hover:bg-slate-800 text-white"
                >
                  Go to final decision
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              )}
            </div>
          )}

          {loading && !result && (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Checking credit score and rules…
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="rounded-lg">
              <AlertDescription className="text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </AlertDescription>
            </Alert>
          )}

          {awaiting && (
            <Alert className="rounded-lg border-slate-200 bg-slate-100/90 text-slate-900">
              <AlertDescription className="text-xs space-y-3 leading-relaxed">
                <p className="font-semibold">Waiting for customer to complete secure bank link</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Open or share the Digitap hosted bank link below.</li>
                  <li>Customer completes Account Aggregator consent (one-time DEPOSIT).</li>
                  <li>This sheet polls status automatically; or click <strong>Check again</strong>.</li>
                </ol>
                {hostedUrl && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => window.open(hostedUrl, '_blank', 'noopener,noreferrer')}
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Open secure bank link
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleCopyLink}>
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      {linkCopied ? 'Link copied' : 'Copy link'}
                    </Button>
                  </div>
                )}
                {aaStatus?.status && (
                  <div className="rounded-md border border-slate-200 bg-white px-2.5 py-2 space-y-0.5">
                    <p className="text-[11px] font-semibold text-slate-800">
                      {aaStatusDisplay(aaStatus).title}
                    </p>
                    <p className="text-[11px] text-slate-600">{aaStatusDisplay(aaStatus).description}</p>
                    {aaStatus.providerCode && (
                      <p className="text-[10px] text-slate-400">
                        Digitap: {aaStatus.providerStatus || '—'} ({aaStatus.providerCode})
                      </p>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {(bureauSummary || bankReport?.available || bankMetrics || onOpenAaTab || onOpenCrifTab) && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
              <p className="text-[11px] font-semibold text-slate-800">Reports</p>
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-700">
                {bureauSummary && (
                  <Badge variant="outline" className="normal-case font-normal">
                    CRIF score {bureauSummary.score ?? '—'}
                  </Badge>
                )}
                {(bankReport?.available || bankMetrics) && (
                  <Badge variant="outline" className="normal-case font-normal">
                    AA avg bal ₹
                    {Number(bankMetrics?.avg_balance ?? bankMetrics?.avg_monthly_balance ?? 0).toLocaleString('en-IN')}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {onOpenCrifTab && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={onOpenCrifTab}
                    title={
                      bureauSummary
                        ? 'Open CRIF tab'
                        : 'No CRIF report saved yet — open CRIF tab for status'
                    }
                  >
                    {bureauSummary ? 'View full CRIF' : 'Open CRIF tab'}
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                )}
                {onOpenAaTab && (
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onOpenAaTab}>
                    View full AA
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={cn(
                    'text-[10px] font-semibold border-none px-2.5 py-1 normal-case',
                    ['PRE_APPROVED', 'APPROVED'].includes(result.finalVerdict) &&
                      'bg-emerald-100 text-emerald-800',
                    result.finalVerdict === 'REJECTED' && 'bg-rose-100 text-rose-800',
                    result.finalVerdict === 'MANUAL_REVIEW' && 'bg-amber-100 text-amber-900',
                    result.finalVerdict === 'AWAITING_AA_CONSENT' && 'bg-slate-200 text-slate-900',
                    result.finalVerdict === 'AA_CONSENT_TIMEOUT' && 'bg-slate-100 text-slate-800'
                  )}
                >
                  {result.final_verdict_label || verdictLabel(result.finalVerdict)}
                </Badge>
                {result.cibilBand && (
                  <Badge variant="outline" className="text-[10px] normal-case font-normal">
                    Credit: {result.cibil_band_label || bandLabel(result.cibilBand)}
                  </Badge>
                )}
                {result.aaCleanliness && (
                  <Badge variant="outline" className="text-[10px] normal-case font-normal">
                    {result.aa_cleanliness_label || aaCleanlinessLabel(result.aaCleanliness)}
                  </Badge>
                )}
                {compositeScore != null && (
                  <Badge variant="outline" className="text-[10px] normal-case font-normal">
                    Score {compositeScore}/100
                  </Badge>
                )}
                {(result.engineResult?.override_action ||
                  result.suggested_terms?.override_action) && (
                  <Badge
                    className={`text-[10px] border-none ${
                      (result.engineResult?.override_action ||
                        result.suggested_terms?.override_action) === 'AUTO_DECLINE'
                        ? 'bg-rose-600 text-white'
                        : (result.engineResult?.override_action ||
                              result.suggested_terms?.override_action) === 'MANUAL_REVIEW'
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-600 text-white'
                    }`}
                  >
                    Override{' '}
                    {result.engineResult?.override_action ||
                      result.suggested_terms?.override_action}
                  </Badge>
                )}
              </div>

              {Array.isArray(
                result.engineResult?.override_reasons || result.suggested_terms?.override_reasons
              ) &&
                (result.engineResult?.override_reasons || result.suggested_terms?.override_reasons)
                  .length > 0 && (
                  <div className="text-xs text-slate-700 bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-1">
                    {(
                      result.engineResult?.override_reasons ||
                      result.suggested_terms?.override_reasons
                    ).map((r, i) => (
                      <div key={i}>• {r}</div>
                    ))}
                  </div>
                )}

              {coverage && (
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-[10px] normal-case font-normal">
                    Bureau {coverage.bureau_mapped}/{coverage.bureau_total}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] normal-case font-normal">
                    Bank {coverage.bank_mapped}/{coverage.bank_total}
                    {bankCoverageSuffix(result, coverage)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] normal-case font-normal">
                    Rules {ruleGroups.total}/52 checked
                  </Badge>
                </div>
              )}

              {detailLoading && lacksCreditRuleBuckets(result) && (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Loading rule details…
                </div>
              )}

              {eligibility && (
                <div className="text-sm bg-slate-100/80 border border-slate-200 rounded-lg p-3 space-y-1.5">
                  <p className="font-semibold text-slate-900">
                    Eligible ₹
                    {eligibility.eligible != null
                      ? Number(eligibility.eligible).toLocaleString('en-IN')
                      : suggestedAmount != null
                        ? Number(suggestedAmount).toLocaleString('en-IN')
                        : '—'}
                  </p>
                  <ul className="text-[11px] text-slate-600 space-y-0.5 font-normal">
                    {eligibility.cibilScore != null && (
                      <li>CIBIL score: {eligibility.cibilScore}{eligibility.cibilBand ? ` (${bandLabel(eligibility.cibilBand)})` : ''}</li>
                    )}
                    {eligibility.bureau != null && (
                      <li>Highest comparable CRIF PL: ₹{Number(eligibility.bureau).toLocaleString('en-IN')}</li>
                    )}
                    {eligibility.productMax != null && (
                      <li>Product max: ₹{Number(eligibility.productMax).toLocaleString('en-IN')}</li>
                    )}
                    {eligibility.requested != null && (
                      <li>Requested: ₹{Number(eligibility.requested).toLocaleString('en-IN')}</li>
                    )}
                    {eligibility.income != null ? (
                      <li>Income (ICR) cap: ₹{Number(eligibility.income).toLocaleString('en-IN')}</li>
                    ) : (
                      eligibility.incomePending && (
                        <li className="text-amber-700">Income cap pending AA (bank salary)</li>
                      )
                    )}
                    {eligibility.reason && <li className="text-slate-500">{eligibility.reason}</li>}
                  </ul>
                  <p className="text-xs font-normal text-slate-600 pt-1">
                    Prefills the Decision tab recommended limit when you recommend approval.
                  </p>
                </div>
              )}

              {!eligibility && suggestedAmount != null && (
                <p className="text-sm font-semibold text-slate-900 bg-slate-100/80 border border-slate-200 rounded-lg p-3">
                  Suggested amount: ₹{Number(suggestedAmount).toLocaleString('en-IN')}
                  <span className="block text-xs font-normal text-slate-600 mt-1">
                    You can use this on the Decision tab when you recommend approval.
                  </span>
                </p>
              )}

              {(result.staff_summary || result.reasoning_summary) && (
                <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100">
                  {result.staff_summary || defaultStaffSummary(result)}
                </p>
              )}

              {firedRules.length > 0 && (
                <details className="group" open>
                  <summary className="text-[11px] font-medium text-slate-600 cursor-pointer">
                    Fired rules ({firedRules.length})
                  </summary>
                  <div className="mt-2 space-y-2 bg-slate-50 rounded-lg p-3 border border-slate-100 max-h-56 overflow-y-auto">
                    {Object.entries(firedByTier).map(([tier, rules]) => (
                      <div key={tier}>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                          {tier}
                        </p>
                        <ul className="space-y-1.5">
                          {rules.map((rule) => (
                            <li key={rule.rule_id} className="text-[11px] text-slate-700 leading-relaxed">
                              <span className="font-medium">{rule.rule_id}</span>
                              {' · '}
                              {ruleActionLabel(rule.action)}
                              {rule.message ? ` — ${rule.message}` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {ruleGroups.passed.length > 0 && (
                <details className="group">
                  <summary className="text-[11px] font-medium text-slate-600 cursor-pointer">
                    Passed rules ({ruleGroups.passed.length})
                  </summary>
                  <ul className="mt-2 text-[11px] text-slate-600 space-y-1 bg-slate-50 rounded-lg p-3 border border-slate-100 max-h-40 overflow-y-auto">
                    {ruleGroups.passed.map((rule) => (
                      <li key={rule.rule_id}>
                        <span className="font-medium">{rule.rule_id}</span>
                        {rule.message ? ` — ${rule.message}` : ''}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {ruleGroups.waiting.length > 0 && (
                <details className="group">
                  <summary className="text-[11px] font-medium text-amber-700 cursor-pointer">
                    Waiting for AA ({ruleGroups.waiting.length})
                  </summary>
                  <ul className="mt-2 text-[11px] text-slate-600 space-y-1 bg-amber-50/60 rounded-lg p-3 border border-amber-100 max-h-40 overflow-y-auto">
                    {ruleGroups.waiting.map((rule) => (
                      <li key={rule.rule_id}>
                        <span className="font-medium">{rule.rule_id}</span>
                        {rule.message ? ` — ${rule.message}` : ''}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {ruleGroups.missing.length > 0 && (
                <details className="group">
                  <summary className="text-[11px] font-medium text-slate-500 cursor-pointer">
                    Missing in this CRIF ({ruleGroups.missing.length})
                  </summary>
                  <ul className="mt-2 text-[11px] text-slate-600 space-y-1 bg-slate-50 rounded-lg p-3 border border-slate-100 max-h-40 overflow-y-auto">
                    {ruleGroups.missing.map((rule) => (
                      <li key={rule.rule_id}>
                        <span className="font-medium">{rule.rule_id}</span>
                        {rule.missing_features?.length
                          ? ` — needs ${rule.missing_features.slice(0, 3).join(', ')}`
                          : rule.message
                            ? ` — ${rule.message}`
                            : ''}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {scorecardCategories.length > 0 && (
                <details className="group">
                  <summary className="text-[11px] font-medium text-slate-600 cursor-pointer">
                    T4 scorecard
                    {compositeScore != null ? ` (${compositeScore}/100)` : ''}
                  </summary>
                  <ul className="mt-2 text-[11px] text-slate-700 space-y-1 bg-slate-50 rounded-lg p-3 border border-slate-100 max-h-48 overflow-y-auto">
                    {scorecardCategories.map((cat) => (
                      <li key={cat.category} className="flex justify-between gap-2">
                        <span>
                          {cat.category}
                          {cat.status === 'WAITING_AA' || cat.reason === 'waiting_aa'
                            ? ' (AA pending)'
                            : ''}
                        </span>
                        <span className="tabular-nums text-slate-500 shrink-0">
                          {cat.points != null ? `${cat.points}/${cat.max || cat.max_points}` : '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {Array.isArray(result.reasoning_trail) && result.reasoning_trail.length > 0 && (
                <details className="group">
                  <summary className="text-[11px] font-medium text-slate-600 cursor-pointer">
                    Show step-by-step details
                  </summary>
                  <ol className="mt-2 text-[11px] text-slate-600 space-y-1.5 list-decimal list-inside bg-slate-50 rounded-lg p-3 border border-slate-100 max-h-48 overflow-y-auto">
                    {result.reasoning_trail.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {typeof step === 'string' ? step : step?.message || JSON.stringify(step)}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
