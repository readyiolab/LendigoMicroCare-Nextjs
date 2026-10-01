import { useEffect, useRef } from "react";
import { kycAPI } from "@/lib/api/kyc";
import { documentsAPI } from "@/lib/api/documents";

const AA_HARD_FAIL_STATUSES = new Set(['denied', 'failed', 'timeout', 'expired', 'rejected']);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAaBankPersisted(data) {
  if (!data) return false;
  return Boolean(
    data.bankPersisted ||
      data.status === 'aa_received' ||
      (data.bankStatement &&
        (data.bankStatement.status === 'aa_received' ||
          (data.bankStatement.fetch_type === 'aa_fetch' &&
            String(data.bankStatement.analysis_status || '').toLowerCase() ===
              'completed')))
  );
}

function isAaHardFail(data) {
  const st = String(data?.status || '').toLowerCase();
  return AA_HARD_FAIL_STATUSES.has(st);
}

export function useDashboardReturnUrls({
  setSuccessMessage,
  fetchData,
  setActiveStep,
  hasAutoResumed,
  setSearchParams,
  searchParams,
  applicationSteps,
  getApplicationId,
}) {
  const aaReturnHandled = useRef(false);
  const kycReturnHandled = useRef(false);
  const esignReturnHandled = useRef(false);

  // Digitap AA return_url — do not trust aa_status alone (often false before report is ready)
  useEffect(() => {
    if (aaReturnHandled.current) return;
    const aaTxn = searchParams.get('aa_txn');
    const aaStatus = searchParams.get('aa_status');
    if (!aaTxn && aaStatus === null) return;

    aaReturnHandled.current = true;

    try {
      sessionStorage.setItem('aa_return', '1');
    } catch {
      /* ignore */
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('aa_txn');
    nextParams.delete('aa_status');
    setSearchParams(nextParams, { replace: true });

    const openBankStep = () => {
      const bankStep = applicationSteps?.find((s) => s.id === 'bank_statement');
      if (bankStep) {
        setActiveStep(bankStep);
        hasAutoResumed.current = true;
      } else {
        hasAutoResumed.current = true;
      }
    };

    hasAutoResumed.current = true;
    // Instant UX: open bank step as salary-slip step; do not wait on AA poll
    openBankStep();
    setSuccessMessage('Bank connected. Please upload your salary slip.');

    (async () => {
      // Refresh data in background; form already shows salary slip via aa_return flag
      await fetchData(true);
      openBankStep();

      let appId = typeof getApplicationId === 'function' ? getApplicationId() : null;
      for (let i = 0; i < 12 && !appId; i += 1) {
        await sleep(250);
        appId = typeof getApplicationId === 'function' ? getApplicationId() : null;
      }

      if (!appId) {
        setTimeout(() => setSuccessMessage(''), 8000);
        return;
      }

      let hardFail = false;
      let sawAccepted = false;
      for (let i = 0; i < 8; i += 1) {
        try {
          const res = await documentsAPI.getAaStatus({ applicationId: appId });
          const data = res?.data || res;
          if (isAaHardFail(data)) {
            hardFail = true;
            break;
          }
          if (isAaBankPersisted(data)) {
            setSuccessMessage('Bank connected. Please upload your salary slip.');
            await fetchData(true);
            openBankStep();
            setTimeout(() => setSuccessMessage(''), 8000);
            return;
          }
          // Non-failed status while syncing — customer can continue immediately
          const st = String(data?.status || '').toLowerCase();
          if (st && st !== 'not_initiated') {
            sawAccepted = true;
          }
        } catch {
          /* keep polling quietly */
        }
        await sleep(1500);
      }

      if (hardFail) {
        try {
          sessionStorage.removeItem('aa_return');
        } catch {
          /* ignore */
        }
        await fetchData(true);
        openBankStep();
        setSuccessMessage(
          'Bank consent was not completed. Connect bank again or upload a PDF statement.'
        );
      } else if (sawAccepted) {
        setSuccessMessage(
          'Bank connected. Bank statement is being processed in the background — you can continue.'
        );
        await fetchData(true);
        openBankStep();
      } else {
        // Keep optimistic aa_return; do not block — sync may still be catching up
        setSuccessMessage(
          'Bank connected. Bank statement is being processed in the background — you can continue.'
        );
      }

      setTimeout(() => setSuccessMessage(''), 8000);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams, applicationSteps]);

  // DigiLocker eKYC return — customer redirected here after Digitap DigiLocker
  useEffect(() => {
    if (kycReturnHandled.current) return;
    const kycParam = searchParams.get('kyc');
    if (kycParam === null) return;

    kycReturnHandled.current = true;
    const statusNorm = String(kycParam || '').toLowerCase();
    const looksSuccess = ['complete', 'success', 's', 'true', '1'].includes(statusNorm);
    const looksError = ['error', 'failed', 'fail', 'f', 'false', '0'].includes(statusNorm);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('kyc');
    setSearchParams(nextParams, { replace: true });

    const flagEkycDocUpload = (reason) => {
      try {
        sessionStorage.setItem('ekyc_doc_upload', reason);
      } catch {
        /* ignore */
      }
    };

    const openEkycStep = () => {
      const ekycStep = applicationSteps?.find((s) => s.id === 'ekyc');
      if (ekycStep) {
        setActiveStep(ekycStep);
        hasAutoResumed.current = true;
      } else {
        // Still block auto-resume from jumping to Reference while we resolve eKYC
        hasAutoResumed.current = true;
      }
    };

    // Claim resume + open eKYC immediately so Dashboard auto-resume never flashes Reference
    hasAutoResumed.current = true;
    flagEkycDocUpload(looksError ? 'fail' : looksSuccess ? 'success' : 'fail');
    openEkycStep();

    // Fire-and-forget: do not cancel when clearing ?kyc= (that would remount this effect)
    (async () => {
      if (looksError) {
        setSuccessMessage(
          'DigiLocker eKYC was not completed. Upload Aadhaar (front & back) and PAN documents to continue.'
        );
        await fetchData(true);
        flagEkycDocUpload('fail');
        openEkycStep();
        setTimeout(() => setSuccessMessage(''), 8000);
        return;
      }

      if (looksSuccess) {
        setSuccessMessage('Verification processing… confirming DigiLocker eKYC.');
      }

      const maxAttempts = 5;
      let verified = false;
      let failed = false;
      for (let i = 0; i < maxAttempts; i += 1) {
        try {
          const res = await kycAPI.getKYCStatus();
          const st = String(res?.data?.status || '').toLowerCase();
          if (st === 'verified') {
            verified = true;
            break;
          }
          if (st === 'failed') {
            failed = true;
            break;
          }
        } catch {
          /* keep polling */
        }
        if (i < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 2500));
        }
      }

      await fetchData(true);

      if (failed) {
        flagEkycDocUpload('fail');
        setSuccessMessage(
          'DigiLocker eKYC failed. Upload your Aadhaar and PAN documents to continue, or retry DigiLocker.'
        );
      } else if (verified) {
        flagEkycDocUpload('success');
        setSuccessMessage(
          'DigiLocker verified. Please upload Aadhaar (front & back) and PAN photos to finish this step.'
        );
      } else {
        // Soft fail: Digitap often returns ?kyc=complete after Processing Error while status stays initiated
        flagEkycDocUpload('fail');
        setSuccessMessage(
          'DigiLocker did not finish verification. Upload documents to continue, or retry DigiLocker from the eKYC step.'
        );
      }

      // Re-open eKYC after refresh so document upload panel sees the flag + fresh KYC data
      openEkycStep();
      setTimeout(() => setSuccessMessage(''), 8000);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams, applicationSteps]);

  // Digitap eSign return — customer redirected here after signing (or error)
  useEffect(() => {
    if (esignReturnHandled.current) return;
    const esignParam = searchParams.get('esign');
    if (esignParam === null) return;

    esignReturnHandled.current = true;
    const statusNorm = String(esignParam || '').toLowerCase();
    const looksSuccess = ['success', 'complete', 'completed', 's', 'true', '1'].includes(statusNorm);
    const looksError = ['error', 'failed', 'fail', 'f', 'false', '0'].includes(statusNorm);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('esign');
    setSearchParams(nextParams, { replace: true });

    (async () => {
      await fetchData(true);

      if (looksError) {
        setSuccessMessage('Agreement signing was not completed. Please try Sign Agreement again.');
      } else if (looksSuccess) {
        setSuccessMessage('Agreement signed successfully. Your amount will be disbursed within 15 minutes.');
      } else {
        setSuccessMessage('Returning from e-sign. Refreshing your application status…');
      }

      setTimeout(() => setSuccessMessage(''), 8000);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams]);
}
