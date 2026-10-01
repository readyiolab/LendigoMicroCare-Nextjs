import React from 'react';
import { Button } from '@/components/ui/button';
import { ScanFace, RefreshCw, Mail, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildSelfieCheckDisplay } from '@/lib/utils/selfieVerificationDisplay';
import VerificationTile from './VerificationTile';

export default function SelfieTile({
    selfieVerificationStatus,
    selfieData,
    selfieCheckFeedback,
    lastAction,
    error,
    message,
    isReadOnly,
    updating,
    runningAction,
    canRunSelfieChecks,
    aadhaarPhotoSrc,
    selfiePhotoSrc,
    handleAction,
    handleFaceMatch,
    handleLivenessCheck,
    handleSendSelfieRetakeLink,
}) {
    return (
        <VerificationTile 
            stepNumber={4}
            title="Selfie — face match" 
            subtitle="Digitap vs Aadhaar" 
            icon={ScanFace} 
            status={selfieVerificationStatus} 
            description="After step 1: Digitap face match vs Aadhaar photo, liveness check, or email a new selfie link." 
            error={(['face', 'live'].includes(lastAction) ? error : null) || ((selfieVerificationStatus === 'failed') ? selfieData?.wf_customer_message : null)} 
            message={['face', 'live', 'retake'].includes(lastAction) ? message : null}
            responseData={buildSelfieCheckDisplay(selfieData, selfieCheckFeedback)}
            actions={!isReadOnly ? (
                <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                        onClick={() => handleAction(handleFaceMatch, 'face')}
                        disabled={updating || !canRunSelfieChecks || selfieData?.face_match_status === 'matched'}
                        variant="secondary"
                        size="sm"
                        className={cn(
                            "h-8 px-3 text-[9px] font-bold uppercase tracking-wide shrink-0",
                            selfieData?.face_match_status === 'matched'
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-900 text-white hover:bg-slate-800"
                        )}
                    >
                        {runningAction === 'face' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                        {selfieData?.face_match_status === 'matched' ? 'Photo matched ✓' : 'Match photo'}
                    </Button>
                    <Button
                        onClick={() => handleAction(handleLivenessCheck, 'live')}
                        disabled={updating || !canRunSelfieChecks || Number(selfieData?.liveness_check) === 1}
                        variant="outline"
                        size="sm"
                        className={cn(
                            "h-8 px-3 text-[9px] font-bold uppercase tracking-wide shrink-0",
                            Number(selfieData?.liveness_check) === 1
                                ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                : "border-slate-200 text-slate-600"
                        )}
                    >
                        {runningAction === 'live' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                        {Number(selfieData?.liveness_check) === 1 ? 'Live OK ✓' : 'Check live photo'}
                    </Button>
                    <Button
                        onClick={() => handleAction(handleSendSelfieRetakeLink, 'retake')}
                        disabled={updating || !canRunSelfieChecks || selfieVerificationStatus === 'verified'}
                        variant="outline"
                        size="sm"
                        className={cn(
                            "h-8 px-3 text-[9px] font-bold uppercase tracking-wide shrink-0",
                            selfieVerificationStatus === 'verified'
                                ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                : "border-amber-300 text-amber-900 hover:bg-amber-50"
                        )}
                        title={
                            selfieVerificationStatus === 'verified'
                                ? 'Selfie is already verified — no retake needed'
                                : 'Sends email with a phone link — customer takes a new selfie (no login)'
                        }
                    >
                        {runningAction === 'retake' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                        <Mail className="w-3 h-3 mr-1" />
                        Email new selfie link
                    </Button>
                </div>
            ) : null}
        >
            <div className="space-y-4">
                {!canRunSelfieChecks && (
                    <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-[11px] text-amber-950">
                        Complete <strong>Aadhaar verification</strong> first, then you can use the buttons above.
                    </div>
                )}
                {(aadhaarPhotoSrc || selfiePhotoSrc) && (
                    <>
                        <div className="p-4 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                                {aadhaarPhotoSrc && (
                                    <div className="flex flex-col items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200/60">
                                        <div className="w-full max-w-[220px] aspect-square bg-white rounded-lg overflow-hidden border border-slate-200 shadow-2xs">
                                            <img 
                                                src={aadhaarPhotoSrc} 
                                                className="w-full h-full object-cover" 
                                                alt="Aadhaar" 
                                                loading="lazy" 
                                                decoding="async" 
                                            />
                                        </div>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-600 bg-white border border-slate-200 uppercase tracking-wide">
                                            Aadhaar Photo
                                        </span>
                                    </div>
                                )}
                                {selfiePhotoSrc && (
                                    <div className="flex flex-col items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200/60">
                                        <div className="w-full max-w-[220px] aspect-square bg-white rounded-lg overflow-hidden border border-slate-200 shadow-2xs">
                                            <img 
                                                src={selfiePhotoSrc} 
                                                className="w-full h-full object-cover" 
                                                alt="Selfie" 
                                                loading="lazy" 
                                                decoding="async" 
                                            />
                                        </div>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 uppercase tracking-wide">
                                            Customer Selfie
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {selfieData?.latitude && selfieData?.longitude ? (
                            <div className="flex items-center justify-between p-3.5 bg-indigo-50/60 rounded-lg border border-indigo-100">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100/80 flex items-center justify-center shrink-0">
                                        <MapPin className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wide">Selfie Capture Location</p>
                                        <p className="text-[11px] text-slate-600 font-mono">
                                            {parseFloat(selfieData.latitude).toFixed(4)}, {parseFloat(selfieData.longitude).toFixed(4)}
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href={`https://www.google.com/maps?q=${selfieData.latitude},${selfieData.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-[10px] font-bold uppercase tracking-wider text-indigo-700 hover:bg-indigo-50 shadow-2xs transition-all"
                                >
                                    View Map ↗
                                </a>
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </VerificationTile>
    );
}
