import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Fingerprint, RefreshCw, CheckCircle2, XCircle,
    Landmark, CreditCard, FileText, ScanFace, Zap, Briefcase,
} from 'lucide-react';
import { useApplicationContext } from '@/components/admin/application-details/context/ApplicationContext';
import { adminAPI } from '@/lib/api';
import { cn } from '@/lib/utils';
import { pickKycPhotoDisplayUrl, pickSelfieDisplayUrl } from '@/lib/utils/media';
import { getOptimizedUrl } from '@/lib/services/cloudinaryUpload';
import { isEsignCompleteForApp } from '@/lib/utils/kycDisplayLabels';
import { buildDigitapEsignStandaloneUrl } from '@/lib/utils/digitapEsignUrl';
import { isPanVerified } from '@/lib/utils/staffVerificationGates';
import AadhaarTile from './digitap-kyc/AadhaarTile';
import PanTile from './digitap-kyc/PanTile';
import BankTile from './digitap-kyc/BankTile';
import SelfieTile from './digitap-kyc/SelfieTile';
import EsignTile from './digitap-kyc/EsignTile';
import MandateTile from './digitap-kyc/MandateTile';
import EmploymentTile from './digitap-kyc/EmploymentTile';
import { canEditLoanBank } from '../common/EditableDisbursalBankBlock';

const DONE_STATUSES = new Set(['verified', 'completed', 'success', 'registered', 'matched', 'signed']);

