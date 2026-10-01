import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ShieldCheck,
  Video,
  Eye,
  BadgeCheck,
  RefreshCw,
  UserCheck,
} from 'lucide-react';

import { useApplicationContext } from '@/components/admin/application-details/context/ApplicationContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { cn } from '@/lib/utils';

/**
 * Credit Verification Tab — Compact, professional layout
 * Focused on Video Verification with checklist & customer classification
 */
const CreditVerificationTab = () => {
    const { 
        data, 
        loanApp,
        handleVideoVerification,
        updating,
        isReadOnly,
    } = useApplicationContext();
    const { admin } = useAdminAuth();

    const role = String(admin?.role_code || admin?.role || '').toLowerCase();
    const canVerifyRole = [
        'super_admin',
        'admin',
        'operations',
        'operations_manager',
        'credit_manager',
        'underwriter',
        'approver',
    ].includes(role);
  
    const videoUrl = data?.videoDeclaration?.video_url || loanApp?.video_declaration_url;
    const isVideoSubmitted = !!videoUrl;
    const isVideoVerified = loanApp?.video_declaration_status === 'approved';
    const isVideoRejected = loanApp?.video_declaration_status === 'rejected';

    const isPastVerification = [
        'approved', 'offer_sent', 'offer_accepted', 'mandate_pending', 
        'esign_pending', 'esign_completed', 'disbursed', 'closed'
    ].includes(loanApp?.application_status);

    const isRepeatCustomer = 
        Number(loanApp?.is_repeat_customer) === 1 || 
        loanApp?.is_repeat_customer === true || 
        loanApp?.is_repeat_customer === '1' ||
        loanApp?.bucket === 'repeat';

    const statusLabel = (isVideoVerified || isPastVerification) ? 'Verified' : isVideoRejected ? 'Rejected' : isVideoSubmitted ? 'Submitted' : 'Pending';
    const statusColor = (isVideoVerified || isPastVerification) ? 'emerald' : isVideoRejected ? 'rose' : isVideoSubmitted ? 'indigo' : 'slate';

    const checklist = [
        { text: 'Face matches the profile photo and ID documents', done: isVideoSubmitted },
        { text: 'Applicant clearly states name and consent for the loan', done: isVideoVerified || isPastVerification },
        { text: 'Original PAN card is shown (if applicable)', done: isVideoVerified || isPastVerification },
    ];

    const handleApprove = () => {
        handleVideoVerification(true);
    };

    const handleReject = () => {
        const reason = window.prompt(
            'Enter reason for rejecting video declaration:',
            'Face or voice declaration does not meet verification requirements'
        );
        if (reason && reason.trim()) {
            handleVideoVerification(false, reason.trim());
        }
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            
            {/* Video Verification Card */}
            <div className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-2xs">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", `bg-${statusColor}-50`)}>
                            <Video className={cn("w-3.5 h-3.5", `text-${statusColor}-500`)} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.12em]">Video Verification</h4>
                                {isRepeatCustomer ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <RefreshCw className="w-2.5 h-2.5" />
                                        Repeat Customer
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                        New Customer
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-400">Identity and consent check for underwriter & operations review</p>
                        </div>
                    </div>
                    <Badge className={cn(
                        "text-[9px] font-bold uppercase tracking-widest border px-2.5 py-0.5",
                        statusColor === 'emerald' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                        statusColor === 'rose' && "bg-rose-50 text-rose-700 border-rose-200",
                        statusColor === 'indigo' && "bg-indigo-50 text-indigo-700 border-indigo-200",
                        statusColor === 'slate' && "bg-slate-100 text-slate-500 border-slate-200",
                    )}>
                        {statusLabel}
                    </Badge>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
                    {/* Video Player — 3 cols */}
                    <div className="lg:col-span-3 p-5 border-b lg:border-b-0 lg:border-r border-slate-100">
                        <div className="rounded-lg overflow-hidden bg-slate-900 border border-slate-200 aspect-video relative group">
                            {videoUrl ? (
                                <video src={videoUrl} controls className="w-full h-full object-contain" />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                                    <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-3">
                                        <AlertCircle className="w-6 h-6 text-white/40" />
                                    </div>
                                    <h4 className="text-sm font-bold text-white/70 mb-1">No Video Uploaded</h4>
                                    <p className="text-[11px] text-white/40 max-w-[220px] leading-relaxed">
                                        The applicant hasn't submitted a video declaration yet.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Checklist & Actions — 2 cols */}
                    <div className="lg:col-span-2 p-5 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verification Checklist</p>
                                <span className="text-[10px] font-medium text-slate-500">
                                    Reviewer: <strong className="text-slate-700 capitalize">{role.replace(/_/g, ' ')}</strong>
                                </span>
                            </div>
                            <div className="space-y-2">
                                {checklist.map((item, i) => (
                                    <div key={i} className="flex items-start gap-2.5 p-3 bg-slate-50/70 rounded-lg border border-slate-100">
                                        {item.done ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        ) : (
                                            <div className="w-4 h-4 rounded-full border-2 border-slate-200 mt-0.5 shrink-0" />
                                        )}
                                        <p className={cn("text-[11px] leading-relaxed", item.done ? "text-slate-700 font-medium" : "text-slate-400")}>
                                            {item.text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons for Authorized Reviewers (Underwriter, Approver, Operations, Credit Manager, Admin) */}
                        {canVerifyRole && !isReadOnly && isVideoSubmitted && !isVideoVerified && !isPastVerification && (
                            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                                <Button 
                                    size="sm"
                                    className="flex-1 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider shadow-2xs"
                                    onClick={handleApprove}
                                    disabled={updating}
                                >
                                    <BadgeCheck className="w-3.5 h-3.5 mr-1.5" /> Approve Video
                                </Button>
                                <Button 
                                    size="sm"
                                    variant="outline"
                                    className="h-9 px-4 rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold uppercase tracking-wider"
                                    onClick={handleReject}
                                    disabled={updating}
                                >
                                    <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                                </Button>
                            </div>
                        )}

                        {(isVideoVerified || isPastVerification) && (
                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-emerald-600">
                                <ShieldCheck className="w-4 h-4" />
                                <span className="text-[11px] font-bold uppercase tracking-wider">Video Declaration Verified</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreditVerificationTab;
