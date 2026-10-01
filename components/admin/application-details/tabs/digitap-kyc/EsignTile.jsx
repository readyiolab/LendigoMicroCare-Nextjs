import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, RefreshCw, Copy, Download, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import VerificationTile from './VerificationTile';

export default function EsignTile({
    esignComplete,
    esignAwaitingCustomer,
    isEsignProcessing,
    esignStatus,
    esignSigningUrl,
    customerDisplayName,
    data,
    lastAction,
    error,
    message,
    isReadOnly,
    updating,
    runningAction,
    uploading,
    uploadingType,
    canSendToSign,
    downloadingUnsigned,
    signedAgreementInputRef,
    handleAction,
    handleInitiateEsign,
    handleCheckEsignStatus,
    handleDownloadUnsignedAgreement,
    handleUploadSignedAgreementFile,
}) {
    return (
        <VerificationTile 
            stepNumber={5}
            title="Loan agreement"
            subtitle="Sign before EMI auto-debit"
            icon={FileText} 
            status={esignComplete ? 'completed' : (esignAwaitingCustomer || isEsignProcessing ? 'initiated' : esignStatus)} 
            error={lastAction === 'esign' ? error : null} 
            message={lastAction === 'esign' ? message : null}
            actions={<span className="hidden" aria-hidden="true" />}
            childrenBeforeData
            responseData={{ 
                name: customerDisplayName || undefined,
                status: esignComplete
                    ? 'Signed'
                    : (isEsignProcessing
                        ? 'Sending…'
                        : (esignAwaitingCustomer ? 'Waiting for customer' : 'Not sent')),
                type: (data?.esignDocs || []).some((d) => d.esign_provider === 'esign_direct' && ['signed', 'completed'].includes(String(d.esign_status || d.status || '').toLowerCase()))
                    ? 'Uploaded signed PDF'
                    : 'Digitap Aadhaar e-sign'
            }}
        >
            {esignComplete ? (
                <div className="flex flex-wrap items-center gap-2">
                    <Button 
                        onClick={() => {
                            const docs = data?.esignDocs || [];
                            const doc = docs.find(d => ['loan_agreement', 'combined_agreement'].includes(d.document_type)) || docs[0];
                            const urlToOpen = doc?.signed_document_url || doc?.document_url;
                            if (urlToOpen) {
                                window.open(urlToOpen, '_blank', 'noopener,noreferrer');
                            } else {
                                const ref = data?.application?.id || data?.application?.application_number || '';
                                if (ref) {
                                    window.open(`/api/v1/admin/applications/${ref}/documents/loan-agreement`, '_blank', 'noopener,noreferrer');
                                }
                            }
                        }}
                        variant="default"
                        size="sm"
                        className="h-8 px-3.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                        <FileText className="w-3.5 h-3.5 mr-1.5" /> View signed PDF
                    </Button>
                    {(() => {
                        const assignedName =
                            data?.esignAssignedBy ||
                            (data?.esignDocs || []).find((d) => d.initiated_by_name)?.initiated_by_name;
                        if (!assignedName) return null;
                        return (
                            <p className="text-[11px] text-slate-500">
                                Assigned by <span className="font-semibold text-slate-700">{assignedName}</span>
                            </p>
                        );
                    })()}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Option 1</p>
                            <p className="text-sm font-semibold text-slate-900 mt-0.5">Digitap e-sign</p>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Send a signing link to the customer’s phone.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {!isReadOnly && esignAwaitingCustomer && esignSigningUrl && (
                                <>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-8 px-3 text-[10px] font-semibold border-indigo-200 text-indigo-700"
                                        onClick={() => window.open(esignSigningUrl, '_blank', 'noopener,noreferrer')}
                                    >
                                        Open link
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-8 px-3 text-[10px] font-semibold"
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(esignSigningUrl);
                                            } catch { /* ignore */ }
                                        }}
                                    >
                                        <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-8 px-3 text-[10px] font-semibold"
                                        disabled={runningAction === 'esign-status'}
                                        onClick={() => handleAction(handleCheckEsignStatus, 'esign-status')}
                                        title="Ask Digitap whether the customer has signed"
                                    >
                                        {runningAction === 'esign-status' && (
                                            <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                                        )}
                                        Check sign status
                                    </Button>
                                </>
                            )}
                            {!isReadOnly && (
                                <Button 
                                    onClick={() => handleAction(handleInitiateEsign, 'esign')} 
                                    disabled={
                                        updating ||
                                        isEsignProcessing ||
                                        runningAction === 'esign' ||
                                        esignAwaitingCustomer ||
                                        !canSendToSign
                                    } 
                                    title={
                                        canSendToSign
                                            ? undefined
                                            : 'Complete Step 4 (video KYC) before sending the loan agreement for signing'
                                    }
                                    size="sm"
                                    className={cn("h-8 px-3.5 text-[10px] font-semibold rounded-lg", 
                                        esignAwaitingCustomer || isEsignProcessing
                                            ? "bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-50"
                                            : "bg-emerald-600 text-white hover:bg-emerald-700")}
                                >
                                    {(runningAction === 'esign' || isEsignProcessing) && (
                                        <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                                    )}
                                    {isEsignProcessing
                                        ? 'Sending…'
                                        : esignAwaitingCustomer
                                            ? 'Waiting for customer'
                                            : 'Send to sign'}
                                </Button>
                            )}
                        </div>
                        {!canSendToSign && (
                            <p className="text-[11px] text-amber-600">
                                Available after video verification (Step 4).
                            </p>
                        )}
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Option 2</p>
                            <p className="text-sm font-semibold text-slate-900 mt-0.5">External vendor</p>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Download the PDF, get it signed, then upload it here.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                onClick={handleDownloadUnsignedAgreement}
                                disabled={downloadingUnsigned || updating}
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-[10px] font-semibold"
                            >
                                {downloadingUnsigned
                                    ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                                    : <Download className="w-3.5 h-3.5 mr-1" />}
                                Download
                            </Button>
                            {!isReadOnly && (
                                <>
                                    <input
                                        ref={signedAgreementInputRef}
                                        type="file"
                                        accept="application/pdf"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            e.target.value = '';
                                            handleUploadSignedAgreementFile(file);
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        onClick={() => signedAgreementInputRef.current?.click()}
                                        disabled={updating || uploading || uploadingType === 'loan_agreement'}
                                        size="sm"
                                        className="h-8 px-3 text-[10px] font-semibold bg-slate-900 text-white hover:bg-slate-800"
                                    >
                                        {(uploading && uploadingType === 'loan_agreement')
                                            ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                                            : <Upload className="w-3.5 h-3.5 mr-1" />}
                                        {(uploading && uploadingType === 'loan_agreement')
                                            ? 'Uploading…'
                                            : 'Upload signed PDF'}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </VerificationTile>
    );
}