function isStepDone(status) {
    return DONE_STATUSES.has(String(status || '').toLowerCase());
}
export default function DigitapKycTab() {
    const { 
        data, userData, loanApp, handleInitiateDigioKYC, handleVerifyBankDetails, handleManualVerifyBank, handleUpdateDisbursalBankDetails, handleManualVerifyPan, 
        handleInitiateEsign, handleFaceMatch, handleLivenessCheck, handleRejectSelfie, updating, isReadOnly, isClosed,
        handleInitiateMandate, handleManualVerifyMandate, handleResendMandateAuthLink, mandateRegistration, fetchKycSection, fetchBankSection,
        handleVerifyEmployment,
        error, message, admin, selfieCheckFeedback,
        isEsignProcessing,
        applicationId,
        handleEsignUpload,
        uploading,
        uploadingType,
        setError,
        setMessage,
    } = useApplicationContext();

    const handleSendSelfieRetakeLink = async () => {
        await handleRejectSelfie(
            'Please open the link on your mobile phone and take a new clear selfie in good light, facing the camera.'
        );
    };

    const refreshKycSections = async () => {
        await Promise.all([fetchKycSection(true), fetchBankSection(true)]);
    };

    const [runningAction, setRunningAction] = useState(null);
    const [lastAction, setLastAction] = useState(null);
    const employmentUanSeed =
        String(data?.employment?.uan || loanApp?.uan || userData?.profile?.uan || '').replace(/\D/g, '').slice(0, 12);
    const [uanInput, setUanInput] = useState(employmentUanSeed);

    useEffect(() => {
        const next = String(
            data?.employment?.uan || loanApp?.uan || userData?.profile?.uan || ''
        ).replace(/\D/g, '').slice(0, 12);
        if (next.length === 12) {
            setUanInput((prev) => (prev === next ? prev : next));
        }
    }, [data?.employment?.uan, loanApp?.uan, userData?.profile?.uan]);

    // PAN edit / manual verify state
    const [panInput, setPanInput] = useState('');
    const [panEditMode, setPanEditMode] = useState(false);
    const [showManualPanForm, setShowManualPanForm] = useState(false);
    const [manualPanRemark, setManualPanRemark] = useState('');

    // Manual bank verify remark state
    const [manualBankRemark, setManualBankRemark] = useState('');
    const [showManualBankForm, setShowManualBankForm] = useState(false);

    // Manual e-mandate verify remark state (until Digitap verification is live)
    const [manualMandateRemark, setManualMandateRemark] = useState('');
    const [showManualMandateForm, setShowManualMandateForm] = useState(false);

    // Bank IFSC / account edit state
    const [bankEditMode, setBankEditMode] = useState(false);
    const [bankIfscInput, setBankIfscInput] = useState('');
    const [bankAccountInput, setBankAccountInput] = useState('');
    /** Digitap eNACH auth: Netbanking | DebitCard | Aadhaar */
    const [mandateAuthMode, setMandateAuthMode] = useState('Netbanking');

    // Wrapper for all async verification actions — manages loading/spinner state
    const handleAction = async (actionFn, actionId) => {
        setRunningAction(actionId);
        setLastAction(actionId);
        try {
            await actionFn();
        } catch (err) {
            console.error(`[DigitapKycTab] Action "${actionId}" failed:`, err);
        } finally {
            setRunningAction(null);
        }
    };

    const signedAgreementInputRef = useRef(null);
    const [downloadingUnsigned, setDownloadingUnsigned] = useState(false);

    // Pulls signed status from Digitap when the webhook has not arrived
    const handleCheckEsignStatus = async () => {
        if (!applicationId) return;
        setLastAction('esign');
        setError?.('');
        try {
            const response = await adminAPI.checkEsignStatus(applicationId);
            setMessage?.(response?.data?.message || response?.message || 'E-sign status checked');
            await refreshKycSections();
        } catch (err) {
            setError?.(
                err.response?.data?.message || err.message || 'Failed to check e-sign status'
            );
        }
    };

    const handleDownloadUnsignedAgreement = async () => {
        if (!applicationId) return;
        setDownloadingUnsigned(true);
        setLastAction('esign');
        try {
            const response = await adminAPI.getLoanDocument(applicationId, 'loan-agreement', { variant: 'unsigned' });
            const payload = response?.data ?? response;
            const blob = payload instanceof Blob ? payload : new Blob([payload], { type: 'application/pdf' });
            if (blob.type && blob.type.includes('json')) {
                const text = await blob.text();
                try {
                    const json = JSON.parse(text);
                    throw new Error(json.message || 'Failed to download agreement');
                } catch (parseErr) {
                    if (parseErr.message && !parseErr.message.includes('JSON')) throw parseErr;
                }
            }
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Loan_Agreement_${applicationId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('[DigitapKycTab] Unsigned agreement download failed:', err);
            setError?.(err.response?.data?.message || err.message || 'Failed to download agreement');
        } finally {
            setDownloadingUnsigned(false);
        }
    };

    const handleUploadSignedAgreementFile = async (file) => {
        if (!file || !handleEsignUpload) return;
        if (file.type && file.type !== 'application/pdf') {
            setError?.('Please upload a PDF of the signed agreement.');
            setLastAction('esign');
            return;
        }
        setLastAction('esign');
        await handleEsignUpload(file, 'loan_agreement');
        await fetchBankSection(true);
    };

    const kycDetails = data?.kyc_details || {};
    const overallKycStatus = kycDetails.verification_status;
    const safeJsonParse = (value) => {
        try {
            return typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
            return null;
        }
    };
    let digioSpecificStatus = kycDetails.digio_status;
    let parsedVerificationResponse = null;

    if (kycDetails?.verification_response && kycDetails.verification_response !== 'null') {
        try {
            parsedVerificationResponse = safeJsonParse(kycDetails.verification_response);
        } catch {
            parsedVerificationResponse = null;
        }
    }

    let parsedAddress = null;
    if (kycDetails?.aadhaar_address) {
        try {
            parsedAddress = safeJsonParse(kycDetails.aadhaar_address);
        } catch {
            parsedAddress = null;
        }
    }

    const aadhaarTileStatus =
        overallKycStatus === 'verified'
            ? 'verified'
            : (digioSpecificStatus || overallKycStatus || 'pending');
    
    const bankDetails = data?.bankDetails || data?.bank_details || {};
    const pennyDropStatus = bankDetails?.penny_drop_status;
    const bankCheckAttempted = Boolean(bankDetails?.penny_drop_ref || bankDetails?.penny_drop_response);
    const bankTileStatus = (() => {
        if (pennyDropStatus === 'success' || Number(bankDetails?.is_verified) === 1) {
            return 'success';
        }
        if (pennyDropStatus === 'failed' && bankCheckAttempted) {
            return 'failed';
        }
        if (pennyDropStatus === 'initiated') {
            return 'initiated';
        }
        return 'pending';
    })();

    const bankFailureHint = pennyDropStatus === 'failed' && !bankCheckAttempted
        ? 'Status was stale. Click Verify bank to run a fresh bank check.'
        : bankDetails?.penny_drop_remark || bankDetails?.wf_customer_message || null;
    const panVerified = isPanVerified({ userData, panVerification: data?.pan_verification });
    const panFromDigilocker =
        String(data?.pan_verification?.wf_source || '').toUpperCase() === 'DIGITAP_DIGILOCKER';
    // Aadhaar done but PAN never came from DigiLocker (pre-PULL_ALL_DOCS transactions).
    // Re-running DigiLocker lets the customer consent to PAN so PANCR is pulled.
    const needsDigilockerRerunForPan =
        aadhaarTileStatus === 'verified' && !panFromDigilocker && !panVerified;
    const digilockerAccessUrl =
        data?.digilockerAccessUrl ||
        kycDetails?.digilocker_access_url ||
        parsedVerificationResponse?.accessUrl ||
        null;
    const digilockerStoredDocs = Array.isArray(parsedVerificationResponse?.storedDocs)
        ? parsedVerificationResponse.storedDocs
        : [];
    const esignStatus = data?.application?.esign_status;
    const esignAppId = loanApp?.id || data?.application?.id || applicationId;
    const esignRequestId = data?.application?.esign_request_id || null;
    const esignSigningUrl = buildDigitapEsignStandaloneUrl(esignRequestId);
    const esignComplete = isEsignCompleteForApp(esignStatus, data?.esignDocs || [], esignAppId);
    const esignAwaitingCustomer = !esignComplete && ['sent', 'initiated'].includes(String(esignStatus || '').toLowerCase());
    // Backend rejects e-sign unless the application reached esign_pending (video verified).
    const applicationStatus = String(
        loanApp?.application_status || data?.application?.application_status || ''
    ).toLowerCase();
    const canSendToSign = esignComplete || esignAwaitingCustomer || applicationStatus === 'esign_pending';
    const canSetupMandate =
        esignComplete &&
        Boolean(loanApp?.autoDebitEnabled) &&
        bankTileStatus === 'success';
    const customerDisplayName =
        kycDetails?.aadhaar_name || userData?.profile?.full_name || userData?.full_name || null;
    const selfieData = data?.selfie || {};
    const mandateStatus = mandateRegistration?.status;
    const mandateAuthLink =
        mandateRegistration?.authorization_url ||
        mandateRegistration?.authLink ||
        null;
    const mandateLastError = mandateRegistration?.last_error || null;
    const mandateNeedsReregister = Boolean(
        mandateRegistration?.needs_reregister || (mandateLastError && !mandateAuthLink)
    );
    const hasExistingMandateAttempt = Boolean(
        mandateAuthLink ||
        mandateRegistration?.txnid ||
        mandateRegistration?.mandate_id ||
        mandateRegistration?.access_key ||
        ['initiated', 'pending', 'in_progress', 'failed'].includes(
            String(mandateStatus || '').toLowerCase()
        )
    );
    // Allow re-initiate for failed OR timed-out prior links (do not block only on autoDebitEnabled)
    const canReregisterMandate =
        mandateNeedsReregister || Boolean(mandateLastError) || hasExistingMandateAttempt;
    const mandateSuccess = ['success', 'registered', 'completed'].includes(
        String(mandateStatus || '').toLowerCase()
    );
    const canRetryMandatePrereqs = esignComplete && bankTileStatus === 'success';
    const canClickMandateRegister =
        !updating &&
        !mandateSuccess &&
        (canSetupMandate || (canReregisterMandate && canRetryMandatePrereqs));
    const mandateDisableReason = (() => {
        if (mandateSuccess) return null;
        if (canClickMandateRegister) return null;
        if (isClosed) return 'Case is closed — cannot re-register.';
        if (!esignComplete) return 'Complete step 5 (loan e-sign) before e-mandate.';
        if (bankTileStatus !== 'success') return 'Complete Step 3 bank verification before e-mandate.';
        if (!loanApp?.autoDebitEnabled && !canReregisterMandate) {
            return 'Product auto-debit is off for this loan.';
        }
        return 'e-Mandate actions are locked.';
    })();
    const mandateTileStatus = canReregisterMandate && !mandateAuthLink && (mandateNeedsReregister || mandateLastError)
        ? 'failed'
        : mandateStatus;
    const isMockMandateLink = Boolean(
        mandateAuthLink &&
        (String(mandateAuthLink).includes('mock-access-') ||
            String(mandateAuthLink).includes('mandate-mock') ||
            String(mandateAuthLink).includes('MOCKENA') ||
            String(mandateAuthLink).includes('mock.local') ||
            String(mandateRegistration?.mandate_id || '').startsWith('MOCK') ||
            String(mandateRegistration?.nach_txn_id || '').startsWith('MOCK'))
    );
    const aadhaarPhotoSrc = getOptimizedUrl(pickKycPhotoDisplayUrl(kycDetails), { width: 480 });
    const selfiePhotoSrc = getOptimizedUrl(pickSelfieDisplayUrl({ selfie: selfieData }), { width: 480 });

    const isKycVerified = overallKycStatus === 'verified';
    const hasAadhaarPhoto = Boolean(aadhaarPhotoSrc);
    const hasSelfie = Boolean(selfiePhotoSrc);
    const canRunSelfieChecks = isKycVerified && hasAadhaarPhoto && hasSelfie;

    const selfieVerificationStatus = (() => {
        if (!hasSelfie || !isKycVerified) {
            return 'not_started';
        }

        if (selfieData?.face_match_status === 'matched' && Number(selfieData?.liveness_check) === 1) {
            return 'verified';
        }

        const statusText = (selfieData?.face_match_status || '').toString().toLowerCase();
        const wfStatusText = (selfieData?.wf_status || '').toString().toLowerCase();
        if (['failed', 'not_matched'].includes(statusText)) {
            return 'failed';
        }

        if (selfieData?.liveness_check === 0 && ['failed', 'blocked'].includes(wfStatusText)) {
            return 'failed';
        }

        return 'pending';
    })();
    const adminRole = String(admin?.role_code || admin?.role || '').toLowerCase();
    /** Credit Manager and Operations can run post-offer e-sign + e-mandate. */
    const canRunPostOfferDigio = ['operations', 'operations_manager', 'credit_manager', 'underwriter', 'super_admin', 'admin'].includes(adminRole);
    const isOpsStaff = canRunPostOfferDigio;
    const employmentStatus =
        String(data?.employment?.uan_status || loanApp?.uan_status || '').toLowerCase() === 'success'
            ? 'success'
            : 'pending';

    const kycSteps = useMemo(() => {
        const base = [
            { id: 'ekyc', icon: Fingerprint, label: 'Aadhaar', status: aadhaarTileStatus },
            { id: 'pan', icon: CreditCard, label: 'PAN', status: panVerified ? 'success' : 'pending' },
            { id: 'bank', icon: Landmark, label: 'Bank', status: bankTileStatus },
            { id: 'face', icon: ScanFace, label: 'Selfie', status: selfieVerificationStatus === 'verified' ? 'success' : 'pending' },
        ];
        if (isOpsStaff) {
            base.push(
                { id: 'esign', icon: FileText, label: 'Sign', status: esignComplete ? 'completed' : esignStatus },
                {
                    id: 'mandate',
                    icon: Zap,
                    label: 'eMandate',
                    status: esignComplete && ['registered', 'success', 'completed'].includes(String(mandateStatus || '').toLowerCase())
                        ? 'registered'
                        : 'pending',
                }
            );
        }
        base.push({ id: 'employment', icon: Briefcase, label: 'Employment', status: employmentStatus });
        return base;
    }, [
        aadhaarTileStatus,
        panVerified,
        bankTileStatus,
        selfieVerificationStatus,
        isOpsStaff,
        esignComplete,
        esignStatus,
        mandateStatus,
        employmentStatus,
    ]);

    const firstIncompleteId = useMemo(() => {
        const incomplete = kycSteps.find((s) => !isStepDone(s.status));
        return incomplete?.id || kycSteps[0]?.id || 'ekyc';
    }, [kycSteps]);

    const [activeKycStep, setActiveKycStep] = useState(firstIncompleteId);

    useEffect(() => {
        if (!kycSteps.some((s) => s.id === activeKycStep)) {
            setActiveKycStep(firstIncompleteId);
        }
    }, [kycSteps, activeKycStep, firstIncompleteId]);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                {customerDisplayName ? (
                    <p className="text-sm font-semibold text-slate-900 truncate">
                        {customerDisplayName}
                    </p>
                ) : (
                    <span className="text-sm text-slate-500">KYC</span>
                )}
                <Button
                    onClick={() => handleAction(refreshKycSections, 'refresh')}
                    disabled={runningAction === 'refresh'}
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs font-medium"
                >
                    <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', runningAction === 'refresh' && 'animate-spin')} />
                    Refresh
                </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
                {kycSteps.map((step) => {
                    const done = isStepDone(step.status);
                    const active = activeKycStep === step.id;
                    const StepIcon = step.icon;
                    return (
                        <button
                            key={step.id}
                            type="button"
                            onClick={() => setActiveKycStep(step.id)}
                            className={cn(
                                'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs font-medium transition-colors',
                                active && 'bg-slate-900 text-white border-slate-900 shadow-sm',
                                !active && done && 'bg-emerald-50 text-emerald-800 border-emerald-200',
                                !active && !done && 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                            )}
                        >
                            <StepIcon className="w-3.5 h-3.5 shrink-0" />
                            {step.label}
                        </button>
                    );
                })}
            </div>

            {(!lastAction || lastAction === 'refresh') && error && (
                <Alert variant="destructive" className="rounded-lg border-rose-100 bg-rose-50 text-rose-800 py-2.5">
                    <AlertDescription className="text-xs font-medium m-0 flex items-center gap-2">
                        <XCircle className="w-4 h-4 shrink-0" /> {error}
                    </AlertDescription>
                </Alert>
            )}
            {(!lastAction || lastAction === 'refresh') && message && (
                <Alert className="rounded-lg border-emerald-100 bg-emerald-50 text-emerald-800 py-2.5">
                    <AlertDescription className="text-xs font-medium m-0 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" /> {message}
                    </AlertDescription>
                </Alert>
            )}

            <div>
                {activeKycStep === 'ekyc' && (
                    <AadhaarTile
                        aadhaarTileStatus={aadhaarTileStatus}
                        isKycVerified={isKycVerified}
                        digilockerAccessUrl={digilockerAccessUrl}
                        needsDigilockerRerunForPan={needsDigilockerRerunForPan}
                        digilockerStoredDocs={digilockerStoredDocs}
                        kycDetails={kycDetails}
                        parsedVerificationResponse={parsedVerificationResponse}
                        parsedAddress={parsedAddress}
                        lastAction={lastAction}
                        error={error}
                        message={message}
                        isReadOnly={isReadOnly}
                        updating={updating}
                        runningAction={runningAction}
                        handleAction={handleAction}
                        handleInitiateDigioKYC={handleInitiateDigioKYC}
                    />
                )}

                {activeKycStep === 'pan' && (
                    <PanTile
                        panFromDigilocker={panFromDigilocker}
                        panVerified={panVerified}
                        isKycVerified={isKycVerified}
                        customerDisplayName={customerDisplayName}
                        userData={userData}
                        lastAction={lastAction}
                        error={error}
                        message={message}
                        isReadOnly={isReadOnly}
                        updating={updating}
                        runningAction={runningAction}
                        panInput={panInput}
                        setPanInput={setPanInput}
                        panEditMode={panEditMode}
                        setPanEditMode={setPanEditMode}
                        showManualPanForm={showManualPanForm}
                        setShowManualPanForm={setShowManualPanForm}
                        manualPanRemark={manualPanRemark}
                        setManualPanRemark={setManualPanRemark}
                        handleAction={handleAction}
                        handleManualVerifyPan={handleManualVerifyPan}
                    />
                )}

                {activeKycStep === 'bank' && (
                    <BankTile
                        bankTileStatus={bankTileStatus}
                        bankDetails={bankDetails}
                        customerDisplayName={customerDisplayName}
                        bankFailureHint={bankFailureHint}
                        pennyDropStatus={pennyDropStatus}
                        lastAction={lastAction}
                        error={error}
                        message={message}
                        isReadOnly={isReadOnly}
                        canAdminEditBank={isReadOnly && canEditLoanBank(admin, loanApp)}
                        updating={updating}
                        runningAction={runningAction}
                        bankEditMode={bankEditMode}
                        setBankEditMode={setBankEditMode}
                        bankIfscInput={bankIfscInput}
                        setBankIfscInput={setBankIfscInput}
                        bankAccountInput={bankAccountInput}
                        setBankAccountInput={setBankAccountInput}
                        showManualBankForm={showManualBankForm}
                        setShowManualBankForm={setShowManualBankForm}
                        manualBankRemark={manualBankRemark}
                        setManualBankRemark={setManualBankRemark}
                        handleAction={handleAction}
                        handleVerifyBankDetails={handleVerifyBankDetails}
                        handleManualVerifyBank={handleManualVerifyBank}
                        handleUpdateDisbursalBankDetails={handleUpdateDisbursalBankDetails}
                    />
                )}

                {activeKycStep === 'face' && (
                    <SelfieTile
                        selfieVerificationStatus={selfieVerificationStatus}
                        selfieData={selfieData}
                        selfieCheckFeedback={selfieCheckFeedback}
                        lastAction={lastAction}
                        error={error}
                        message={message}
                        isReadOnly={isReadOnly}
                        updating={updating}
                        runningAction={runningAction}
                        canRunSelfieChecks={canRunSelfieChecks}
                        aadhaarPhotoSrc={aadhaarPhotoSrc}
                        selfiePhotoSrc={selfiePhotoSrc}
                        handleAction={handleAction}
                        handleFaceMatch={handleFaceMatch}
                        handleLivenessCheck={handleLivenessCheck}
                        handleSendSelfieRetakeLink={handleSendSelfieRetakeLink}
                    />
                )}

                {activeKycStep === 'esign' && isOpsStaff && (
                    <EsignTile
                        esignComplete={esignComplete}
                        esignAwaitingCustomer={esignAwaitingCustomer}
                        isEsignProcessing={isEsignProcessing}
                        esignStatus={esignStatus}
                        esignSigningUrl={esignSigningUrl}
                        customerDisplayName={customerDisplayName}
                        data={data}
                        lastAction={lastAction}
                        error={error}
                        message={message}
                        isReadOnly={isReadOnly}
                        updating={updating}
                        runningAction={runningAction}
                        uploading={uploading}
                        uploadingType={uploadingType}
                        canSendToSign={canSendToSign}
                        downloadingUnsigned={downloadingUnsigned}
                        signedAgreementInputRef={signedAgreementInputRef}
                        handleAction={handleAction}
                        handleInitiateEsign={handleInitiateEsign}
                        handleCheckEsignStatus={handleCheckEsignStatus}
                        handleDownloadUnsignedAgreement={handleDownloadUnsignedAgreement}
                        handleUploadSignedAgreementFile={handleUploadSignedAgreementFile}
                    />
                )}

                {activeKycStep === 'mandate' && isOpsStaff && (
                    <MandateTile
                        mandateTileStatus={mandateTileStatus}
                        mandateSuccess={mandateSuccess}
                        mandateAuthLink={mandateAuthLink}
                        isMockMandateLink={isMockMandateLink}
                        mandateRegistration={mandateRegistration}
                        mandateAuthMode={mandateAuthMode}
                        setMandateAuthMode={setMandateAuthMode}
                        esignComplete={esignComplete}
                        bankTileStatus={bankTileStatus}
                        canClickMandateRegister={canClickMandateRegister}
                        canReregisterMandate={canReregisterMandate}
                        hasExistingMandateAttempt={hasExistingMandateAttempt}
                        mandateDisableReason={mandateDisableReason}
                        mandateLastError={mandateLastError}
                        lastAction={lastAction}
                        error={error}
                        message={message}
                        isClosed={isClosed}
                        applicationStatus={applicationStatus}
                        updating={updating}
                        runningAction={runningAction}
                        showManualMandateForm={showManualMandateForm}
                        setShowManualMandateForm={setShowManualMandateForm}
                        manualMandateRemark={manualMandateRemark}
                        setManualMandateRemark={setManualMandateRemark}
                        handleAction={handleAction}
                        handleInitiateMandate={handleInitiateMandate}
                        handleManualVerifyMandate={handleManualVerifyMandate}
                        handleResendMandateAuthLink={handleResendMandateAuthLink}
                        setLastAction={setLastAction}
                    />
                )}

                {activeKycStep === 'employment' && (
                    <EmploymentTile
                        data={data}
                        loanApp={loanApp}
                        userData={userData}
                        uanInput={uanInput}
                        setUanInput={setUanInput}
                        lastAction={lastAction}
                        error={error}
                        message={message}
                        isReadOnly={isReadOnly}
                        updating={updating}
                        runningAction={runningAction}
                        handleAction={handleAction}
                        handleVerifyEmployment={handleVerifyEmployment}
                    />
                )}
            </div>
        </div>
    );
}
