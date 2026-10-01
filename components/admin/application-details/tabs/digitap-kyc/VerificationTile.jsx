import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Shield, ShieldAlert, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { labelForKycField } from '@/lib/utils/kycDisplayLabels';

const VerificationTile = ({ stepNumber, title, subtitle, icon, status, description, actions, children, error, message, responseData, extraContent, childrenBeforeData = false }) => {
    const Icon = icon;
    const isDone = ['verified', 'completed', 'success', 1, true, 'matched', 'registered', 'signed'].includes(status);
    const isFailed = ['failed', 'rejected', 'not_matched', 'error'].includes(status);
    const isPending = ['initiated', 'in_progress'].includes(status);
    const isAwaiting = status === 'pending' || status == null || status === undefined || status === '';
    
    const statusConfig = {
        done: { color: "emerald", label: "VERIFIED", icon: BadgeCheck, bg: "bg-emerald-50", text: "text-emerald-600" },
        failed: { color: "rose", label: "FAILED", icon: ShieldAlert, bg: "bg-rose-50", text: "text-rose-600" },
        pending: { color: "slate", label: "IN PROGRESS", icon: Clock, bg: "bg-slate-100", text: "text-slate-800" },
        awaiting: { color: "amber", label: "NOT CHECKED", icon: Clock, bg: "bg-amber-50", text: "text-amber-700" },
        idle: { color: "slate", label: "NOT STARTED", icon: Shield, bg: "bg-slate-100", text: "text-slate-500" }
    };

    const currentStatus = isDone ? 'done' : isFailed ? 'failed' : isPending ? 'pending' : isAwaiting ? 'awaiting' : 'idle';
    const config = statusConfig[currentStatus];

    return (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden transition-colors hover:border-slate-300">
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2.5 bg-slate-50/60">
                <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                    <div className={cn("w-8 h-8 rounded-md flex items-center justify-center shrink-0 border border-slate-200", 
                        isDone ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                        isFailed ? "bg-rose-50 text-rose-700 border-rose-200" :
                        isPending ? "bg-slate-100 text-slate-800" :
                        "bg-slate-100 text-slate-400"
                    )}>
                        <Icon className={cn("w-4 h-4", isPending && "animate-spin")} />
                    </div>
                    <div className="min-w-0 flex-1">
                        {stepNumber != null && (
                            <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-0.5">
                                Step {stepNumber}
                            </span>
                        )}
                        <h4 className="text-sm font-semibold text-slate-900 leading-snug">{title}</h4>
                        {subtitle ? <p className="text-[11px] text-slate-500">{subtitle}</p> : null}
                        {description ? <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{description}</p> : null}
                    </div>
                </div>

                <div className="flex flex-wrap items-center sm:justify-end gap-1.5 shrink-0">
                    <Badge className={cn(
                        "text-[10px] font-semibold uppercase tracking-wide border-none px-2 py-0.5",
                        config.bg, config.text
                    )}>
                        {config.label}
                    </Badge>
                    {actions}
                </div>
            </div>

            {/* Error / Message Banner */}
            {(error || message) && (
                <div className={cn(
                    "px-3 py-2.5 border-t text-xs font-medium flex items-start gap-2",
                    error ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                )}>
                    {error ? (
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    ) : (
                        <BadgeCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    )}
                    <span className="flex-1 leading-snug break-words">
                        {error || message}
                    </span>
                </div>
            )}

            {/* Data Display */}
            {(() => {
                const dataBlock = responseData ? (() => {
                const entries = Object.entries(responseData).filter(([, val]) => val && val !== 'N/A');
                const nameEntry = entries.find(([k]) => k === 'name');
                const otherEntries = entries.filter(([k]) => k !== 'name');
                const renderField = (key, val, isNameRow = false) => {
                    const isID = ['request_id', 'aadhaar', 'pan', 'account'].includes(key);
                    const isAddress = key.includes('address');
                    return (
                        <div
                            key={key}
                            className={cn(
                                'flex flex-col gap-0.5',
                                isNameRow && 'col-span-2 md:col-span-4 pb-1.5 mb-1.5 border-b border-slate-100',
                                isAddress && 'col-span-2 md:col-span-4'
                            )}
                        >
                            <span className="text-[10px] text-slate-500 font-semibold">
                                {labelForKycField(key)}
                            </span>
                            <span
                                className={cn(
                                    'text-slate-800 wrap-break-word',
                                    isNameRow ? 'text-sm font-semibold' : 'text-xs',
                                    isID && !isNameRow && 'font-mono font-medium'
                                )}
                            >
                                {val}
                            </span>
                        </div>
                    );
                };
                return (
                    <div className="p-3 border-t border-slate-100 bg-white">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                            {nameEntry ? renderField(nameEntry[0], nameEntry[1], true) : null}
                            {otherEntries.map(([key, val]) => renderField(key, val))}
                        </div>
                    </div>
                );
                })() : null;

                const bodyBlock = children ? (
                    <div className="p-3 border-t border-slate-100 bg-slate-50/20">
                        {children}
                    </div>
                ) : null;

                return childrenBeforeData ? <>{bodyBlock}{dataBlock}</> : <>{dataBlock}{bodyBlock}</>;
            })()}

            {/* Extra Content Slot */}
            {extraContent && (
                <div className="p-3 border-t border-slate-100 bg-slate-50/20">
                    {extraContent}
                </div>
            )}
        </div>
    );
};

export default VerificationTile;
