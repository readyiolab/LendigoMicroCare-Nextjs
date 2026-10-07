import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from '@/lib/router';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import { utilityAPI, loanAPI, authAPI, adminAPI } from '@/lib/api';
import PersonalEmailVerificationDialog from '@/components/auth/PersonalEmailVerificationDialog';
import MobileVerificationDialog from '@/components/auth/MobileVerificationDialog';
import { handleFormError, processApiError, scrollToFirstError } from '@/lib/utils/formErrors';
import { isStrictEmail, validateEmail } from '@/lib/apiErrorMessage';
import VerificationCorrectionAlert from '@/components/verification/VerificationCorrectionAlert';

import StepLayout from './StepLayout';
import { useAuth } from '@/contexts/AuthContext';
import { applicationDetailPath } from '@/utils/applicationRef';

import {
  AUTH_SMS_OTP_ENABLED,
  isValidIndianMobile,
  normalizeEmploymentType,
  validateEligibilityFields,
} from './eligibility/validateEligibility';
import PersonalInfoSection from './eligibility/PersonalInfoSection';
import EmploymentSection from './eligibility/EmploymentSection';
import LocationSection from './eligibility/LocationSection';
import { useEligibilityPrefill } from './eligibility/useEligibilityPrefill';

// Cache to store pincode results for instant reuse during session
const pincodeCache = new Map();

