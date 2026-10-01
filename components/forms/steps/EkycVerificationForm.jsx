import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Fingerprint, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import { loanAPI, authAPI, adminAPI, documentsAPI, kycAPI } from '@/lib/api';
import VerificationCorrectionAlert from '@/components/verification/VerificationCorrectionAlert';
import { handleFormError } from '@/lib/utils/formErrors';
import StepLayout from './StepLayout';

import {
  SLOT_KEYS,
  REQUIRED_SLOTS,
  SLOT_TYPES,
  EMPTY_SLOT,
  createEmptySlots,
} from './ekyc/slotHelpers';
import { useSlotUploads } from './ekyc/useSlotUploads';
import DigiLockerPanel from './ekyc/DigiLockerPanel';
import DocumentBackupSection from './ekyc/DocumentBackupSection';

export default function EkycVerificationForm({ onSuccess, onClose, reapplicationData, isAdminMode = false, targetUserId = null, applicationId, applicationData = null }) {
  const [aadhaar, setAadhaar] = useState('');
  const [aadhaarFrozen, setAadhaarFrozen] = useState(false);
  const [pan, setPan] = useState('');
  const [panFrozen, setPanFrozen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [otherDocType, setOtherDocType] = useState('electricity_bill');

  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [workflowDetails, setWorkflowDetails] = useState({});
  const [digioLoading, setDigioLoading] = useState(false);
  const [digilockerStatus, setDigilockerStatus] = useState(null); // not_started | initiated | verified | failed | ...
  const [showDocBackup, setShowDocBackup] = useState(false);
  /** From Dashboard DigiLocker return: fail | success */
  const [digilockerOutcomeHint, setDigilockerOutcomeHint] = useState(null);

  const {
    slots,
    setSlots,
    slotsRef,
    maxDocMb,
    handleFileChange,
    handleRemove,
    handleRetry,
    waitForPendingUploads,
    uploadingCount,
    requiredReady,
    hasUploadError,
  } = useSlotUploads({ isAdminMode, targetUserId, setError });

  useEffect(() => {
    let cancelled = false;

    const normalizePan = (value) => String(value || '').trim().toUpperCase();
    const pickPan = (...candidates) => {
      for (const candidate of candidates) {
        const panVal = normalizePan(candidate);
        if (panVal) return panVal;
      }
      return '';
    };
    const applyPan = (value) => {
      const panVal = normalizePan(value);
      if (!panVal || cancelled) return false;
      setPan(panVal);
      setPanFrozen(true);
      return true;
    };

    const fetchUserData = async () => {
      let panResolved = false;

      if (applicationData) {
        const kyc = applicationData.kyc_details || applicationData.kyc;
        const profile = applicationData.profile;
        const previousProfile =
          applicationData.reapplicationData?.previousProfile ||
          reapplicationData?.previousProfile ||
          null;

        let docs = applicationData.residenceProofs || [];
        if (docs.length === 0) {
          docs = applicationData.reapplicationData?.previousResidenceProofs || reapplicationData?.previousResidenceProofs || [];
        }

        if (kyc) {
          if (kyc.wf_status) {
            setWorkflowStatus(kyc.wf_status);
            setWorkflowDetails({
              reasonCode: kyc.wf_reason_code,
              customerMessage: kyc.wf_customer_message,
              retryCount: kyc.wf_retry_count || 0,
              maxRetry: kyc.wf_max_retry || 3,
              editableFields: kyc.wf_editable_fields || [],
            });
          }

          const isAadhaarEditable = kyc.wf_status === 'RETRY_ALLOWED' && kyc.wf_editable_fields?.includes('aadhaar');

          if (kyc.aadhaar_number) {
            setAadhaar(kyc.aadhaar_number);
            setAadhaarFrozen(!isAadhaarEditable);
          } else if (kyc.aadhaar_number_masked) {
            setAadhaar(kyc.aadhaar_number_masked);
            setAadhaarFrozen(!isAadhaarEditable);
          }
        }

        // Dashboard often opens this step before profile refresh; do not treat
        // a truthy applicationData shell as "PAN already loaded".
        panResolved = applyPan(
          pickPan(
            kyc?.pan_card_number,
            profile?.pancard,
            profile?.pan_card,
            previousProfile?.pancard,
            previousProfile?.pan_card
          )
        );

        if (docs.length > 0) {
          const nextSlots = createEmptySlots();
          const findDoc = (type, indexFallback) => {
            let doc = docs.find((d) => d.document_type === type);
            if (!doc && !docs[indexFallback]?.document_type) {
              doc = docs[indexFallback];
            }
            return doc;
          };

          const applyExisting = (field, doc) => {
            if (!doc) return;
            const url = doc.document_url;
            const isPdf = String(doc.file_format || url || '').toLowerCase().includes('pdf');
            nextSlots[field] = {
              ...EMPTY_SLOT,
              preview: isPdf ? 'pdf' : url,
              previewKind: isPdf ? 'pdf' : 'remote',
              status: 'uploaded',
              progress: 100,
              existing: doc,
              result: {
                url: doc.document_url || null,
                publicId: doc.cloudinary_public_id || null,
                fileFormat: doc.file_format || null,
              },
            };
          };

          applyExisting('aadhaarFront', findDoc('aadhaar_front', 0));
          applyExisting('aadhaarBack', findDoc('aadhaar_back', 1));
          applyExisting('panFile', findDoc('pan_front', 2));

          const otherDoc =
            docs.find((d) =>
              ['electricity_bill', 'gas_bill', 'water_bill', 'rent_agreement', 'property_tax', 'utility_bill', 'voter_id', 'driving_license'].includes(d.document_type)
            ) ||
            docs.find((d) => !['aadhaar_front', 'aadhaar_back', 'pan_front'].includes(d.document_type)) ||
            docs[3];

          if (otherDoc) {
            applyExisting('otherFile', otherDoc);
            setOtherDocType(otherDoc.document_type || 'electricity_bill');
          }

          setSlots(nextSlots);
        }

        if (panResolved) return;
      }

      try {
        const response = isAdminMode && targetUserId
          ? await adminAPI.getUserDetails(targetUserId)
          : await authAPI.getCurrentUser();

        if (cancelled || response.status !== 1) return;

        const profile = response.data?.profile || response.data?.user?.profile || (isAdminMode ? response.data.application : null);
        applyPan(pickPan(profile?.pancard, profile?.pan_card));

        const kyc = response.data?.kyc;
        if (kyc) {
          if (kyc.wf_status) {
            setWorkflowStatus(kyc.wf_status);
            setWorkflowDetails({
              reasonCode: kyc.wf_reason_code,
              customerMessage: kyc.wf_customer_message,
              retryCount: kyc.wf_retry_count || 0,
              maxRetry: kyc.wf_max_retry || 3,
              editableFields: kyc.wf_editable_fields || [],
            });
          }

          const isAadhaarEditable = kyc.wf_status === 'RETRY_ALLOWED' && kyc.wf_editable_fields?.includes('aadhaar');
          if (kyc.aadhaar_number_masked) {
            setAadhaar(kyc.aadhaar_number_masked);
            setAadhaarFrozen(!isAadhaarEditable);
          }
        }
      } catch (err) {
        console.error('Failed to fetch user data for pre-fill:', err);
      }
    };

    fetchUserData();
    return () => {
      cancelled = true;
    };
  }, [
    reapplicationData,
    isAdminMode,
    targetUserId,
    applicationData,
    applicationData?.profile?.pancard,
    applicationData?.profile?.pan_card,
    applicationData?.kyc?.pan_card_number,
    setSlots,
  ]);

  useEffect(() => {
    if (isAdminMode) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await kycAPI.getKYCStatus();
        if (cancelled || res.status !== 1) return;
        const status = res.data?.status || 'not_started';
        setDigilockerStatus(status);
        if (applicationData?.kyc_details?.verification_status || applicationData?.kyc?.verification_status) {
          const fromApp =
            applicationData?.kyc_details?.verification_status ||
            applicationData?.kyc?.verification_status;
          if (fromApp) setDigilockerStatus(String(fromApp).toLowerCase());
        }
        if (status === 'verified') {
          setSuccess('Aadhaar eKYC is verified via DigiLocker. Upload Aadhaar and PAN photos to finish this step.');
          setShowDocBackup(true);
        }
        if (status === 'failed') {
          setShowDocBackup(true);
          setDigilockerOutcomeHint((prev) => prev || 'fail');
        }
      } catch {
        /* ignore — CTA still available */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdminMode, applicationData?.kyc_details?.verification_status, applicationData?.kyc?.verification_status]);

  // DigiLocker return from Dashboard: auto-open document upload
  useEffect(() => {
    if (isAdminMode) return;
    try {
      const flag = sessionStorage.getItem('ekyc_doc_upload');
      if (!flag) return;
      sessionStorage.removeItem('ekyc_doc_upload');
      setShowDocBackup(true);
      if (flag === 'success') {
        setDigilockerOutcomeHint('success');
        setSuccess((prev) => prev || 'DigiLocker verified. Upload Aadhaar (front & back) and PAN to finish.');
      } else {
        setDigilockerOutcomeHint('fail');
      }
    } catch {
      /* ignore */
    }
  }, [isAdminMode]);

  useEffect(() => {
    const st = String(digilockerStatus || '').toLowerCase();
    if (st === 'verified' || st === 'failed') {
      setShowDocBackup(true);
    }
  }, [digilockerStatus]);

  const handleCustomerStartEkyc = async () => {
    setDigioLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await kycAPI.customerInitiateDigilocker(applicationId);
      if (response.status !== 1) {
        setError(response.message || 'Failed to start eKYC');
        return;
      }
      const payload = response.data || {};
      if (payload.alreadyVerified) {
        setDigilockerStatus('verified');
        setSuccess(payload.message || 'eKYC already completed.');
        onSuccess && onSuccess();
        return;
      }
      const url = payload.accessUrl || payload.kycUrl;
      if (!url) {
        setError('DigiLocker link was not returned. Please try again or contact support.');
        return;
      }
      setDigilockerStatus('initiated');
      setSuccess('Opening DigiLocker… Complete Aadhaar and PAN consent, then you will return here.');
      window.location.assign(url);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to start eKYC');
    } finally {
      setDigioLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setFieldErrors({});

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const digilockerOk = String(digilockerStatus || '').toLowerCase() === 'verified';

    if (!digilockerOk) {
      if (!aadhaarFrozen && aadhaar.length !== 12) {
        setFieldErrors({ aadhaar: 'Aadhaar number must be exactly 12 digits' });
        setError('Please enter your 12-digit Aadhaar number above to complete verification.');
        const el = document.getElementById('aadhaarInput');
        if (el) el.focus();
        return;
      }
      if (!panRegex.test(pan)) {
        setFieldErrors({ pan: 'Invalid PAN format (e.g., ABCDE1234F)' });
        setError('Please enter a valid 10-character PAN card number.');
        const el = document.getElementById('panInput');
        if (el) el.focus();
        return;
      }
    } else if (pan && !panRegex.test(pan)) {
      setFieldErrors({ pan: 'Invalid PAN format (e.g., ABCDE1234F)' });
      return;
    }

    if (uploadingCount > 0) {
      setError('Please wait for all documents to finish uploading.');
      return;
    }

    if (hasUploadError) {
      setError('One or more documents failed to upload. Please tap Retry on the failed document.');
      return;
    }

    const latest = slotsRef.current;
    const missingRequired = REQUIRED_SLOTS.filter((key) => latest[key].status !== 'uploaded');
    if (missingRequired.length > 0) {
      setError('Please upload Aadhaar Front, Aadhaar Back, and PAN Card photos before submitting.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await waitForPendingUploads();
      const currentLatest = slotsRef.current;

      const failed = SLOT_KEYS.filter((key) => currentLatest[key].status === 'error');
      if (failed.length > 0) {
        throw new Error(currentLatest[failed[0]].error || 'One or more documents failed to upload.');
      }

      const stillMissing = REQUIRED_SLOTS.filter((key) => currentLatest[key].status !== 'uploaded');
      if (stillMissing.length > 0) {
        throw new Error('Please upload Aadhaar front, Aadhaar back, and PAN card.');
      }

      const newUploads = SLOT_KEYS
        .filter((key) => currentLatest[key].isNew && currentLatest[key].result?.url)
        .map((key) => ({
          doc: currentLatest[key].result,
          type: key === 'otherFile' ? otherDocType : SLOT_TYPES[key],
        }));

      if (newUploads.length > 0) {
        await documentsAPI.saveResidenceProof(
          {
            documents: newUploads.map((item) => item.doc),
            documentTypes: newUploads.map((item) => item.type),
            loanApplicationId: applicationId || onSuccess?.applicationId,
          },
          isAdminMode ? targetUserId : null
        );
      }

      const stepResponse = await loanAPI.completeStep({
        stepName: 'ekyc',
        applicationId: applicationId || onSuccess?.applicationId,
        targetUserId,
        data: { aadhaar, pan, targetUserId, digilockerVerified: digilockerOk },
      });

      setSuccess('eKYC & Documents Verification Successful!');
      onSuccess && onSuccess(stepResponse?.data);
    } catch (err) {
      console.error('Submission error:', err);
      handleFormError(err, setFieldErrors, setError);
    } finally {
      setLoading(false);
    }
  };

  const digilockerVerified = String(digilockerStatus || '').toLowerCase() === 'verified';
  const digilockerFailed =
    String(digilockerStatus || '').toLowerCase() === 'failed' || digilockerOutcomeHint === 'fail';
  const digilockerInProgress = ['initiated', 'pending', 'in_progress'].includes(
    String(digilockerStatus || '').toLowerCase()
  );
  const forceDocUpload = digilockerVerified || digilockerFailed || digilockerOutcomeHint === 'success';
  const docsOpen = isAdminMode || showDocBackup || forceDocUpload;
  const isFormIncomplete = digilockerVerified
    ? !requiredReady || hasUploadError || uploadingCount > 0 || (pan.length > 0 && pan.length !== 10)
    : (!aadhaarFrozen && aadhaar.length !== 12) || pan.length !== 10 || !requiredReady || hasUploadError || uploadingCount > 0;

  const incompleteReason = (() => {
    if (uploadingCount > 0) return `Uploading document (${uploadingCount} in progress)...`;
    if (hasUploadError) return 'One or more documents failed to upload. Tap Retry on the document.';
    if (!digilockerVerified && !aadhaarFrozen && aadhaar.length !== 12) {
      return aadhaar.length === 0
        ? 'Please enter your 12-digit Aadhaar number above'
        : `Aadhaar number needs 12 digits (currently ${aadhaar.length})`;
    }
    if (pan.length > 0 && pan.length !== 10) return 'PAN card number must be 10 characters';
    if (!pan && !digilockerVerified) return 'Please enter your 10-character PAN card number';
    if (!requiredReady) return 'Please upload Aadhaar Front, Aadhaar Back, and PAN Card below';
    return null;
  })();

  const footerLabel = loading
    ? 'Saving...'
    : uploadingCount > 0
      ? `Uploading ${uploadingCount} of ${SLOT_KEYS.filter((key) => slots[key].file || slots[key].status === 'uploaded').length || uploadingCount}`
      : 'COMPLETE VERIFICATION';

  // DigiLocker-only footer only when docs are not open
  const customerPrimaryFooter = !isAdminMode && !docsOpen;

  return (
    <StepLayout
      title="eKYC Verification"
      description="Verify your identity and address instantly."
      onClose={onClose}
      icon={Fingerprint}
      footer={
        customerPrimaryFooter ? (
          <Button
            onClick={handleCustomerStartEkyc}
            disabled={digioLoading}
            className="w-full h-12 text-sm font-black bg-zinc-950 hover:bg-black text-white shadow-xl shadow-zinc-100 rounded-lg transition-all active:scale-[0.98]"
          >
            {digioLoading ? <Spinner className="w-5 h-5 text-white mr-2" /> : null}
            {digioLoading
              ? 'Starting…'
              : digilockerInProgress
                ? 'Continue DigiLocker'
                : 'Start eKYC'}
            {!digioLoading && <ArrowRight className="ml-2 w-4 h-4" />}
          </Button>
        ) : (
          <div className="space-y-2 w-full">
            {incompleteReason && (
              <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg py-1.5 px-3 text-center flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>{incompleteReason}</span>
              </p>
            )}
            <Button
              onClick={handleSubmit}
              disabled={loading || uploadingCount > 0}
              className={`w-full h-12 text-sm font-black text-white shadow-xl rounded-lg transition-all active:scale-[0.98] ${
                isFormIncomplete
                  ? 'bg-zinc-700 hover:bg-zinc-800'
                  : 'bg-zinc-950 hover:bg-black shadow-zinc-200'
              }`}
            >
              {(loading || uploadingCount > 0) ? <Spinner className="w-5 h-5 text-white mr-2" /> : null}
              {footerLabel}
              {!loading && uploadingCount === 0 && <ArrowRight className="ml-2 w-4 h-4" />}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        <DigiLockerPanel
          isAdminMode={isAdminMode}
          applicationId={applicationId}
          digilockerVerified={digilockerVerified}
          digilockerFailed={digilockerFailed}
          digilockerInProgress={digilockerInProgress}
          digioLoading={digioLoading}
          setDigioLoading={setDigioLoading}
          setError={setError}
          setSuccess={setSuccess}
          handleCustomerStartEkyc={handleCustomerStartEkyc}
          onAlreadyVerified={() => onSuccess && onSuccess()}
          alerts={
            <>
              {error && (
                <Alert variant="destructive" className="py-2 rounded-lg border-red-100 bg-red-50/30">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  <AlertDescription className="text-[10px] font-bold text-red-800 ml-1.5">{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert variant="success" className="py-2 rounded-lg bg-green-50/50 border-green-100 text-green-800">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <AlertDescription className="text-[10px] font-bold ml-1.5">{success}</AlertDescription>
                </Alert>
              )}
            </>
          }
        />

        <VerificationCorrectionAlert
          status={workflowStatus}
          reasonCode={workflowDetails.reasonCode}
          customerMessage={workflowDetails.customerMessage}
          retryCount={workflowDetails.retryCount}
          maxRetry={workflowDetails.maxRetry}
          onRetry={null}
          customActionLabel="Re-submit Documents"
        />

        {!isAdminMode && !forceDocUpload && (
          <button
            type="button"
            className="text-[10px] font-bold text-slate-500 underline underline-offset-2 hover:text-zinc-900"
            onClick={() => setShowDocBackup((v) => !v)}
          >
            {showDocBackup ? 'Hide document upload backup' : 'Upload documents instead (optional backup)'}
          </button>
        )}

        {!isAdminMode && docsOpen && !digilockerFailed && !digilockerVerified && (
          <button
            type="button"
            className="text-[10px] font-bold text-slate-500 underline underline-offset-2 hover:text-zinc-900"
            disabled={digioLoading}
            onClick={handleCustomerStartEkyc}
          >
            {digioLoading ? 'Starting DigiLocker…' : digilockerInProgress ? 'Continue DigiLocker instead' : 'Start DigiLocker instead'}
          </button>
        )}

        {docsOpen && (
          <DocumentBackupSection
            aadhaar={aadhaar}
            setAadhaar={setAadhaar}
            aadhaarFrozen={aadhaarFrozen}
            pan={pan}
            setPan={setPan}
            panFrozen={panFrozen}
            fieldErrors={fieldErrors}
            setFieldErrors={setFieldErrors}
            maxDocMb={maxDocMb}
            slots={slots}
            otherDocType={otherDocType}
            setOtherDocType={setOtherDocType}
            handleFileChange={handleFileChange}
            handleRemove={handleRemove}
            handleRetry={handleRetry}
          />
        )}
      </div>
    </StepLayout>
  );
}
