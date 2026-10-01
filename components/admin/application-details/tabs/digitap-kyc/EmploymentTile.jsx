import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Briefcase, RefreshCw, Building2, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import VerificationTile from './VerificationTile';

function normalizeUan12(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length === 12 ? digits : '';
}

export default function EmploymentTile({
    data,
    loanApp,
    userData,
    uanInput,
    setUanInput,
    lastAction,
    error,
    message,
    isReadOnly,
    updating,
    runningAction,
    handleAction,
    handleVerifyEmployment,
}) {
    const [showAltUan, setShowAltUan] = useState(false);

    // Read UAN from data.employment (bootstrap API puts it there), fall back to loanApp
    const empData = data?.employment || {};
    const uanStatus = empData.uan_status || loanApp?.uan_status;
    const uanNumber = empData.uan || loanApp?.uan;
    const uanList = Array.isArray(empData.uan_list) && empData.uan_list.length
        ? empData.uan_list
        : (uanNumber ? [uanNumber] : []);
    const storedUan =
        normalizeUan12(empData.uan) ||
        normalizeUan12(uanList[0]) ||
        normalizeUan12(loanApp?.uan) ||
        normalizeUan12(userData?.profile?.uan);
    const employmentActionActive =
        lastAction === 'employment' || lastAction === 'employment-mobile';
    const moonlightingDetected = empData.moonlighting_detected ?? loanApp?.moonlighting_detected;
    const rawHistory = empData.employment_history ?? loanApp?.employment_history;
    const historyList = (() => {
    if (Array.isArray(rawHistory)) return rawHistory;
    if (typeof rawHistory === 'string') {
        try { return JSON.parse(rawHistory); } catch { return []; }
    }
    return [];
    })();
    const isOpenJob = (emp) =>
    !emp?.date_of_exit ||
    emp.date_of_exit === '' ||
    emp.date_of_exit === '1800-01-01' ||
    String(emp.date_of_exit).startsWith('1800');
    const openJobs = historyList.filter(isOpenJob);
    const summary = empData.summary || {};
    const basicByUan = empData.basic_details_by_uan && typeof empData.basic_details_by_uan === 'object'
    ? empData.basic_details_by_uan
    : {};
    const primaryBasic =
    basicByUan[uanNumber] ||
    (uanList[0] ? basicByUan[uanList[0]] : null) ||
    Object.values(basicByUan)[0] ||
    null;
    // Digitap summary.is_employed can be false even when UAN has an open job (no exit).
    // Prefer open UAN records for the main "employed" signal; keep Digitap flag as secondary.
    const digitapEmployedFlag = summary.is_employed;
    const hasOpenUanJob = openJobs.length > 0;
    const employedLabel = hasOpenUanJob
    ? 'Yes (open UAN job)'
    : digitapEmployedFlag === true
        ? 'Yes'
        : digitapEmployedFlag === false
            ? 'No'
            : '—';
    const exitMarked = summary.date_of_exit_marked;
    const uanCount = summary.uan_count ?? uanList.length;
    const recentEmployer = summary.recent_employer_data || null;
    // Hide recent-employer block when it duplicates the only history card
    const recentDupesHistory =
    recentEmployer &&
    historyList.length === 1 &&
    (String(recentEmployer.establishment_id || '') === String(historyList[0]?.establishment_id || '') ||
        String(recentEmployer.establishment_name || '').toLowerCase() ===
            String(historyList[0]?.establishment_name || '').toLowerCase());
    const showRecentEmployer = recentEmployer && !recentDupesHistory;
    const inputUan = empData.input_data?.uan;
    const inputMobile = empData.input_data?.mobile;
    const customerMobileRaw =
        data?.mobile ||
        data?.application?.mobile ||
        userData?.mobile ||
        userData?.profile?.mobile ||
        loanApp?.mobile ||
        '';
    const customerMobile = String(customerMobileRaw || '').replace(/\D/g, '').slice(-10);
    const hasCustomerMobile = /^\d{10}$/.test(customerMobile);
    const showOpsDetails =
    empData.name_dob_filtering_score != null ||
    (inputUan != null && String(inputUan).trim() !== '') ||
    (inputMobile != null && String(inputMobile).trim() !== '') ||
    empData.epfo_details;
    const hasSuccessDetail =
    uanStatus === 'success' &&
    (historyList.length > 0 || primaryBasic || digitapEmployedFlag != null);

    const detailRow = (label, value) =>
    value != null && value !== '' ? (
        <div className="flex flex-col min-w-0" key={label}>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
            <span className="font-semibold text-slate-700 truncate text-[10px]" title={String(value)}>
                {String(value)}
            </span>
        </div>
    ) : null;

    const carriedFromLeadId = empData.carried_from_lead_id || null;
    const carriedFetchedOn = (() => {
        if (!empData.verified_at) return '';
        const d = new Date(empData.verified_at);
        return Number.isNaN(d.getTime())
            ? ''
            : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    })();

    const isEmploymentError =
        employmentActionActive ||
        /employment|uan|epfo|moonlighting|job|employer/i.test(String(error || ''));
    const isEmploymentMessage =
        employmentActionActive ||
        /employment|uan|epfo|moonlighting|job|employer/i.test(String(message || ''));

    return (
        <VerificationTile 
            stepNumber={7}
            title="Job history (UAN)" 
            subtitle="Employer & moonlighting check" 
            icon={Briefcase} 
            status={uanStatus} 
            description={
                storedUan
                    ? 'Verify with the stored UAN first. Enter a different UAN only if needed, or look up by mobile as a fallback.'
                    : 'Enter the customer’s 12-digit UAN to verify employment. If UAN is unknown, look up by mobile.'
            }
            error={isEmploymentError ? error : null}
            message={isEmploymentMessage ? message : null}
            responseData={uanStatus === 'success' ? {
                uan: uanNumber,
                employed: employedLabel,
                moonlighting: moonlightingDetected ? 'DETECTED (Multiple Active)' : 'Clear',
                employers: Array.isArray(historyList) ? historyList.length : 0,
                open_jobs: openJobs.length,
                last_employer: historyList?.[0]?.establishment_name || recentEmployer?.establishment_name || 'N/A',
            } : null}
            extraContent={hasSuccessDetail ? (
                <div className="space-y-4">
                    {carriedFromLeadId && (
                        <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-[10px] font-semibold text-indigo-800">
                            Carried from {carriedFromLeadId}
                            {carriedFetchedOn ? `, fetched ${carriedFetchedOn}` : ''}
                            <span className="ml-1 font-medium text-indigo-600">
                                (reused from the previous loan; re-verify for fresh data)
                            </span>
                        </div>
                    )}

                    {moonlightingDetected === 1 && (
                        <Alert className="border-rose-100 bg-rose-50/50 text-rose-800 rounded-lg p-3 flex items-start gap-2.5">
                            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                                <h5 className="text-xs font-bold text-rose-900 leading-none mb-1">Moonlighting Detected</h5>
                                <p className="text-[10px] text-rose-700 font-medium">
                                    This individual is currently working simultaneously with multiple organizations.
                                </p>
                            </div>
                        </Alert>
                    )}

                    {hasOpenUanJob && digitapEmployedFlag === false && (
                        <Alert className="border-amber-100 bg-amber-50/50 text-amber-900 rounded-lg p-3 flex items-start gap-2.5">
                            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <h5 className="text-xs font-bold text-amber-900 leading-none mb-1">Status note</h5>
                                <p className="text-[10px] text-amber-800 font-medium">
                                    UAN shows an open job (no exit date), but Digitap&apos;s employed flag is No
                                    {historyList[0]?.epfo?.is_recent === false ? ' (EPFO not recent)' : ''}.
                                </p>
                            </div>
                        </Alert>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                        {hasOpenUanJob ? (
                            <Badge className="text-[8px] font-bold uppercase bg-emerald-50 text-emerald-700 border-none">
                                Open UAN job
                            </Badge>
                        ) : digitapEmployedFlag === true ? (
                            <Badge className="text-[8px] font-bold uppercase bg-emerald-50 text-emerald-700 border-none">Employed</Badge>
                        ) : digitapEmployedFlag === false ? (
                            <Badge className="text-[8px] font-bold uppercase bg-amber-50 text-amber-700 border-none">Not employed</Badge>
                        ) : null}
                        {digitapEmployedFlag === false && hasOpenUanJob && (
                            <Badge className="text-[8px] font-bold uppercase bg-slate-100 text-slate-600 border-none">
                                Digitap flag: not employed
                            </Badge>
                        )}
                        {exitMarked === true && (
                            <Badge className="text-[8px] font-bold uppercase bg-slate-100 text-slate-600 border-none">Exit marked</Badge>
                        )}
                        {uanCount != null && (
                            <Badge className="text-[8px] font-bold uppercase bg-indigo-50 text-indigo-700 border-none">
                                {uanCount} UAN{Number(uanCount) === 1 ? '' : 's'}
                            </Badge>
                        )}
                        {moonlightingDetected === 1 ? (
                            <Badge className="text-[8px] font-bold uppercase bg-rose-50 text-rose-700 border-none">Moonlighting</Badge>
                        ) : moonlightingDetected === 0 ? (
                            <Badge className="text-[8px] font-bold uppercase bg-slate-50 text-slate-500 border-none">No moonlighting</Badge>
                        ) : null}
                    </div>

                    {uanList.length > 0 && (
                        <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">UAN list</p>
                            <p className="text-[11px] font-mono text-slate-700 break-all">{uanList.join(' · ')}</p>
                        </div>
                    )}

                    {primaryBasic && (
                        <div className="rounded-lg border border-slate-100 bg-white p-3 space-y-2">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Employee basic details</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-2">
                                {detailRow('Name', primaryBasic.name)}
                                {detailRow('Gender', primaryBasic.gender)}
                                {detailRow('Date of birth', primaryBasic.date_of_birth)}
                                {detailRow('Mobile', primaryBasic.mobile)}
                                {detailRow('Aadhaar verify status', primaryBasic.aadhaar_verification_status)}
                                {detailRow('Employee confidence', primaryBasic.employee_confidence_score)}
                            </div>
                        </div>
                    )}

                    {showRecentEmployer && (
                        <div className="rounded-lg border border-indigo-50 bg-indigo-50/30 p-3 space-y-2">
                            <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">Recent employer (summary)</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-2">
                                {detailRow('Establishment', recentEmployer.establishment_name)}
                                {detailRow('Establishment ID', recentEmployer.establishment_id)}
                                {detailRow('Member ID', recentEmployer.member_id)}
                                {detailRow('Joined', recentEmployer.date_of_joining)}
                                {detailRow('Exit', recentEmployer.date_of_exit)}
                                {detailRow('Matching UAN', recentEmployer.matching_uan)}
                                {detailRow('Employer confidence', recentEmployer.employer_confidence_score)}
                            </div>
                        </div>
                    )}

                    {historyList.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {historyList.map((emp, i) => {
                            const isActive = isOpenJob(emp);
                            const rowBasic = emp.uan ? basicByUan[emp.uan] : null;
                            return (
                                <div key={i} className="bg-white rounded-lg border border-slate-100 p-3 hover:border-slate-200 transition-all shadow-sm flex flex-col justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-tight truncate" title={emp.establishment_name}>
                                                    {emp.establishment_name || 'Unknown employer'}
                                                </h5>
                                            </div>
                                            <Badge className={cn(
                                                "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 shrink-0 rounded-md border-none",
                                                isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"
                                            )}>
                                                {isActive ? 'Active' : 'Exited'}
                                            </Badge>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] pt-1 border-t border-slate-50">
                                            {detailRow('Employee name', emp.name || rowBasic?.name || 'N/A')}
                                            {emp.guardian_name && detailRow('Guardian', emp.guardian_name)}
                                            {detailRow('UAN', emp.uan)}
                                            {detailRow('Establishment ID', emp.establishment_id)}
                                            {detailRow('Member ID', emp.member_id)}
                                            {detailRow('Joined', emp.date_of_joining || 'N/A')}
                                            {!isActive && detailRow('Exit', emp.date_of_exit)}
                                            {emp.leave_reason && detailRow('Leave reason', emp.leave_reason)}
                                            {emp.employment_period_in_months != null && detailRow('Period (months)', emp.employment_period_in_months)}
                                            {emp.employer_confidence_score != null && detailRow('Employer confidence', emp.employer_confidence_score)}
                                            {emp.last_pf_submitted && emp.last_pf_submitted !== '1800-01-01' && detailRow('Last PF submit', emp.last_pf_submitted)}
                                            {emp.wage_month && detailRow('Wage month', emp.wage_month)}
                                            {emp.epfo?.is_recent != null && detailRow('EPFO recent', emp.epfo.is_recent ? 'Yes' : 'No')}
                                            {emp.epfo?.has_pf_filings_details != null && detailRow('PF filings', emp.epfo.has_pf_filings_details ? 'Yes' : 'No')}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    )}

                    {showOpsDetails && (
                        <details className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                            <summary className="text-[10px] font-semibold text-slate-600 cursor-pointer select-none">
                                Ops details (scores & input)
                            </summary>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                                {detailRow('Name/DOB filter score', empData.name_dob_filtering_score)}
                                {detailRow('Input UAN', inputUan)}
                                {detailRow('Input mobile', inputMobile)}
                                {empData.epfo_details && (
                                    <pre className="col-span-2 text-[9px] text-slate-600 whitespace-pre-wrap break-all bg-white rounded-lg border border-slate-100 p-2 max-h-32 overflow-y-auto">
                                        {JSON.stringify(empData.epfo_details, null, 2)}
                                    </pre>
                                )}
                            </div>
                        </details>
                    )}
                </div>
            ) : null}
        >
            {!isReadOnly && (
                <div className="flex flex-col gap-2">
                    {storedUan ? (
                        <div className="flex flex-col gap-1.5">
                            <p className="text-[9px] text-slate-500">
                                Stored UAN{' '}
                                <span className="font-mono font-semibold text-slate-800">{storedUan}</span>
                            </p>
                            <Button
                                onClick={() =>
                                    handleAction(() => handleVerifyEmployment(storedUan), 'employment')
                                }
                                disabled={updating}
                                size="sm"
                                className={cn(
                                    'h-8 px-3 text-[10px] font-semibold uppercase rounded-md transition-colors w-auto self-start',
                                    uanStatus === 'success'
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                        : 'bg-slate-800 text-white hover:bg-slate-900'
                                )}
                                title={`Verify employment with UAN ${storedUan}`}
                            >
                                {runningAction === 'employment' && (
                                    <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                                )}
                                {uanStatus === 'success'
                                    ? `RE-VERIFY UAN · ${storedUan}`
                                    : `VERIFY WITH THIS UAN · ${storedUan}`}
                            </Button>
                            <button
                                type="button"
                                className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-800 self-start"
                                onClick={() => setShowAltUan((v) => !v)}
                            >
                                {showAltUan ? 'Hide different UAN' : 'Use a different UAN'}
                            </button>
                            {showAltUan && (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={12}
                                        value={uanInput}
                                        onChange={(e) =>
                                            setUanInput(e.target.value.replace(/\D/g, '').slice(0, 12))
                                        }
                                        placeholder="Enter 12-digit UAN"
                                        className="flex-1 h-8 px-3 text-[10px] font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-all"
                                    />
                                    <Button
                                        onClick={() =>
                                            handleAction(() => handleVerifyEmployment(uanInput), 'employment')
                                        }
                                        disabled={updating || uanInput.length !== 12}
                                        size="sm"
                                        className="h-8 px-4 text-[9px] font-bold uppercase rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                                    >
                                        {runningAction === 'employment' && (
                                            <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                                        )}
                                        VERIFY UAN
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={12}
                                value={uanInput}
                                onChange={(e) =>
                                    setUanInput(e.target.value.replace(/\D/g, '').slice(0, 12))
                                }
                                placeholder="Enter 12-digit UAN"
                                className="flex-1 h-8 px-3 text-[10px] font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-all"
                            />
                            <Button
                                onClick={() =>
                                    handleAction(() => handleVerifyEmployment(uanInput), 'employment')
                                }
                                disabled={updating || uanInput.length !== 12}
                                size="sm"
                                className={cn(
                                    'h-8 px-4 text-[9px] font-bold uppercase rounded-lg transition-all',
                                    uanStatus === 'success'
                                        ? 'bg-emerald-50 text-emerald-500 border border-emerald-100'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                )}
                            >
                                {runningAction === 'employment' && (
                                    <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                                )}
                                {uanStatus === 'success' ? 'RE-VERIFY UAN' : 'VERIFY UAN'}
                            </Button>
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100">
                        <Button
                            onClick={() =>
                                handleAction(
                                    () =>
                                        handleVerifyEmployment({
                                            type: 'MOBILE',
                                            identifier: customerMobile,
                                        }),
                                    'employment-mobile'
                                )
                            }
                            disabled={updating || !hasCustomerMobile}
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-[10px] font-semibold uppercase rounded-md transition-colors w-auto self-start"
                            title={
                                hasCustomerMobile
                                    ? `Fetch UANs using ${customerMobile}`
                                    : 'Customer mobile not available on this application'
                            }
                        >
                            {runningAction === 'employment-mobile' && (
                                <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                            )}
                            {hasCustomerMobile
                                ? `LOOKUP BY MOBILE · ${customerMobile}`
                                : 'LOOKUP BY MOBILE (NO MOBILE)'}
                        </Button>
                        <p className="text-[9px] text-slate-400">
                            {storedUan
                                ? 'Fallback if the stored UAN fails — discovers UANs linked to the customer mobile.'
                                : 'Use when UAN is unknown — discovers UANs linked to the customer mobile.'}
                        </p>
                    </div>
                </div>
            )}
        </VerificationTile>
    );
}