export default function EligibilityForm({
  onSuccess,
  onClose,
  isCompleted,
  applicationId,
  reapplicationData,
  isAdminMode = false,
  targetUserId = null,
  applicationData = null
}) {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const isReturningUser = reapplicationData?.isReturningUser || false;
  const previousProfile = reapplicationData?.previousProfile || null;
  const [formData, setFormData] = useState({
    fullName: '',
    pancard: '',
    dob: '',
    gender: 'male',
    personalEmail: '',
    mobile: '',
    employmentType: 'salaried',
    companyName: '',
    companyType: '',
    currentJobJoiningDate: '',
    workExpYears: '',
    workExpMonths: '',
    nextSalaryDate: '',
    netMonthlyIncome: '',
    pincode: '',
    state: '',
    city: '',
    currentAddress: '',
  });
  const [loading, setLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');

  // Verification State
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState(null);
  const [loginMobile, setLoginMobile] = useState('');
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isMobileVerifyModalOpen, setIsMobileVerifyModalOpen] = useState(false);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailVerifyOpening, setEmailVerifyOpening] = useState(false);
  const emailCheckTimer = useRef(null);
  const emailCheckSeq = useRef(0);
  const EMAIL_TAKEN_MSG =
    'This email is already linked with another account. Please use a different email address.';

  // Workflow State for PAN Correction
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [workflowDetails, setWorkflowDetails] = useState({});

  useEligibilityPrefill({
    applicationData,
    isReturningUser,
    previousProfile,
    isAdminMode,
    targetUserId,
    applicationId,
    authUser,
    setFormData,
    setIsEmailVerified,
    setIsMobileVerified,
    setLoginMobile,
    setWorkflowStatus,
    setWorkflowDetails,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!isAdminMode) return undefined;
    const mobile = String(formData.mobile || '').replace(/\D/g, '').slice(-10);
    const pan = String(formData.pancard || '').trim().toUpperCase();
    const validPan = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
    if (mobile.length !== 10 && !validPan) {
      setExistingCustomer(null);
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await adminAPI.lookupExistingCustomer({
          ...(mobile.length === 10 ? { mobile } : {}),
          ...(validPan ? { pancard: pan } : {}),
        });
        setExistingCustomer(response.status === 1 ? response.data : null);
      } catch {
        setExistingCustomer(null);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [isAdminMode, formData.mobile, formData.pancard]);

  const resolveExcludeUserId = useCallback(() => {
    if (isAdminMode && targetUserId) return targetUserId;
    return authUser?.id || authUser?.userId || null;
  }, [isAdminMode, targetUserId, authUser]);

  const checkPersonalEmailAvailable = useCallback(
    async (email) => {
      const trimmed = String(email || '').trim().toLowerCase();
      if (!trimmed || !isStrictEmail(trimmed)) {
        return false;
      }
      if (isEmailVerified) return true;

      const seq = ++emailCheckSeq.current;
      setEmailCheckLoading(true);
      try {
        const excludeUserId = resolveExcludeUserId();
        const res = await authAPI.checkAvailability(trimmed, excludeUserId);
        const isTaken = res.status === 1 && res.data?.exists;
        if (seq === emailCheckSeq.current) {
          if (isTaken) {
            setFieldErrors((prev) => ({ ...prev, personalEmail: EMAIL_TAKEN_MSG }));
          } else {
            setFieldErrors((prev) => {
              if (prev.personalEmail === EMAIL_TAKEN_MSG) {
                return { ...prev, personalEmail: '' };
              }
              return prev;
            });
          }
        }
        return !isTaken;
      } catch (err) {
        console.error('Email availability check failed:', err);
        return true;
      } finally {
        if (seq === emailCheckSeq.current) {
          setEmailCheckLoading(false);
        }
      }
    },
    [isEmailVerified, resolveExcludeUserId]
  );

  useEffect(() => {
    if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    const email = formData.personalEmail?.trim();
    if (!email || isEmailVerified || !isStrictEmail(email)) return;

    emailCheckTimer.current = setTimeout(() => {
      checkPersonalEmailAvailable(email);
    }, 600);

    return () => {
      if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    };
  }, [formData.personalEmail, isEmailVerified, checkPersonalEmailAvailable]);

  const handleOpenEmailVerify = useCallback(() => {
    const trimmed = String(formData.personalEmail || '').trim().toLowerCase();
    const formatError = validateEmail(trimmed);
    if (formatError) {
      setFieldErrors((prev) => ({ ...prev, personalEmail: formatError }));
      return;
    }
    setEmailVerifyOpening(true);
    setIsVerifyModalOpen(true);
  }, [formData.personalEmail]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'personalEmail') {
      setIsEmailVerified((prev) => (prev ? false : prev));
    }
    if (name === 'mobile') {
      if (!AUTH_SMS_OTP_ENABLED && isValidIndianMobile(value)) {
        setIsMobileVerified(true);
      } else {
        setIsMobileVerified(false);
      }
    }

    setFieldErrors((prev) => {
      if (name === 'pancard') {
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        const nextMsg =
          value.length === 10 && !panRegex.test(value.toUpperCase())
            ? 'Invalid PAN format (e.g., ABCDE1234F)'
            : '';
        if ((prev.pancard || '') === nextMsg) return prev;
        return { ...prev, pancard: nextMsg };
      }

      if (name === 'personalEmail') {
        if (!prev.personalEmail) return prev;
        return { ...prev, personalEmail: '' };
      }

      if (!prev[name]) return prev;
      return { ...prev, [name]: '' };
    });
  }, []);

  const handleEmailBlur = useCallback(() => {
    const formatError = validateEmail(formData.personalEmail);
    if (formatError) {
      setFieldErrors((prev) => ({ ...prev, personalEmail: formatError }));
      return;
    }
    checkPersonalEmailAvailable(formData.personalEmail);
  }, [checkPersonalEmailAvailable, formData.personalEmail]);

  const handlePincodeChange = useCallback(async (value) => {
    const cleanedValue = value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, pincode: cleanedValue, state: '', city: '' }));

    setFieldErrors((prev) => {
      if (!prev.pincode) return prev;
      return { ...prev, pincode: '' };
    });

    if (cleanedValue.length === 6) {
      // Check frontend cache first
      if (pincodeCache.has(cleanedValue)) {
        const cachedData = pincodeCache.get(cleanedValue);
        setFormData(prev => ({
          ...prev,
          state: cachedData.state || '',
          city: cachedData.city || '',
        }));
        return;
      }

      setPincodeLoading(true);
      try {
        const response = await utilityAPI.getPincodeDetails(cleanedValue);
        if (response.status === 1 && response.data) {
          const data = {
            state: response.data.state || '',
            city: response.data.city || '',
          };

          // Store in cache for future use
          pincodeCache.set(cleanedValue, data);

          setFormData(prev => ({
            ...prev,
            ...data
          }));
        }
      } catch (err) {
        console.error('Failed to fetch pincode details:', err);
        // Inform user to enter manually
        setFieldErrors(prev => ({
          ...prev,
          pincode: err.message || 'Lookup failed. Please enter city and state manually.'
        }));
      } finally {
        setPincodeLoading(false);
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});
    setSuccess('');

    const validationErrors = validateEligibilityFields(formData);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError('Please fix the highlighted errors below');
      setLoading(false);
      scrollToFirstError(validationErrors);
      return;
    }

    const emailOk = await checkPersonalEmailAvailable(formData.personalEmail);
    if (!emailOk) {
      setIsEmailVerified(false);
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!isAdminMode && !isEmailVerified) {
      setFieldErrors((prev) => ({
        ...prev,
        personalEmail: 'Please verify your email address before continuing.',
      }));
      setLoading(false);
      return;
    }

    try {
      // Convert years and months to total months for backend
      const totalWorkExperienceMonths = (parseInt(formData.workExpYears || 0) * 12) + parseInt(formData.workExpMonths || 0);

      const payload = {
         ...formData,
         employmentType: normalizeEmploymentType(formData.employmentType),
         companyType: formData.companyType || undefined,
         netMonthlyIncome: parseFloat(formData.netMonthlyIncome),
         totalWorkExperienceMonths,
         applicationId
      };

      const effectiveTargetUserId = (isAdminMode && existingCustomer?.id)
        ? existingCustomer.id
        : targetUserId;

      const response = isAdminMode
        ? await loanAPI.checkEligibility({ ...payload, targetUserId: effectiveTargetUserId })
        : await loanAPI.checkEligibility(payload);

      if (response.status === 1) {
        setSuccess('Eligibility criteria met!');
        if (onSuccess) onSuccess(response.data);
      } else {
        const rejected = { message: response.message, errors: response.errors };
        handleFormError(rejected, setFieldErrors, setError);
        const emailMsg = String(
          processApiError(rejected).fieldErrors.personalEmail || response.message || ''
        ).toLowerCase();
        if (emailMsg.includes('linked with another') || emailMsg.includes('verify your email')) {
          setIsEmailVerified(false);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      const { fieldErrors: apiFieldErrors } = processApiError(err);
      handleFormError(err, setFieldErrors, setError);
      const emailMsg = String(apiFieldErrors.personalEmail || '').toLowerCase();
      if (emailMsg.includes('linked with another') || emailMsg.includes('verify your email')) {
        setIsEmailVerified(false);
      }

      // Auto scroll to first field error or general error
      setTimeout(() => {
        const firstErrorField = document.querySelector('.border-red-500');
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  if (isCompleted) {
    return (
      <StepLayout
        title="Eligibility Verified!"
        description="Your basic details have been verified successfully."
        onClose={onClose}
        icon={CheckCircle2}
      >
        <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">You're All Set!</h3>
            <p className="text-muted-foreground mb-6">Move to the next step to complete your application.</p>
            <Button variant="outline" onClick={onClose} className="rounded-lg border-gray-200">
              Go to Dashboard
            </Button>
        </div>
      </StepLayout>
    );
  }

  return (
    <StepLayout
      title="Check Eligibility"
      description="Enter basic details to verify pre-approval status."
      onClose={onClose}
      icon={CheckCircle2}
      footer={
        <Button
            onClick={handleSubmit}
            disabled={loading}
            loading={loading}
            className="w-full h-12 text-sm font-black bg-zinc-950 hover:bg-black text-white shadow-xl shadow-zinc-100 rounded-lg transition-all active:scale-[0.98]"
        >
            VERIFY ELIGIBILITY
            <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      }
    >
        {isAdminMode && existingCustomer?.customer_code && (
            existingCustomer.active_application_id && String(existingCustomer.active_application_id) !== String(applicationId) ? (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm font-bold text-amber-900">Existing Customer: {existingCustomer.customer_code}</p>
                    <p className="text-xs text-amber-800 mt-0.5">
                        {existingCustomer.full_name || 'Customer found'}
                        {existingCustomer.locked_admin_name ? ` · In progress with ${existingCustomer.locked_admin_name}` : ''}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-1">This customer already has an active application in progress.</p>
                    <Button
                        type="button"
                        size="sm"
                        className="mt-2 h-8 text-[11px] bg-amber-800 hover:bg-amber-900 text-white"
                        onClick={() => navigate(applicationDetailPath(existingCustomer.active_application_id))}
                    >
                        Open existing lead {existingCustomer.latest_lead_id || ''}
                    </Button>
                </div>
            ) : (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <p className="text-sm font-bold text-emerald-950">
                            Existing Customer: {existingCustomer.customer_code} {existingCustomer.full_name ? `(${existingCustomer.full_name})` : ''}
                        </p>
                    </div>
                    <p className="text-xs text-emerald-800 mt-1">
                        Verified account found for this mobile & PAN. Verifying eligibility will link this application directly to their existing customer profile as a Repeat Customer.
                    </p>
                </div>
            )
        )}

        {isReturningUser && (
            <div className="mb-8 p-5 bg-blue-50/50 border border-blue-100/50 rounded-lg animate-in slide-in-from-top-2 duration-500">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-blue-100">
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-blue-900 tracking-tight leading-tight">Welcome back! 🎉</p>
                        <p className="text-[11px] text-blue-700/80 font-medium mt-0.5">Your previous details have been pre-filled. PAN and Name are locked for security.</p>
                    </div>
                </div>
            </div>
        )}

        {error && (
            <Alert variant="destructive" className="mb-8 py-3 rounded-lg border-red-100 bg-red-50/30">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-xs font-bold text-red-800 ml-2">{error}</AlertDescription>
            </Alert>
        )}
        {success && (
            <Alert variant="success" className="mb-8 py-3 rounded-lg bg-green-50/50 border-green-100 text-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-xs font-bold ml-2">{success}</AlertDescription>
            </Alert>
        )}

        <VerificationCorrectionAlert
           status={workflowStatus}
           reasonCode={workflowDetails.reasonCode}
           customerMessage={workflowDetails.customerMessage}
           retryCount={workflowDetails.retryCount}
           maxRetry={workflowDetails.maxRetry}
           onRetry={null} // Retry is handled by form submission
           customActionLabel="Re-verify PAN"
        />

        <div className="space-y-10">
            <PersonalInfoSection
              formData={formData}
              handleInputChange={handleInputChange}
              fieldErrors={fieldErrors}
              isEmailVerified={isEmailVerified}
              isAdminMode={isAdminMode}
              isMobileVerified={isMobileVerified}
              onVerifyEmail={handleOpenEmailVerify}
              onVerifyMobile={
                AUTH_SMS_OTP_ENABLED ? () => setIsMobileVerifyModalOpen(true) : undefined
              }
              smsOtpEnabled={AUTH_SMS_OTP_ENABLED}
              emailCheckLoading={emailCheckLoading}
              emailVerifyOpening={emailVerifyOpening}
              onEmailBlur={handleEmailBlur}
              isReturningUser={isReturningUser}
              workflowStatus={workflowStatus}
              workflowDetails={workflowDetails}
            />

            <EmploymentSection
              formData={formData}
              handleInputChange={handleInputChange}
              fieldErrors={fieldErrors}
            />

            <LocationSection
              formData={formData}
              handlePincodeChange={handlePincodeChange}
              handleInputChange={handleInputChange}
              fieldErrors={fieldErrors}
              pincodeLoading={pincodeLoading}
            />
        </div>

      <PersonalEmailVerificationDialog
          isOpen={isVerifyModalOpen}
          onClose={() => {
            setIsVerifyModalOpen(false);
            setEmailVerifyOpening(false);
          }}
          email={formData.personalEmail}
          targetUserId={isAdminMode && targetUserId ? targetUserId : null}
          onSuccess={() => {
            setIsEmailVerified(true);
            setFieldErrors((prev) => {
              const msg = String(prev.personalEmail || '');
              if (msg === EMAIL_TAKEN_MSG || msg.toLowerCase().includes('verify your email')) {
                const next = { ...prev };
                delete next.personalEmail;
                return next;
              }
              return prev;
            });
          }}
      />

      <MobileVerificationDialog
        isOpen={AUTH_SMS_OTP_ENABLED && isMobileVerifyModalOpen}
        onClose={() => setIsMobileVerifyModalOpen(false)}
        initialMobile={formData.mobile || loginMobile}
        onSuccess={async () => {
          try {
            const response = await authAPI.getCurrentUser();
            if (response.status === 1) {
              const verifiedMobile = response.data?.user?.mobile || formData.mobile;
              setFormData((prev) => ({ ...prev, mobile: verifiedMobile || prev.mobile }));
              setLoginMobile(verifiedMobile || loginMobile);
              setIsMobileVerified(true);
              setFieldErrors((prev) => {
                if (!prev.mobile) return prev;
                const next = { ...prev };
                delete next.mobile;
                return next;
              });
            }
          } catch {
            setIsMobileVerified(true);
          }
        }}
      />
    </StepLayout>
  );
}
