import React from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Fingerprint, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatKycAddress } from '@/lib/utils/formatKycAddress';
import VerificationTile from './VerificationTile';

export default function AadhaarTile({
    aadhaarTileStatus,
    isKycVerified,
    digilockerAccessUrl,
    needsDigilockerRerunForPan,
    digilockerStoredDocs,
    kycDetails,
    parsedVerificationResponse,
    parsedAddress,
    lastAction,
    error,
    message,
    isReadOnly,
    updating,
    runningAction,
    handleAction,
    handleInitiateDigioKYC,
}) {
    return (
        <VerificationTile 
            stepNumber={1}
            title="Aadhaar — prove identity" 
            subtitle="Name and address from government ID" 
            icon={Fingerprint} 
            status={aadhaarTileStatus} 
            description="Do this first. After this you can run selfie and other checks." 
            error={lastAction === 'kyc' ? error : null} 
            message={lastAction === 'kyc' ? message : null}
            extraContent={!isKycVerified ? (
                <div className="space-y-2">
                    <div className="rounded-lg bg-yellow-50 border border-yellow-100 p-3 text-[11px] text-slate-700">
                        Aadhaar verification must finish before photo and liveness checks can be run. Please complete DigiLocker (Aadhaar + PAN) first.
                    </div>
                    {digilockerAccessUrl ? (
                        <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-[11px] text-indigo-900 flex flex-wrap items-center gap-2">
                            <span className="font-semibold">DigiLocker link ready</span>
                            <span className="text-indigo-700/80">
                                Customer also gets this link by email when Start Aadhaar runs (if email is on file).
                            </span>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[9px] font-bold uppercase"
                                onClick={() => window.open(digilockerAccessUrl, '_blank', 'noopener,noreferrer')}
                            >
                                Open link
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[9px] font-bold uppercase"
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(digilockerAccessUrl);
                                    } catch { /* ignore */ }
                                }}
                            >
                                Copy
                            </Button>
                        </div>
                    ) : null}
                </div>
            ) : (needsDigilockerRerunForPan || digilockerStoredDocs.length) ? (
                <div className="space-y-2">
                    {needsDigilockerRerunForPan ? (
                        <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-[11px] text-amber-900">
                            Aadhaar is verified but PAN was not returned by DigiLocker. Click
                            {' '}<span className="font-semibold">Re-run DigiLocker (PAN)</span> to send a fresh
                            link, and ask the customer to consent to PAN on the DigiLocker screen.
                        </div>
                    ) : null}
                    {digilockerStoredDocs.length ? (
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-[11px] text-slate-700">
                            <p className="font-semibold mb-1">DigiLocker documents (S3)</p>
                            <p className="text-[10px] text-slate-500 mb-2">
                                e-Aadhaar XML and other DigiLocker files are stored in S3 — open a signed link below (not raw XML in DB).
                            </p>
                            <ul className="space-y-1.5">
                                {digilockerStoredDocs.map((d, i) => {
                                    const label = `${d.docType || 'DOC'}${d.docExtension ? `.${d.docExtension}` : ''}`;
                                    const href = d.downloadUrl || d.s3Url || null;
                                    const isXml = String(d.docExtension || '').toLowerCase() === 'xml'
                                        || String(d.docType || '').toUpperCase().includes('AADHAAR');
                                    return (
                                        <li
                                            key={`${d.docType}-${i}`}
                                            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white border border-slate-100 px-2.5 py-1.5"
                                        >
                                            <span className="font-medium text-slate-800">
                                                {label}
                                                {isXml ? (
                                                    <span className="ml-1.5 text-[9px] uppercase tracking-wide text-indigo-600 font-bold">
                                                        e-Aadhaar / XML
                                                    </span>
                                                ) : null}
                                            </span>
                                            {href ? (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 px-2 text-[9px] font-bold uppercase"
                                                    onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
                                                >
                                                    <ExternalLink className="w-3 h-3 mr-1" />
                                                    Open
                                                </Button>
                                            ) : (
                                                <span className="text-[10px] text-slate-400">No file URL</span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ) : null}
                </div>
            ) : null}
            responseData={(kycDetails?.verification_status || kycDetails?.aadhaar_name) ? {
                mode: kycDetails?.kyc_type || 'digitap',
                status: kycDetails?.verification_status || 'pending',
                name: kycDetails?.aadhaar_name || 'N/A',
                father_name: parsedVerificationResponse?.father_name || 'N/A',
                dob: kycDetails?.aadhaar_dob ? new Date(kycDetails.aadhaar_dob).toLocaleDateString('en-IN') : 'N/A',
                gender: kycDetails?.aadhaar_gender || 'N/A',
                aadhaar: kycDetails?.aadhaar_number_masked || 'N/A',
                district_state: parsedAddress ? `${parsedAddress.district_or_city || parsedAddress.dist || parsedAddress.city || ''}, ${parsedAddress.state || ''}` : 'N/A',
                pincode: parsedAddress?.pincode || parsedAddress?.pc || 'N/A',
                current_address: formatKycAddress(parsedVerificationResponse?.current_address)
                    || formatKycAddress(parsedAddress)
                    || 'N/A',
                permanent_address: formatKycAddress(parsedVerificationResponse?.permanent_address)
                    || formatKycAddress(parsedAddress)
                    || 'N/A',
                request_id: kycDetails?.digio_request_id || kycDetails?.digilocker_code || parsedVerificationResponse?.transactionId || 'N/A'
            } : null}
        >
            {!isReadOnly && (
                <Button 
                    onClick={() => handleAction(handleInitiateDigioKYC, 'kyc')} 
                    disabled={updating || (aadhaarTileStatus === 'verified' && !needsDigilockerRerunForPan)} 
                    size="sm"
                    title={needsDigilockerRerunForPan ? 'Sends a fresh DigiLocker link so the customer can consent to PAN' : undefined}
                    className={cn("h-8 px-5 text-[9px] font-bold uppercase rounded-lg shadow-sm transition-all cursor-pointer", 
                        needsDigilockerRerunForPan
                            ? "bg-amber-500 text-white hover:bg-amber-600"
                            : aadhaarTileStatus === 'verified' ? "bg-emerald-50 text-emerald-500 border border-emerald-100 hover:bg-emerald-50" : "bg-indigo-600 text-white hover:bg-indigo-700")}
                >
                    {runningAction === 'kyc' && <RefreshCw className="w-3 h-3 mr-2 animate-spin" />}
                    {needsDigilockerRerunForPan
                        ? 'Re-run DigiLocker (PAN)'
                        : aadhaarTileStatus === 'verified' ? 'Aadhaar Done' : 'Start Aadhaar'}
                </Button>
            )}
        </VerificationTile>
    );
}
