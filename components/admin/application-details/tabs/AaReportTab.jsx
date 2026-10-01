import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Landmark,
  RefreshCw,
  ExternalLink,
  Copy,
  Sparkles,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useApplicationContext } from '../context/ApplicationContext';
import { adminAPI } from '@/lib/api/admin';
import { buildCustomerAaConsentMessage } from '@/lib/utils/applicationNextStep';
import { canExportAaBankExcel, downloadAaBankExcel, downloadSalaryHistoryExcel, downloadPaydayHistoryExcel } from '@/lib/utils/aaBankExcelExport';
import { getFeatureCoverage } from '@/lib/utils/creditDecisionDisplay';
import { aaStatusDisplay } from '@/lib/utils/aaStatusDisplay';
import { cn } from '@/lib/utils';

function formatTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function inr(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

function monthKeyFromDate(dateStr) {
  const s = String(dateStr || '');
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  return '';
}

function resolveSalarySummary(metrics) {
  const fromUi = metrics?.ui?.salary_summary;
  const fromAnalysis =
    metrics?.summary?.salary || metrics?.analysis_report?.summary?.salary || null;
  const transactions =
    metrics?.ui?.salary_transactions ||
    fromAnalysis?.transactions ||
    [];
  if (!fromUi && !fromAnalysis && !transactions.length) return null;
  return {
    ...(fromAnalysis || {}),
    ...(fromUi || {}),
    transactions,
  };
}

export default function AaReportTab({ onOpenCreditCheck }) {
  const {
    loanApp,
    applicationId,
    userData,
    setMessage,
    creditDecisionResult,
    handleResumeCreditDecision,
    creditDecisionLoading,
    aaStatus,
    setAaStatus,
    bankReport,
    setBankReport,
    bankReportLoading,
    bankReportError,
    fetchBankReport,
  } = useApplicationContext();
  const applicationRef = loanApp?.application_number || applicationId;
  const customerName =
    userData?.profile?.full_name || userData?.full_name || loanApp?.full_name || '';

  const [loading, setLoading] = useState(!aaStatus && !bankReport && bankReportLoading);
  const [error, setError] = useState(bankReportError || '');
  const [linkCopied, setLinkCopied] = useState(false);
  const [msgCopied, setMsgCopied] = useState(false);
  const [initiating, setInitiating] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingSalary, setExportingSalary] = useState(false);
  const [exportingPayday, setExportingPayday] = useState(false);
  const [autoRemapFailed, setAutoRemapFailed] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const pollRef = useRef(null);
  const autoRemapRef = useRef(false);

  const load = useCallback(async (force = false) => {
    if (!applicationRef) return null;
    if (!force && (aaStatus || bankReport)) {
      setLoading(false);
      return { aaStatus, bankReport };
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetchBankReport?.({ force });
      return res;
    } catch (err) {
      setError(err?.message || 'Failed to load AA / bank report');
      return null;
    } finally {
      setLoading(false);
    }
  }, [applicationRef, aaStatus, bankReport, fetchBankReport]);

  useEffect(() => {
    if (!aaStatus && !bankReport) {
      load(false);
    } else {
      setLoading(false);
    }
  }, [load, aaStatus, bankReport]);

  const aaDisplay = aaStatusDisplay(aaStatus);

  // Poll only while tab mounted and the customer / Digitap still has work to do
  useEffect(() => {
    const status = String(aaStatus?.status || '');
    const shouldPoll = aaDisplay.poll && status !== 'not_initiated' && Boolean(aaStatus?.aaLive !== false);

    if (!shouldPoll) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return undefined;
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await adminAPI.getCreditDecisionAaStatus(applicationRef);
        if (res?.status === 1) {
          setAaStatus(res.data);
          if (!aaStatusDisplay(res.data).poll) {
            const bankRes = await adminAPI
              .getCreditBankDataReport(applicationRef, { force: true })
              .catch(() => null);
            if (bankRes?.status === 1) setBankReport(bankRes.data);
          }
        }
      } catch {
        /* ignore poll errors */
      }
    }, 8000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [aaDisplay.poll, aaStatus?.status, aaStatus?.reason, aaStatus?.aaLive, applicationRef]);

  const hostedUrl = aaStatus?.hostedUrl || null;
  const expiresAtMs = aaStatus?.expiresAt ? Date.parse(aaStatus.expiresAt) : null;
  const linkExpired = Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now();
  const metrics = bankReport?.normalized || null;
  const mappingPending = Boolean(metrics?.mapping_pending) && !bankReport?.mappingReady;
  const mappingReady = Boolean(bankReport?.mappingReady || (metrics && !metrics.mapping_pending));
  const uiTables = metrics?.ui || null;
  const reportReady =
    Boolean(aaStatus?.reportReady) ||
    String(aaStatus?.status || '') === 'report_ready' ||
    Boolean(bankReport?.available);
  // Link only needed while customer still must complete consent
  const showCustomerBankLink = aaDisplay.showLink && !linkExpired && !reportReady;
  const coverage = getFeatureCoverage(creditDecisionResult);
  const bankMapped = Number(coverage?.bank_mapped ?? 0);
  const needsBreRemap =
    Boolean(aaStatus?.reportReady || aaStatus?.status === 'report_ready') &&
    mappingReady &&
    bankMapped === 0;
  const aaConfigData = aaStatus?.aaConfig;
  const aaKnown = Boolean(aaStatus);
  const aaLive = aaKnown ? Boolean(aaConfigData?.live ?? aaStatus?.aaLive !== false) : null;
  const canGenerateAaLink =
    aaLive &&
    !reportReady &&
    !['granted', 'report_ready'].includes(String(aaStatus?.status || '')) &&
    aaDisplay.key !== 'processing';
  const handleCheckStatusNow = async () => {
    setCheckingStatus(true);
    try {
      await load(true);
    } finally {
      setCheckingStatus(false);
    }
  };
  const aaDisabledReasons = aaConfigData?.reasons || [];
  const salarySummary = resolveSalarySummary(metrics);
  const salaryTxns = Array.isArray(salarySummary?.transactions) ? salarySummary.transactions : [];
  const salaryByMonth = salaryTxns.reduce((acc, t) => {
    const key = monthKeyFromDate(t.date);
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + Number(t.amount || 0);
    return acc;
  }, {});
  const salaryTotal = salaryTxns.reduce((sum, t) => {
    const n = Number(t.amount);
    return Number.isFinite(n) ? sum + n : sum;
  }, 0);

  // Actual detected payday loan debits (if any flagged by rules/regex)
  const paydayTxns = useMemo(() => {
    const tx = metrics?.ui?.payday_transactions ||
               metrics?.summary?.payday_loans?.transactions ||
               metrics?.payday_transactions || [];
    return Array.isArray(tx) ? tx : [];
  }, [metrics]);
  const paydayTotal = paydayTxns.reduce((sum, t) => {
    const n = Number(t.amount);
    return Number.isFinite(n) ? sum + n : sum;
  }, 0);

  const handleRerunBre = useCallback(async () => {
    if (!handleResumeCreditDecision) return;
    setRerunning(true);
    setError('');
    setAutoRemapFailed(false);
    try {
      await handleResumeCreditDecision();
      setMessage?.('Underwriting remapped with bank report.');
      await load();
    } catch (err) {
      setAutoRemapFailed(true);
      setError(err.message || 'Failed to re-run underwriting');
      throw err;
    } finally {
      setRerunning(false);
    }
  }, [handleResumeCreditDecision, load, setMessage]);

  // Once bank report is mapped, auto-resume underwriting so Feature Risk Bank /300 updates.
  useEffect(() => {
    if (!needsBreRemap || !handleResumeCreditDecision) return undefined;
    if (autoRemapRef.current) return undefined;
    autoRemapRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        await handleRerunBre();
      } catch {
        if (!cancelled) autoRemapRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsBreRemap, handleResumeCreditDecision, handleRerunBre]);

  const handleInitiateAa = async (forceNew = false) => {
    if (!applicationRef || !aaLive) return;
    setInitiating(true);
    setError('');
    try {
      const res = await adminAPI.initiateAaConsent(applicationRef, { forceNew: forceNew === true });
      if (res?.status === 1) {
        const url = res.data?.hostedUrl;
        setMessage?.(
          url
            ? 'Digitap bank consent link is ready — share it with the customer.'
            : 'Bank consent started — refresh if the link does not appear.'
        );
        if (url) {
          setAaStatus((prev) => ({
            ...(prev || {}),
            status: 'pending',
            reason: 'not_started',
            linkExpired: false,
            reportReady: false,
            hostedUrl: url,
            aaLive: true,
            consentId: res.data?.aaConsentId || prev?.consentId,
          }));
        }
        await load();
        onOpenCreditCheck?.();
      } else {
        setError(res?.message || 'Failed to start bank consent');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to start bank consent');
    } finally {
      setInitiating(false);
    }
  };

  const copyLink = async () => {
    if (!hostedUrl) return;
    try {
      await navigator.clipboard.writeText(hostedUrl);
      setLinkCopied(true);
      setMessage?.('Secure bank link copied.');
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      setMessage?.('Could not copy link.');
    }
  };

  const copyMessage = async () => {
    const text = buildCustomerAaConsentMessage(customerName, hostedUrl);
    try {
      await navigator.clipboard.writeText(text);
      setMsgCopied(true);
      setMessage?.('Message copied — paste in WhatsApp or SMS.');
      setTimeout(() => setMsgCopied(false), 2500);
    } catch {
      setMessage?.('Could not copy message.');
    }
  };

  const handleDownloadExcel = async () => {
    if (!canExportAaBankExcel(bankReport)) return;
    setExportingExcel(true);
    try {
      const fileName = await downloadAaBankExcel({
        bankReport,
        meta: {
          leadId: loanApp?.lead_id || applicationRef,
          applicationRef,
          customerName,
          customerCode: userData?.customer_code || userData?.profile?.customer_code,
        },
      });
      setMessage?.(`Downloaded ${fileName}`);
    } catch (err) {
      setError(err?.message || 'Failed to export Excel');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleDownloadSalaryHistory = async () => {
    if (!salaryTxns.length) return;
    setExportingSalary(true);
    try {
      const fileName = await downloadSalaryHistoryExcel({
        transactions: salaryTxns,
        meta: {
          leadId: loanApp?.lead_id || applicationRef,
          applicationRef,
          customerName,
          customerCode: userData?.customer_code || userData?.profile?.customer_code,
        },
      });
      setMessage?.(`Downloaded ${fileName}`);
    } catch (err) {
      setError(err?.message || 'Failed to export salary history');
    } finally {
      setExportingSalary(false);
    }
  };

  const handleDownloadPaydayHistory = async () => {
    if (!paydayTxns.length) return;
    setExportingPayday(true);
    try {
      const fileName = await downloadPaydayHistoryExcel({
        transactions: paydayTxns,
        meta: {
          leadId: loanApp?.lead_id || applicationRef,
          applicationRef,
          customerName,
          customerCode: userData?.customer_code || userData?.profile?.customer_code,
        },
      });
      setMessage?.(`Downloaded ${fileName}`);
    } catch (err) {
      setError(err?.message || 'Failed to export payday history');
    } finally {
      setExportingPayday(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center bg-white rounded-lg border border-slate-200">
        <Spinner size="lg" variant="primary" />
        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-4">Loading AA / Bank Data…</p>
      </div>
    );
  }

  const notInitiated = !aaStatus || aaStatus.status === 'not_initiated';

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
            <Landmark className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div>
            <h3 className="text-xs font-medium text-slate-800 uppercase tracking-widest leading-none">
              AA / Bank Data
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">
              Digitap Account Aggregator consent status and bank report (redacted).
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs rounded-lg"
            onClick={() => {
              load(true);
            }}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs rounded-lg"
            disabled={!canExportAaBankExcel(bankReport) || exportingExcel}
            onClick={handleDownloadExcel}
          >
            {exportingExcel ? (
              <Spinner className="w-3.5 h-3.5 mr-1.5" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5" />
            )}
            Download Excel
          </Button>
          {onOpenCreditCheck && (
            <Button size="sm" className="h-8 text-xs rounded-lg" onClick={onOpenCreditCheck}>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Open credit check
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-lg">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {!aaKnown ? null : !aaLive && aaDisabledReasons.length > 0 ? (
        <Alert className="rounded-lg border-amber-200 bg-amber-50 text-amber-950">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs space-y-2">
            <p className="font-semibold">Account Aggregator is disabled on the server</p>
            <p>
              Credit check will run CRIF only until Bank Data keys are configured. There is no separate
              Initiate AA button — bank consent starts automatically when you run credit check and AA is live.
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              {aaDisabledReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <p className="text-[11px] text-amber-900/80">
              On the server: set <code className="text-[10px]">AA_MOCK_MODE=false</code>, add{' '}
              <code className="text-[10px]">DIGITAP_BANK_CLIENT_NAME</code> and{' '}
              <code className="text-[10px]">DIGITAP_BANK_PUBLIC_KEY_BASE64</code>, then{' '}
              <code className="text-[10px]">pm2 restart fintech-api --update-env</code>.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      {notInitiated ? (
        <div className="py-14 text-center bg-white rounded-lg border border-slate-200">
          <Landmark className="w-10 h-10 text-slate-200 mx-auto mb-4" />
          <p className="text-sm text-slate-600 font-medium">
            {aaLive === false ? 'AA not available (server config)' : 'AA not started yet'}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {aaLive === false
              ? 'Fix server .env and restart API before bank consent can start.'
              : 'Click Run credit check (start AA) below to call Digitap and get the bank consent link (independent of bureau-only credit check).'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {aaLive && (
              <Button
                className="h-9 text-xs rounded-lg"
                disabled={initiating}
                onClick={() => handleInitiateAa(false)}
              >
                {initiating ? (
                  <>
                    <Spinner className="w-3.5 h-3.5 mr-1.5" />
                    Starting…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Run credit check (start AA)
                  </>
                )}
              </Button>
            )}
            {onOpenCreditCheck && (
              <Button
                variant={aaLive ? 'outline' : 'default'}
                className="h-9 text-xs rounded-lg"
                onClick={onOpenCreditCheck}
              >
                Open credit check
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className={cn('rounded-lg border px-4 py-3 space-y-3', aaDisplay.toneClasses.box)}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', aaDisplay.toneClasses.dot)} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{aaDisplay.title}</p>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-medium',
                        aaDisplay.toneClasses.badge
                      )}
                    >
                      {aaDisplay.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed opacity-90">{aaDisplay.description}</p>
                  <p className="mt-1 text-[11px] opacity-70">
                    {aaDisplay.poll && 'Updates automatically every few seconds. '}
                    {formatTime(aaStatus?.lastCheckedAt)
                      ? `Last checked with Digitap ${formatTime(aaStatus.lastCheckedAt)}.`
                      : ''}
                    {aaDisplay.key === 'waiting' && formatTime(aaStatus?.expiresAt)
                      ? ` Link valid until ${formatTime(aaStatus.expiresAt)}.`
                      : ''}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs bg-white"
                  disabled={checkingStatus}
                  onClick={handleCheckStatusNow}
                >
                  {checkingStatus ? (
                    <Spinner className="w-3.5 h-3.5 mr-1.5" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Check status now
                </Button>
                {canGenerateAaLink && (
                  <Button
                    size="sm"
                    variant={aaDisplay.action === 'generate_link' ? 'default' : 'outline'}
                    className={cn('h-8 text-xs', aaDisplay.action !== 'generate_link' && 'bg-white')}
                    disabled={initiating}
                    onClick={() => handleInitiateAa(true)}
                  >
                    {initiating ? (
                      <Spinner className="w-3.5 h-3.5 mr-1.5" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {initiating ? 'Generating…' : 'Generate new bank link'}
                  </Button>
                )}
              </div>
            </div>

            {!aaStatus?.isLatestSession && aaStatus?.sessionCount > 1 && reportReady && (
              <p className="text-[11px] opacity-80">
                The customer completed an earlier bank link, so that report is used.
              </p>
            )}

            <details className="group rounded-md border border-black/5 bg-white/70 text-[11px] text-slate-700">
              <summary className="cursor-pointer select-none px-3 py-1.5 font-medium text-slate-600">
                Technical details
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 px-3 pb-2">
                <p>
                  Digitap status: <span className="font-mono">{aaStatus?.providerStatus || '—'}</span>
                </p>
                <p>
                  Digitap code: <span className="font-mono">{aaStatus?.providerCode || '—'}</span>
                </p>
                <p>
                  Internal status: <span className="font-mono">{aaStatus?.status || '—'}</span>
                </p>
                <p>
                  Request ID: <span className="font-mono break-all">{aaStatus?.requestId || '—'}</span>
                </p>
                <p>
                  Transaction ID: <span className="font-mono break-all">{aaStatus?.txnId || '—'}</span>
                </p>
                <p>Link created: {formatTime(aaStatus?.initiatedAt) || '—'}</p>
                <p>Callback received: {formatTime(aaStatus?.webhookReceivedAt) || '—'}</p>
                <p>Report fetched: {formatTime(aaStatus?.reportFetchedAt) || '—'}</p>
                {Array.isArray(aaStatus?.attempts) && aaStatus.attempts.length > 0 && (
                  <div className="sm:col-span-2 pt-1">
                    <p className="font-medium text-slate-600">Customer attempts (oldest first)</p>
                    <ul className="mt-0.5 space-y-0.5">
                      {aaStatus.attempts.map((a, i) => (
                        <li key={`${a.txnId || 'txn'}-${i}`} className="font-mono">
                          {a.status || '—'} / {a.code || '—'}
                          {a.message ? ` — ${a.message}` : ''}
                          {a.at ? ` (${formatTime(a.at)})` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          </div>
          {showCustomerBankLink && (
            <div className="rounded-lg border-2 border-slate-300 bg-slate-50 overflow-hidden">
              <div className="px-4 py-2.5 border-b-2 border-slate-300 bg-slate-100/90">
                <h3 className="text-[12px] font-bold text-[#222222] tracking-wide uppercase">
                  Customer bank link
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {hostedUrl ? (
                  <>
                    <p className="text-[11px] text-slate-600 break-all font-mono bg-white border border-slate-200 rounded-md p-2">
                      {hostedUrl}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => window.open(hostedUrl, '_blank', 'noopener,noreferrer')}
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        Open secure bank link
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={copyLink}>
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        {linkCopied ? 'Copied' : 'Copy link'}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={copyMessage}>
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        {msgCopied ? 'Copied' : 'Copy message for customer'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">
                    No active hosted URL. Open credit check to generate or resume the AA flow.
                  </p>
                )}
              </div>
            </div>
          )}

          {mappingPending && (
            <Alert className="rounded-lg border-amber-200 bg-amber-50">
              <AlertDescription className="text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                Bank report stored. Automatic underwriting mapping is pending
                (DIGITAP_BANK_REPORT_MAPPING_PENDING) — review manually.
              </AlertDescription>
            </Alert>
          )}

          {mappingReady && !mappingPending && (
            <Alert className="rounded-lg border-emerald-200 bg-emerald-50">
              <AlertDescription className="text-xs text-emerald-900 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>
                  Bank report ready
                  {metrics?.source_shape ? ` (${metrics.source_shape})` : ''}.
                </span>
                {(rerunning || creditDecisionLoading) && needsBreRemap && (
                  <span className="inline-flex items-center gap-1 text-emerald-800">
                    <Spinner className="w-3 h-3" />
                    Refreshing underwriting…
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {needsBreRemap && autoRemapFailed && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={rerunning || creditDecisionLoading}
                onClick={() => {
                  autoRemapRef.current = true;
                  handleRerunBre().catch(() => {
                    autoRemapRef.current = false;
                  });
                }}
              >
                {(rerunning || creditDecisionLoading) && (
                  <Spinner className="w-3.5 h-3.5 mr-1.5" />
                )}
                Retry underwriting remap
              </Button>
            </div>
          )}

          {(bankReport?.available || metrics) && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Avg balance', value: inr(metrics?.avg_balance ?? metrics?.avg_monthly_balance) },
                { label: 'Bounces', value: metrics?.bounce_count ?? '—' },
                { label: 'Neg. balance days', value: metrics?.negative_balance_days ?? '—' },
                {
                  label: 'Salary consistency',
                  value:
                    metrics?.salary_credit_consistency_pct != null
                      ? `${metrics.salary_credit_consistency_pct}%`
                      : '—',
                },
                {
                  label: 'Est. monthly income',
                  value: inr(metrics?.estimated_monthly_income),
                },
                {
                  label: 'Report fetched',
                  value: bankReport?.reportFetchedAt
                    ? String(bankReport.reportFetchedAt).slice(0, 19).replace('T', ' ')
                    : '—',
                },
              ].map((card) => (
                <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-[11px] text-slate-500">{card.label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{card.value}</p>
                </div>
              ))}
            </div>
          )}

          {uiTables?.accounts?.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">Accounts</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-100">
                      <th className="px-3 py-2 font-medium">Bank</th>
                      <th className="px-3 py-2 font-medium">Account</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium text-right">Balance</th>
                      <th className="px-3 py-2 font-medium">Opened</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uiTables.accounts.map((a, i) => (
                      <tr key={`${a.bank}-${a.account_number}-${i}`} className="border-b border-slate-50">
                        <td className="px-3 py-2">{a.bank}</td>
                        <td className="px-3 py-2 font-mono">{a.account_number}</td>
                        <td className="px-3 py-2">{a.account_type}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{inr(a.current_balance)}</td>
                        <td className="px-3 py-2">{a.opening_date || '—'}</td>
                        <td className="px-3 py-2">{a.account_status || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {uiTables?.monthly?.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                  Monthly summary
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-100 bg-slate-50/80">
                      <th className="px-3 py-2 font-medium">Month</th>
                      <th className="px-3 py-2 font-medium text-right">Credits</th>
                      <th className="px-3 py-2 font-medium text-right">Debits</th>
                      <th className="px-3 py-2 font-medium text-right">Salary</th>
                      <th className="px-3 py-2 font-medium text-right">Avg bal</th>
                      <th className="px-3 py-2 font-medium text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uiTables.monthly.map((m) => (
                      <tr key={m.month} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-3 py-2 font-mono">{m.month}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-700">
                          {inr(m.total_credits)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                          {inr(m.total_debits)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-sky-800">
                          {salaryByMonth[m.month] != null ? inr(salaryByMonth[m.month]) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{inr(m.avg_balance)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{inr(m.net_cash_flow)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {salaryTxns.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                    Salary Credits History ({salaryTxns.length})
                  </h4>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium border border-emerald-200">
                    Salary Inflows
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[11px] font-semibold text-emerald-700 tabular-nums">
                    Total Salary {inr(salaryTotal)}
                  </span>
                  {salarySummary?.average_amount != null && (
                    <span className="text-[11px] text-slate-600 tabular-nums">
                      Avg Monthly {inr(salarySummary.average_amount)}
                    </span>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    disabled={!salaryTxns.length || exportingSalary}
                    onClick={handleDownloadSalaryHistory}
                  >
                    {exportingSalary ? (
                      <Spinner className="mr-1.5 h-3.5 w-3.5" />
                    ) : (
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Download Salary Excel
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-left text-slate-500 border-b border-slate-100">
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Employer / Narration</th>
                      <th className="px-3 py-2 font-medium text-right">Credit Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryTxns.map((t, i) => (
                      <tr key={`${t.date}-${t.amount}-${i}`} className="border-b border-slate-50">
                        <td className="px-3 py-1.5 whitespace-nowrap">{t.date || '—'}</td>
                        <td className="px-3 py-1.5 text-slate-600 max-w-md truncate">
                          {t.narration || '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-emerald-700 font-semibold">
                          {inr(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {paydayTxns.length > 0 ? (
            <div className="rounded-lg border border-rose-300 bg-rose-50/40 overflow-hidden">
              <div className="px-3 py-2 border-b border-rose-200 bg-rose-100/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <h4 className="text-[11px] font-bold uppercase tracking-wide text-rose-800">
                    Detected Payday / Short-Term Loan Debits ({paydayTxns.length})
                  </h4>
                  <span className="text-[10px] bg-rose-200 text-rose-800 px-2 py-0.5 rounded font-bold border border-rose-300">
                    Risk Warning
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[11px] font-bold text-rose-700 tabular-nums">
                    Total Payday Debits {inr(paydayTotal)}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] border-rose-300 text-rose-800 hover:bg-rose-100"
                    disabled={exportingPayday}
                    onClick={handleDownloadPaydayHistory}
                  >
                    {exportingPayday ? (
                      <Spinner className="mr-1.5 h-3.5 w-3.5" />
                    ) : (
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Download Payday Excel
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-rose-50 z-10">
                    <tr className="text-left text-rose-700 border-b border-rose-200">
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Lender / Narration</th>
                      <th className="px-3 py-2 font-medium text-right">Debit Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paydayTxns.map((t, i) => (
                      <tr key={`payday-${t.date}-${t.amount}-${i}`} className="border-b border-rose-100/60">
                        <td className="px-3 py-1.5 whitespace-nowrap text-rose-900">{t.date || '—'}</td>
                        <td className="px-3 py-1.5 text-rose-800 max-w-md truncate">{t.narration || '—'}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-rose-700 font-semibold">
                          {inr(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : mappingReady ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium text-slate-700">Running Payday / Instant Loans:</span>
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                None Detected (0)
              </span>
            </div>
          ) : null}

          {mappingReady && (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                  All transactions
                  {uiTables?.recent_transactions?.length
                    ? ` (${uiTables.recent_transactions.length})`
                    : ''}
                </h4>
              </div>
              {uiTables?.recent_transactions?.length > 0 ? (
                <div className="overflow-x-auto max-h-[28rem]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr className="text-left text-slate-500 border-b border-slate-100">
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Narration</th>
                        <th className="px-3 py-2 font-medium text-right">Credit</th>
                        <th className="px-3 py-2 font-medium text-right">Debit</th>
                        <th className="px-3 py-2 font-medium text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uiTables.recent_transactions.map((t, i) => {
                        const amt = Number(t.amount);
                        const credit = Number.isFinite(amt) && amt > 0 ? amt : null;
                        const debit = Number.isFinite(amt) && amt < 0 ? Math.abs(amt) : null;
                        return (
                          <tr
                            key={`${t.date}-${t.amount}-${i}`}
                            className="border-b border-slate-50 hover:bg-slate-50/40"
                          >
                            <td className="px-3 py-1.5 whitespace-nowrap font-mono text-[11px]">
                              {t.date || '—'}
                            </td>
                            <td className="px-3 py-1.5 text-slate-600 max-w-[280px] truncate" title={t.narration}>
                              {t.narration || '—'}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums text-emerald-700">
                              {credit != null ? inr(credit) : '—'}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums text-rose-700">
                              {debit != null ? inr(debit) : '—'}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{inr(t.balance)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-3 py-4 text-xs text-slate-500">
                  No transactions in mapped report.
                </p>
              )}
            </div>
          )}

          {bankReport?.redacted && (
            <details className="rounded-lg border border-slate-200 bg-white p-3">
              <summary className="text-[11px] font-medium text-slate-600 cursor-pointer">
                Redacted Bank Data JSON
              </summary>
              <pre className="mt-2 text-[10px] bg-slate-50 border border-slate-100 rounded-md p-3 max-h-80 overflow-auto whitespace-pre-wrap break-all">
                {JSON.stringify(bankReport.redacted, null, 2)}
              </pre>
            </details>
          )}

          {!bankReport?.available && aaDisplay.key === 'processing' && (
            <p className="text-xs text-slate-500">
              Bank report not received yet — it will appear here automatically.
            </p>
          )}
        </>
      )}
    </div>
  );
}
